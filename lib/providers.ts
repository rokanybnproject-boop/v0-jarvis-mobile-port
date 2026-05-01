import type { ProviderConfig, ProviderId, ModelInfo } from "./types"

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    description: "GPT-5, GPT-4o, o-series",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    modelsEndpoint: "https://api.openai.com/v1/models",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude Opus, Sonnet, Haiku",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    modelsEndpoint: "https://api.anthropic.com/v1/models",
  },
  google: {
    id: "google",
    name: "Google",
    description: "Gemini 3, Gemini 2.5 Pro",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    modelsEndpoint: "https://generativelanguage.googleapis.com/v1beta/models",
  },
  groq: {
    id: "groq",
    name: "Groq",
    description: "Llama, Mixtral on LPU",
    apiKeyUrl: "https://console.groq.com/keys",
    modelsEndpoint: "https://api.groq.com/openai/v1/models",
  },
  xai: {
    id: "xai",
    name: "xAI",
    description: "Grok models",
    apiKeyUrl: "https://console.x.ai/",
    modelsEndpoint: "https://api.x.ai/v1/models",
  },
  mistral: {
    id: "mistral",
    name: "Mistral",
    description: "Mistral Large, Codestral",
    apiKeyUrl: "https://console.mistral.ai/api-keys/",
    modelsEndpoint: "https://api.mistral.ai/v1/models",
  },
}

// Curated fallback model lists used when an API key isn't set yet, OR when
// the live discovery fails. Live discovery (using the user's own key) takes
// priority and fully replaces these.
export const FALLBACK_MODELS: Record<ProviderId, ModelInfo[]> = {
  openai: [
    { id: "gpt-5", name: "GPT-5", provider: "openai", supportsVision: true, supportsTools: true },
    { id: "gpt-5-mini", name: "GPT-5 Mini", provider: "openai", supportsVision: true, supportsTools: true },
    { id: "gpt-4o", name: "GPT-4o", provider: "openai", supportsVision: true, supportsTools: true },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", supportsVision: true, supportsTools: true },
    { id: "o1", name: "o1", provider: "openai", supportsTools: true },
    { id: "o1-mini", name: "o1-mini", provider: "openai" },
  ],
  anthropic: [
    { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "anthropic", supportsVision: true, supportsTools: true },
    { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "anthropic", supportsVision: true, supportsTools: true },
    { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", provider: "anthropic", supportsVision: true, supportsTools: true },
    { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", provider: "anthropic", supportsVision: true, supportsTools: true },
  ],
  google: [
    { id: "gemini-3-pro", name: "Gemini 3 Pro", provider: "google", supportsVision: true, supportsTools: true },
    { id: "gemini-3-flash", name: "Gemini 3 Flash", provider: "google", supportsVision: true, supportsTools: true },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google", supportsVision: true, supportsTools: true },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google", supportsVision: true, supportsTools: true },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "groq", supportsTools: true },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", provider: "groq", supportsTools: true },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", provider: "groq", supportsTools: true },
  ],
  xai: [
    { id: "grok-4", name: "Grok 4", provider: "xai", supportsTools: true },
    { id: "grok-3", name: "Grok 3", provider: "xai", supportsTools: true },
    { id: "grok-2-vision-latest", name: "Grok 2 Vision", provider: "xai", supportsVision: true, supportsTools: true },
  ],
  mistral: [
    { id: "mistral-large-latest", name: "Mistral Large", provider: "mistral", supportsTools: true },
    { id: "mistral-medium-latest", name: "Mistral Medium", provider: "mistral", supportsTools: true },
    { id: "codestral-latest", name: "Codestral", provider: "mistral", supportsTools: true },
  ],
}

// ---------- Live model discovery ----------
// Each provider has its own /models endpoint shape. We normalise to ModelInfo[].

export async function discoverModels(provider: ProviderId, apiKey: string): Promise<ModelInfo[]> {
  if (!apiKey) return FALLBACK_MODELS[provider]
  try {
    switch (provider) {
      case "openai":
      case "groq":
      case "xai": {
        const url = PROVIDERS[provider].modelsEndpoint!
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
          cache: "no-store",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as { data?: Array<{ id: string }> }
        const ids = (json.data ?? []).map((m) => m.id).sort()
        if (!ids.length) return FALLBACK_MODELS[provider]
        return ids.map((id) => ({
          id,
          name: id,
          provider,
          supportsTools: true,
          supportsVision: /vision|gpt-4o|gpt-5|o1|grok-.*-vision/i.test(id),
        }))
      }
      case "anthropic": {
        const res = await fetch(PROVIDERS.anthropic.modelsEndpoint!, {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          cache: "no-store",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as { data?: Array<{ id: string; display_name?: string }> }
        const items = json.data ?? []
        if (!items.length) return FALLBACK_MODELS.anthropic
        return items.map((m) => ({
          id: m.id,
          name: m.display_name || m.id,
          provider: "anthropic" as const,
          supportsTools: true,
          supportsVision: true,
        }))
      }
      case "google": {
        const url = `${PROVIDERS.google.modelsEndpoint!}?key=${encodeURIComponent(apiKey)}`
        const res = await fetch(url, { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as {
          models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }>
        }
        const items = (json.models ?? []).filter((m) =>
          (m.supportedGenerationMethods ?? []).includes("generateContent"),
        )
        if (!items.length) return FALLBACK_MODELS.google
        return items.map((m) => {
          const id = m.name.replace(/^models\//, "")
          return {
            id,
            name: m.displayName || id,
            provider: "google" as const,
            supportsTools: true,
            supportsVision: /vision|gemini-1\.5|gemini-2|gemini-3/i.test(id),
          }
        })
      }
      case "mistral": {
        const res = await fetch(PROVIDERS.mistral.modelsEndpoint!, {
          headers: { Authorization: `Bearer ${apiKey}` },
          cache: "no-store",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as { data?: Array<{ id: string; name?: string }> }
        const ids = (json.data ?? []).map((m) => m.id).sort()
        if (!ids.length) return FALLBACK_MODELS.mistral
        return ids.map((id) => ({
          id,
          name: id,
          provider: "mistral" as const,
          supportsTools: true,
        }))
      }
    }
  } catch (err) {
    console.log("[v0] discoverModels failed for", provider, err)
    return FALLBACK_MODELS[provider]
  }
}

// Detect provider from API key prefix — best-effort.
export function detectProviderFromKey(key: string): ProviderId | null {
  const k = key.trim()
  if (!k) return null
  if (k.startsWith("sk-ant-")) return "anthropic"
  if (k.startsWith("xai-")) return "xai"
  if (k.startsWith("gsk_")) return "groq"
  if (k.startsWith("AIza")) return "google"
  if (/^sk-[a-zA-Z0-9]{20,}/.test(k) && k.length > 40) return "openai"
  if (/^[a-zA-Z0-9]{32}$/.test(k)) return "mistral"
  return null
}
