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
  // Source: platform.openai.com/docs/models — May 2, 2026
  // Latest: GPT-5.5 (flagship), GPT-5.4 mini/nano (efficient), GPT Image 2, GPT Realtime
  openai: [
    { id: "gpt-5.5", name: "GPT-5.5", provider: "openai", supportsVision: true, supportsTools: true },
    { id: "gpt-5.5-pro", name: "GPT-5.5 Pro", provider: "openai", supportsVision: true, supportsTools: true },
    { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", provider: "openai", supportsVision: true, supportsTools: true },
    { id: "gpt-5.4-nano", name: "GPT-5.4 Nano", provider: "openai", supportsVision: true, supportsTools: true },
    { id: "gpt-5.3-instinct", name: "GPT-5.3 Instinct", provider: "openai", supportsVision: true, supportsTools: true },
    { id: "gpt-4o", name: "GPT-4o", provider: "openai", supportsVision: true, supportsTools: true },
  ],
  // Source: docs.anthropic.com/en/about-claude/models/overview — May 2, 2026
  // Latest: Claude Opus 4.7 (best capability), Claude Sonnet 4.6 (balanced), Claude Haiku 4.5 (fastest)
  anthropic: [
    { id: "claude-opus-4-7", name: "Claude Opus 4.7", provider: "anthropic", supportsVision: true, supportsTools: true },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "anthropic", supportsVision: true, supportsTools: true },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic", supportsVision: true, supportsTools: true },
    { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "anthropic", supportsVision: true, supportsTools: true },
    { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", provider: "anthropic", supportsVision: true, supportsTools: true },
  ],
  // Source: ai.google.dev/gemini-api/docs/models — May 2, 2026
  // Latest: Gemini 3.1 Pro (best), Gemini 3 Flash (frontier), Gemini 2.5 Flash (deprecated soon)
  // WARNING: Gemini 3 Pro Preview was SHUT DOWN March 9, 2026
  google: [
    { id: "gemini-3-1-pro", name: "Gemini 3.1 Pro", provider: "google", supportsVision: true, supportsTools: true },
    { id: "gemini-3-flash", name: "Gemini 3 Flash", provider: "google", supportsVision: true, supportsTools: true },
    { id: "gemini-3-1-flash-lite", name: "Gemini 3.1 Flash Lite", provider: "google", supportsVision: true, supportsTools: true },
    { id: "gemini-2-5-pro", name: "Gemini 2.5 Pro", provider: "google", supportsVision: true, supportsTools: true },
    { id: "gemini-2-5-flash", name: "Gemini 2.5 Flash", provider: "google", supportsVision: true, supportsTools: true },
  ],
  // Source: console.groq.com/docs/models — May 2, 2026
  // Latest: Llama 3.3 70B, Llama 4 Scout 17B, Qwen3 32B, GPT OSS 120B/20B
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "groq", supportsTools: true },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", provider: "groq", supportsTools: true },
    { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout 17B", provider: "groq", supportsTools: true },
    { id: "qwen/qwen3-32b", name: "Qwen3 32B", provider: "groq", supportsTools: true },
    { id: "openai/gpt-oss-120b", name: "GPT OSS 120B", provider: "groq", supportsTools: true },
    { id: "openai/gpt-oss-20b", name: "GPT OSS 20B", provider: "groq", supportsTools: true },
  ],
  // Source: x.ai/api — May 2, 2026
  // Latest: Grok 4.3 (flagship), Grok 4.1 Fast, Grok 3 (legacy but still available)
  xai: [
    { id: "grok-4.3", name: "Grok 4.3", provider: "xai", supportsTools: true },
    { id: "grok-4.1-fast", name: "Grok 4.1 Fast", provider: "xai", supportsTools: true },
    { id: "grok-3", name: "Grok 3", provider: "xai", supportsTools: true },
    { id: "grok-3-mini", name: "Grok 3 Mini", provider: "xai", supportsTools: true },
  ],
  // Source: docs.mistral.ai/models/overview — May 2, 2026
  // Latest: Mistral Large 3 (SOTA), Mistral Medium 3.5 (frontier), Mistral Small 4 (efficient)
  mistral: [
    { id: "mistral-large-3", name: "Mistral Large 3", provider: "mistral", supportsTools: true },
    { id: "mistral-medium-3.5", name: "Mistral Medium 3.5", provider: "mistral", supportsTools: true },
    { id: "mistral-small-4", name: "Mistral Small 4", provider: "mistral", supportsTools: true },
    { id: "mistral-nemo-12b", name: "Mistral Nemo 12B", provider: "mistral", supportsTools: true },
    { id: "devstral-2", name: "Devstral 2", provider: "mistral", supportsTools: true },
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
        const items = (json.models ?? []).filter(
          (m) =>
            (m.supportedGenerationMethods ?? []).includes("generateContent") &&
            // Exclude tuned / embedding / vision-only models that won't work as chat
            !/embedding|retrieval|aqa|gecko|imagen/i.test(m.name),
        )
        if (!items.length) return FALLBACK_MODELS.google
        return items.map((m) => {
          // Google returns "models/gemini-2.0-flash" — strip the "models/" prefix
          // so the AI SDK @google-ai/generativelanguage provider gets a bare model id.
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
