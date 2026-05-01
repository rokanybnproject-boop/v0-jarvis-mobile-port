import { redis, KEYS } from "@/lib/redis"
import type { Device } from "@/lib/types"
import { createHash } from "node:crypto"

export const maxDuration = 30

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex")
}

async function authenticate(deviceId: string, pairKey: string): Promise<Device | null> {
  if (!deviceId || !pairKey) return null
  const device = await redis.get<Device>(KEYS.device(deviceId))
  if (!device) return null
  if (device.pairKey !== hashKey(pairKey)) return null
  return device
}

// Long-poll: the Termux arm calls this in a loop. We try to atomically pop a
// pending command from the device's queue; if there isn't one, we wait up to
// ~25s for one to arrive (well under Vercel's 30s function ceiling).
export async function GET(req: Request) {
  const url = new URL(req.url)
  const deviceId = url.searchParams.get("deviceId") || ""
  const pairKey = url.searchParams.get("pairKey") || ""
  const platform = url.searchParams.get("platform") || undefined

  const device = await authenticate(deviceId, pairKey)
  if (!device) return Response.json({ error: "unauthorized" }, { status: 401 })

  // Heartbeat
  await redis.set(KEYS.deviceLastSeen(deviceId), Date.now())
  if (platform && device.platform !== platform) {
    await redis.set(KEYS.device(deviceId), { ...device, platform })
  }

  const deadline = Date.now() + 25_000
  while (Date.now() < deadline) {
    const raw = (await redis.lpop(KEYS.commandQueue(deviceId))) as string | null
    if (raw) {
      const cmd = typeof raw === "string" ? JSON.parse(raw) : raw
      return Response.json({ command: cmd })
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  // No command — return empty so Termux keeps the loop tight.
  return Response.json({ command: null })
}
