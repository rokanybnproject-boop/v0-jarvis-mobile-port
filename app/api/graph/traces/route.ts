import { redis, KEYS } from "@/lib/redis"
import type { GraphTrace } from "@/lib/graph/types"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50)

  const raw = await redis.lrange(KEYS.graphTrace(), 0, limit - 1)
  const traces: GraphTrace[] = raw
    .map((item) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item
      } catch {
        return null
      }
    })
    .filter(Boolean) as GraphTrace[]

  return Response.json({ traces })
}
