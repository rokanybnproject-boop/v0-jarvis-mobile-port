import { redis, KEYS } from "@/lib/redis"

export async function GET() {
  const memories = (await redis.hgetall(KEYS.memory())) || {}
  return Response.json({ memories })
}

export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const key = url.searchParams.get("key")
  if (key) await redis.hdel(KEYS.memory(), key)
  else await redis.del(KEYS.memory())
  return Response.json({ ok: true })
}
