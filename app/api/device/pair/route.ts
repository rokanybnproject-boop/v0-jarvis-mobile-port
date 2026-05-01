import { redis, KEYS } from "@/lib/redis"
import type { Device } from "@/lib/types"
import { nanoid } from "nanoid"
import { createHash } from "node:crypto"

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex")
}

// Called by the user (from Settings) to mint a new device + pair key.
// Returns { deviceId, pairKey } that the user pastes into the Termux script.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string }
  const id = `dev_${nanoid(8)}`
  const pairKey = nanoid(32)

  const device: Device = {
    id,
    name: body.name?.trim() || "My Phone",
    pairKey: hashKey(pairKey),
    createdAt: Date.now(),
    status: "unknown",
  }
  await redis.set(KEYS.device(id), device)
  await redis.sadd(KEYS.devices(), id)

  return Response.json({
    deviceId: id,
    pairKey, // raw key returned ONCE — user must save it now
    name: device.name,
  })
}

export async function GET() {
  const ids = ((await redis.smembers(KEYS.devices())) as string[]) || []
  const devices = await Promise.all(
    ids.map(async (id) => {
      const d = await redis.get<Device>(KEYS.device(id))
      const lastSeen = (await redis.get<number>(KEYS.deviceLastSeen(id))) || 0
      const status = lastSeen && Date.now() - lastSeen < 60_000 ? "online" : lastSeen ? "offline" : "unknown"
      return d ? { ...d, lastSeen, status, pairKey: undefined } : null
    }),
  )
  return Response.json({ devices: devices.filter(Boolean) })
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return Response.json({ error: "missing id" }, { status: 400 })
  await redis.del(KEYS.device(id))
  await redis.del(KEYS.deviceLastSeen(id))
  await redis.del(KEYS.commandQueue(id))
  await redis.srem(KEYS.devices(), id)
  return Response.json({ ok: true })
}
