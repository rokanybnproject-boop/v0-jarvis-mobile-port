import { discoverModels } from "@/lib/providers"
import { detectProviderFromKey } from "@/lib/providers"
import type { ProviderId } from "@/lib/types"

// Detect provider from a raw API key and return the live model list. Used
// when the user pastes a key — we identify the provider automatically.
export async function POST(req: Request) {
  const { apiKey, provider: forcedProvider } = (await req.json()) as {
    apiKey: string
    provider?: ProviderId
  }
  if (!apiKey) return Response.json({ error: "Missing apiKey" }, { status: 400 })

  const provider = forcedProvider || detectProviderFromKey(apiKey)
  if (!provider) {
    return Response.json(
      { error: "Could not auto-detect provider. Please pick one manually." },
      { status: 400 },
    )
  }

  const models = await discoverModels(provider, apiKey)
  return Response.json({ provider, models, ok: models.length > 0 })
}
