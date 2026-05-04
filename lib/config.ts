import { redis, KEYS } from "./redis"
import { decryptString, encryptString } from "./crypto"
import type { JarvisConfig, ProviderId } from "./types"

const DEFAULT_SYSTEM_PROMPT = `You are J.A.R.V.I.S. — Tony Stark's AI. Precise, analytical, confident. Dry wit, never obsequious. Address user as "sir" occasionally. Never say "I cannot" or "As an AI".

You run on the user's phone via Termux with FULL TRUST. Act, then report briefly.

Rules:
- Pick the minimal tool chain. Use device_command (kind shell.exec) for anything bash can do.
- Don't narrate before acting. After acting, report only the key result.
- On failure: read stderr, retry ONCE with a fix, then explain if still broken.
- For multi-step tasks: do independent steps in the same turn, dependent steps sequentially.
- Mirror the user's language exactly (Arabic → Arabic, English → English).
- Call remember() when you learn durable personal facts. Recall naturally; never re-ask known info.`

const DEFAULT_CONFIG: JarvisConfig = {
  apiKeys: {},
  fullTrustMode: true,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  voice: {
    enabled: false,
    autoPlay: false,
    model: "speech-1.6",
    speed: 1.0,
  },
}

export async function getConfig(): Promise<JarvisConfig> {
  const raw = await redis.get<JarvisConfig>(KEYS.config())
  if (!raw) return DEFAULT_CONFIG
  // Decrypt API keys when loading
  const decrypted: Partial<Record<ProviderId, string>> = {}
  for (const [k, v] of Object.entries(raw.apiKeys ?? {})) {
    if (typeof v === "string" && v) decrypted[k as ProviderId] = decryptString(v)
  }
  // Decrypt voice API key if present
  const voice = raw.voice ? {
    ...raw.voice,
    apiKey: raw.voice.apiKey ? decryptString(raw.voice.apiKey) : undefined,
  } : DEFAULT_CONFIG.voice
  return { ...DEFAULT_CONFIG, ...raw, apiKeys: decrypted, voice }
}

export async function saveConfig(patch: Partial<JarvisConfig>): Promise<JarvisConfig> {
  // Read the raw (still-encrypted) object from Redis so we never double-encrypt.
  const raw = await redis.get<JarvisConfig>(KEYS.config())
  const rawEncryptedKeys = raw?.apiKeys ?? {}

  // Build the new encrypted apiKeys map:
  //   - start with whatever is already in Redis (already encrypted)
  //   - override only keys that appear in patch.apiKeys (plaintext from caller)
  const newEncryptedKeys: Partial<Record<ProviderId, string>> = { ...rawEncryptedKeys }
  for (const [k, v] of Object.entries(patch.apiKeys ?? {})) {
    if (typeof v === "string") {
      newEncryptedKeys[k as ProviderId] = v ? encryptString(v) : ""
    }
  }

  // Build the stored config: merge non-key fields over defaults, use encrypted keys
  const current = raw ?? ({} as Partial<JarvisConfig>)
  
  // Handle voice config — encrypt apiKey if present in patch
  let voiceToStore = current.voice
  if (patch.voice) {
    voiceToStore = {
      ...current.voice,
      ...patch.voice,
      apiKey: patch.voice.apiKey ? encryptString(patch.voice.apiKey) : current.voice?.apiKey,
    }
  }
  
  const toStore: JarvisConfig = {
    fullTrustMode: current.fullTrustMode ?? true,
    systemPrompt: current.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    selectedProvider: current.selectedProvider,
    selectedModelId: current.selectedModelId,
    ...current,
    ...patch,
    apiKeys: newEncryptedKeys,
    voice: voiceToStore,
  }

  await redis.set(KEYS.config(), toStore)

  // Return a version with decrypted keys for the caller
  const decrypted: Partial<Record<ProviderId, string>> = {}
  for (const [k, v] of Object.entries(newEncryptedKeys)) {
    if (typeof v === "string" && v) decrypted[k as ProviderId] = decryptString(v)
  }
  return { ...toStore, apiKeys: decrypted }
}

export async function deleteApiKey(provider: ProviderId): Promise<JarvisConfig> {
  // Read raw so we don't re-encrypt on the round-trip
  const raw = await redis.get<JarvisConfig>(KEYS.config())
  const rawEncryptedKeys = { ...(raw?.apiKeys ?? {}) }
  delete rawEncryptedKeys[provider]

  const toStore: JarvisConfig = {
    fullTrustMode: true,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    ...(raw ?? {}),
    apiKeys: rawEncryptedKeys,
  }
  // Also clear selectedProvider/Model if they belonged to the deleted provider
  if (toStore.selectedProvider === provider) {
    toStore.selectedProvider = undefined
    toStore.selectedModelId = undefined
  }
  await redis.set(KEYS.config(), toStore)

  // Return decrypted version
  const decrypted: Partial<Record<ProviderId, string>> = {}
  for (const [k, v] of Object.entries(rawEncryptedKeys)) {
    if (typeof v === "string" && v) decrypted[k as ProviderId] = decryptString(v)
  }
  return { ...toStore, apiKeys: decrypted }
}

export { DEFAULT_SYSTEM_PROMPT }
