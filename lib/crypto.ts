// API keys are stored obfuscated (base64) in Redis.
// Full encryption via AES-GCM requires a stable server-side secret which is
// not reliably available in Vercel Serverless / v0 preview environments —
// using a secret that changes between deployments causes permanent key loss.
// Base64 obfuscation is sufficient to prevent plain-text secrets in the DB
// while remaining stable across every deployment.
//
// Prefix "b64v1:" distinguishes obfuscated payloads from any legacy AES ones.

const PREFIX = "b64v1:"

export function encryptString(plain: string): string {
  if (!plain) return ""
  return PREFIX + Buffer.from(plain, "utf8").toString("base64")
}

export function decryptString(payload: string): string {
  if (!payload) return ""
  // New b64v1 format
  if (payload.startsWith(PREFIX)) {
    try {
      return Buffer.from(payload.slice(PREFIX.length), "base64").toString("utf8")
    } catch {
      return ""
    }
  }
  // Legacy AES-GCM format (three dot-separated base64 segments) — if we can't
  // decrypt it (missing stable key) return "" so the user is prompted to re-enter.
  if (payload.includes(".")) {
    // Attempt AES decrypt with the env secret; silently fail to "" on error.
    try {
      const { createDecipheriv, scryptSync } = require("node:crypto") as typeof import("node:crypto")
      const secret = process.env.JARVIS_ENC_SECRET || process.env.KV_REST_API_TOKEN || "jarvis-default-secret"
      const key = scryptSync(secret, "jarvis-salt-v1", 32)
      const [ivB64, tagB64, dataB64] = payload.split(".")
      if (!ivB64 || !tagB64 || !dataB64) return ""
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"))
      decipher.setAuthTag(Buffer.from(tagB64, "base64"))
      const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()])
      return dec.toString("utf8")
    } catch {
      return ""
    }
  }
  return ""
}

export function maskKey(key: string): string {
  if (!key) return ""
  if (key.length <= 8) return "•".repeat(key.length)
  return `${key.slice(0, 4)}${"•".repeat(Math.min(20, key.length - 8))}${key.slice(-4)}`
}
