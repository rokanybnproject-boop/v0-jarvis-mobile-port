import { redis, KEYS } from "@/lib/redis"
import type { JarvisConfig } from "@/lib/types"

// DELETE /api/config/reset-keys
// Wipes all stored API keys from Redis so the user can re-enter them fresh.
// Called automatically from the settings page when a key appears corrupted.
export async function DELETE() {
  const raw = await redis.get<JarvisConfig>(KEYS.config())
  if (!raw) return Response.json({ ok: true })

  const wiped: JarvisConfig = {
    ...raw,
    apiKeys: {},
    selectedProvider: undefined,
    selectedModelId: undefined,
  }
  await redis.set(KEYS.config(), wiped)
  return Response.json({ ok: true })
}
