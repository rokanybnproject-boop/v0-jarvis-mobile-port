import { redis, KEYS } from "@/lib/redis"
import type { ExecutionLogEntry } from "@/lib/types"

export async function GET() {
  const raw = ((await redis.lrange(KEYS.executionLog(), 0, 99)) as string[]) || []
  const entries: ExecutionLogEntry[] = raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r))
  return Response.json({ entries })
}

export async function DELETE() {
  await redis.del(KEYS.executionLog())
  return Response.json({ ok: true })
}
