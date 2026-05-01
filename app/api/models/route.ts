import { getConfig } from "@/lib/config"
import { discoverModels, FALLBACK_MODELS, PROVIDERS } from "@/lib/providers"
import type { ProviderId } from "@/lib/types"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const provider = url.searchParams.get("provider") as ProviderId | null

  const config = await getConfig()

  if (provider) {
    if (!PROVIDERS[provider]) return Response.json({ error: "Unknown provider" }, { status: 400 })
    const apiKey = config.apiKeys[provider]
    const models = apiKey ? await discoverModels(provider, apiKey) : FALLBACK_MODELS[provider]
    return Response.json({ provider, models, live: Boolean(apiKey) })
  }

  // Return all providers with their models — only fetch live for those that
  // have a key. Run in parallel for snappiness.
  const entries = await Promise.all(
    (Object.keys(PROVIDERS) as ProviderId[]).map(async (p) => {
      const apiKey = config.apiKeys[p]
      const models = apiKey ? await discoverModels(p, apiKey) : FALLBACK_MODELS[p]
      return [p, { models, live: Boolean(apiKey) }] as const
    }),
  )
  const byProvider = Object.fromEntries(entries)
  return Response.json({ providers: PROVIDERS, byProvider })
}
