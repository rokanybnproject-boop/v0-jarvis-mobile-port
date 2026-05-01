import { redis, KEYS } from "@/lib/redis"
import type { CommandResult, Device } from "@/lib/types"
import { createHash } from "node:crypto"

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex")
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    deviceId: string
    pairKey: string
    cmdId: string
    result: Omit<CommandResult, "id" | "finishedAt"> & { finishedAt?: number }
  }
  const device = await redis.get<Device>(KEYS.device(body.deviceId))
  if (!device || device.pairKey !== hashKey(body.pairKey)) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  await redis.set(KEYS.deviceLastSeen(body.deviceId), Date.now())

  const result: CommandResult = {
    id: body.cmdId,
    ok: body.result.ok,
    stdout: body.result.stdout,
    stderr: body.result.stderr,
    data: body.result.data,
    durationMs: body.result.durationMs,
    finishedAt: body.result.finishedAt ?? Date.now(),
  }

  // Stash the result for the brain's polling loop to pick up.
  await redis.set(KEYS.commandResult(body.cmdId), result, { ex: 60 })
  return Response.json({ ok: true })
}
