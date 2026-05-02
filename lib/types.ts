export type ProviderId = "openai" | "anthropic" | "google" | "groq" | "xai" | "mistral"

export interface ProviderConfig {
  id: ProviderId
  name: string
  description: string
  // URL where the user can obtain an API key
  apiKeyUrl: string
  // Test endpoint shape: how we discover models
  modelsEndpoint?: string
}

export interface ModelInfo {
  id: string
  name: string
  provider: ProviderId
  contextWindow?: number
  supportsVision?: boolean
  supportsTools?: boolean
  description?: string
}

// Fish Audio voice configuration
export interface VoiceConfig {
  enabled: boolean
  apiKey?: string
  voiceId?: string       // reference_id for Fish Audio
  voiceName?: string     // human-readable name for display
  speed?: number         // 0.5 - 2.0, default 1.0
  model?: "s1" | "s2-pro" // TTS model, default s2-pro
}

export interface JarvisConfig {
  selectedProvider?: ProviderId
  selectedModelId?: string
  // Map of provider -> apiKey (stored encrypted at rest in Redis)
  apiKeys: Partial<Record<ProviderId, string>>
  // System personality + permissions
  systemPrompt?: string
  fullTrustMode: boolean
  // Voice synthesis via Fish Audio
  voice?: VoiceConfig
}

export type DeviceStatus = "online" | "offline" | "unknown"

export interface Device {
  id: string
  name: string
  pairKey: string // shared secret, stored hashed
  createdAt: number
  lastSeen?: number
  platform?: string
  status?: DeviceStatus
}

// Commands the brain can dispatch to a Termux arm
export type CommandKind =
  // Shell access
  | "shell.exec"
  | "shell.python"
  // Telephony
  | "sms.send"
  | "sms.list"
  | "call.dial"
  | "contacts.list"
  // Sensors & device
  | "location.get"
  | "battery.status"
  | "wifi.info"
  | "sensor.read"
  // Media
  | "camera.photo"
  | "torch.toggle"
  | "tts.speak"
  | "vibrate"
  | "notification.show"
  // System control
  | "clipboard.get"
  | "clipboard.set"
  | "volume.set"
  | "brightness.set"
  // Files
  | "file.read"
  | "file.write"
  | "file.list"

export interface PendingCommand {
  id: string
  deviceId: string
  kind: CommandKind
  args: Record<string, unknown>
  createdAt: number
  // Optional human-friendly description from the LLM for the log
  intent?: string
}

export interface CommandResult {
  id: string
  ok: boolean
  stdout?: string
  stderr?: string
  data?: unknown
  durationMs?: number
  finishedAt: number
}

export interface ExecutionLogEntry {
  cmdId: string
  deviceId: string
  kind: CommandKind
  intent?: string
  args: Record<string, unknown>
  result?: CommandResult
  createdAt: number
}
