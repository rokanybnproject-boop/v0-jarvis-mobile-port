import { getConfig, saveConfig, deleteApiKey } from "@/lib/config"
import { maskKey } from "@/lib/crypto"
import type { JarvisConfig, ProviderId } from "@/lib/types"

export async function GET() {
  const config = await getConfig()
  // Never return raw API keys to the client. Mask them.
  const maskedKeys: Partial<Record<ProviderId, string>> = {}
  for (const [k, v] of Object.entries(config.apiKeys)) {
    if (v) maskedKeys[k as ProviderId] = maskKey(v)
  }
  // Also mask the Fish Audio voice apiKey — it must never reach the client
  // in plaintext. The client only needs to know "is a key set?" which the
  // masked string conveys.
  const voice = config.voice
    ? { ...config.voice, apiKey: config.voice.apiKey ? maskKey(config.voice.apiKey) : undefined }
    : undefined
  return Response.json({ ...config, apiKeys: maskedKeys, voice })
}

export async function POST(req: Request) {
  try {
    const patch = (await req.json()) as Partial<JarvisConfig> & { deleteKey?: ProviderId }
    if (patch.deleteKey) {
      const updated = await deleteApiKey(patch.deleteKey)
      const maskedKeys: Partial<Record<ProviderId, string>> = {}
      for (const [k, v] of Object.entries(updated.apiKeys)) {
        if (v) maskedKeys[k as ProviderId] = maskKey(v)
      }
      return Response.json({ ...updated, apiKeys: maskedKeys })
    }
    const updated = await saveConfig(patch)
    const maskedKeys: Partial<Record<ProviderId, string>> = {}
    for (const [k, v] of Object.entries(updated.apiKeys)) {
      if (v) maskedKeys[k as ProviderId] = maskKey(v)
    }
    return Response.json({ ...updated, apiKeys: maskedKeys })
  } catch (error) {
    console.error("[v0] Config save error:", error)
    const message = error instanceof Error ? error.message : "Failed to save configuration"
    return Response.json(
      { error: message },
      { status: 500 }
    )
  }
}
