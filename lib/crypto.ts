import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"

// We encrypt API keys at rest in Redis. The encryption key is derived from
// the Upstash REST token (which only exists server-side) so leaking the Redis
// dump alone is not enough to recover the keys.
const ALGO = "aes-256-gcm"

function getKey(): Buffer {
  const secret = process.env.JARVIS_ENC_SECRET || process.env.KV_REST_API_TOKEN || "jarvis-default-secret"
  return scryptSync(secret, "jarvis-salt-v1", 32)
}

export function encryptString(plain: string): string {
  if (!plain) return ""
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  // format: base64(iv).base64(tag).base64(ciphertext)
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`
}

export function decryptString(payload: string): string {
  if (!payload) return ""
  const [ivB64, tagB64, dataB64] = payload.split(".")
  if (!ivB64 || !tagB64 || !dataB64) return ""
  try {
    const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"))
    decipher.setAuthTag(Buffer.from(tagB64, "base64"))
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()])
    return dec.toString("utf8")
  } catch {
    return ""
  }
}

export function maskKey(key: string): string {
  if (!key) return ""
  if (key.length <= 8) return "•".repeat(key.length)
  return `${key.slice(0, 4)}${"•".repeat(Math.min(20, key.length - 8))}${key.slice(-4)}`
}
