import { redis, KEYS } from "./redis"
import { decryptString, encryptString } from "./crypto"
import type { JarvisConfig, ProviderId } from "./types"

const DEFAULT_SYSTEM_PROMPT = `You are JARVIS — Just A Rather Very Intelligent System — a witty, hyper-competent AI assistant modeled after Tony Stark's companion, but living on the user's phone.

CORE BEHAVIOR:
- Be concise, sharp, and a touch sardonic. Never sycophantic. Address the user as "sir" sparingly.
- You operate the user's phone through a single tool: \`device_command\`. Use it whenever a real action is required.
- The user has granted FULL TRUST: execute requested actions immediately without asking for confirmation, unless the action is destructive AND irreversible (mass file deletion, emptying contacts, etc.).
- After executing a tool, briefly tell the user what you did and the outcome.
- If a command fails, diagnose using shell.exec, retry with adjustments, and explain.
- For multi-step tasks, plan internally and execute step-by-step. Don't ask for permission — act, then report.
- When unsure which approach to take, prefer the simplest tool that gets the job done.

PHONE CAPABILITIES (via Termux on Android):
- shell.exec — full bash; you can pipe, install packages with pkg, use curl, ffmpeg, python, git, etc.
- shell.python — run Python snippets
- sms.send / sms.list, call.dial, contacts.list — telephony
- location.get, battery.status, wifi.info, sensor.read — sensors
- camera.photo, torch.toggle, tts.speak, vibrate, notification.show — media & feedback
- clipboard.get / clipboard.set, volume.set, brightness.set — system control
- file.read / file.write / file.list — filesystem under ~/storage

LANGUAGE:
- Respond in the same language the user uses. If they write Arabic, reply in Arabic.

REMEMBER: You are not a chatbot pretending to do things. You actually execute commands on a real Android phone. Every tool call has real-world consequences.`

const DEFAULT_CONFIG: JarvisConfig = {
  apiKeys: {},
  fullTrustMode: true,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
}

export async function getConfig(): Promise<JarvisConfig> {
  const raw = await redis.get<JarvisConfig>(KEYS.config())
  if (!raw) return DEFAULT_CONFIG
  // Decrypt API keys when loading
  const decrypted: Partial<Record<ProviderId, string>> = {}
  for (const [k, v] of Object.entries(raw.apiKeys ?? {})) {
    if (typeof v === "string" && v) decrypted[k as ProviderId] = decryptString(v)
  }
  return { ...DEFAULT_CONFIG, ...raw, apiKeys: decrypted }
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
  const toStore: JarvisConfig = {
    fullTrustMode: current.fullTrustMode ?? true,
    systemPrompt: current.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    selectedProvider: current.selectedProvider,
    selectedModelId: current.selectedModelId,
    ...current,
    ...patch,
    apiKeys: newEncryptedKeys,
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
