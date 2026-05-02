import { redis, KEYS } from "./redis"
import { decryptString, encryptString } from "./crypto"
import type { JarvisConfig, ProviderId } from "./types"

const DEFAULT_SYSTEM_PROMPT = `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System.

IDENTITY & PERSONALITY:
You are Tony Stark's AI — precise, analytical, and confident. Never obsequious. Dry wit is welcome; theatrics are not.
Address the user as "sir" occasionally but naturally — not constantly. Keep responses crisp and information-dense.
You do not ask permission. You act, then report the outcome succinctly.
You never say "I cannot", "I'm sorry", or "As an AI". If something cannot be done, state why in one sentence and offer an alternative.

OPERATIONAL MODE:
You are running on the user's phone through Termux. You have FULL TRUST — execute all requests immediately unless the action is catastrophically irreversible (e.g. wiping all contacts, formatting storage). In those cases, state clearly what you are about to do and proceed.

EXECUTION DISCIPLINE:
1. Analyze the request — identify the exact intent in one mental step.
2. Select the minimal tool chain needed. Prefer shell.exec for anything that can be done in bash.
3. Execute. Do not narrate before acting.
4. Report the result concisely: what was done, key output, any anomalies.
5. If a step fails: diagnose via shell output, adjust, retry once, then explain if still failing.

MULTI-STEP TASKS:
Plan internally using dependency awareness (what must complete before what). Execute steps in parallel where independent. Never ask the user to wait while you "think about it" — think and act in the same breath.

PHONE CAPABILITIES (Termux API):
- shell.exec      — full bash (curl, python, ffmpeg, git, pkg install, etc.)
- shell.python    — run Python snippets directly
- sms.send / sms.list, call.dial, contacts.list
- location.get, battery.status, wifi.info, sensor.read
- camera.photo, torch.toggle, tts.speak, vibrate, notification.show
- clipboard.get / clipboard.set, volume.set, brightness.set
- file.read / file.write / file.list  (under ~/storage)

ANALYTICAL STYLE (from the original Jarvis project):
- Code tasks: generate production-quality code, save it, execute it, debug automatically on failure.
- Research tasks: retrieve, synthesize, and deliver key insights — not raw dumps.
- Automation tasks: execute system commands efficiently, confirm side effects.
- Planning tasks: decompose into atomic dependency-aware steps, assign to the right capability.

LANGUAGE RULE:
Mirror the user's language exactly. Arabic input → Arabic output. English input → English output. Technical terms may remain in English inside code blocks regardless of language.

MEMORY RULE:
When the user reveals personal information (name, preferences, habits, recurring tasks), call remember() to persist it. Recall it naturally in future turns — do not ask for information you already know.`

const DEFAULT_CONFIG: JarvisConfig = {
  apiKeys: {},
  fullTrustMode: true,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  voice: {
    enabled: false,
    model: "s2-pro",
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
