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
  // Source: platform.openai.com/docs/models
  // Using stable model IDs that actually exist
  openai: [
    { id: "gpt-4o", name: "GPT-4o", provider: "openai", supportsVision: true, supportsTools: true },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", supportsVision: true, supportsTools: true },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai", supportsVision: true, supportsTools: true },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai", supportsTools: true },
  ],
  // Source: docs.anthropic.com/en/about-claude/models/overview
  anthropic: [
    { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet", provider: "anthropic", supportsVision: true, supportsTools: true },
    { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku", provider: "anthropic", supportsVision: true, supportsTools: true },
    { id: "claude-3-opus-latest", name: "Claude 3 Opus", provider: "anthropic", supportsVision: true, supportsTools: true },
    { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet", provider: "anthropic", supportsVision: true, supportsTools: true },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "anthropic", supportsVision: true, supportsTools: true },
  ],
  // Source: ai.google.dev/gemini-api/docs/models
  // Model IDs WITHOUT "models/" prefix — @ai-sdk/google adds it automatically
  google: [
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", supportsVision: true, supportsTools: true },
    { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", provider: "google", supportsVision: true, supportsTools: true },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google", supportsVision: true, supportsTools: true },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "google", supportsVision: true, supportsTools: true },
    { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B", provider: "google", supportsVision: true, supportsTools: true },
  ],
  // Source: console.groq.com/docs/models
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "groq", supportsTools: true },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", provider: "groq", supportsTools: true },
    { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B", provider: "groq", supportsTools: true },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", provider: "groq", supportsTools: true },
    { id: "gemma2-9b-it", name: "Gemma 2 9B", provider: "groq", supportsTools: true },
  ],
  // Source: x.ai/api
  xai: [
    { id: "grok-2-1212", name: "Grok 2", provider: "xai", supportsTools: true },
    { id: "grok-2-vision-1212", name: "Grok 2 Vision", provider: "xai", supportsVision: true, supportsTools: true },
    { id: "grok-beta", name: "Grok Beta", provider: "xai", supportsTools: true },
  ],
  // Source: docs.mistral.ai/models/overview
  mistral: [
    { id: "mistral-large-latest", name: "Mistral Large", provider: "mistral", supportsTools: true },
    { id: "mistral-small-latest", name: "Mistral Small", provider: "mistral", supportsTools: true },
    { id: "codestral-latest", name: "Codestral", provider: "mistral", supportsTools: true },
    { id: "open-mistral-nemo", name: "Mistral Nemo", provider: "mistral", supportsTools: true },
  ],
}

// ---------- Live model discovery ----------
// Each provider has its own /models endpoint shape. We normalise to ModelInfo[].

// Patterns for non-chat models that must be filtered out — embeddings, image
// generation, speech, moderation, etc. These never work with streamText/tool
// calling and pollute the picker.
const NON_CHAT_PATTERNS = /(?:^|[-/])(?:embed(?:ding)?s?|whisper|tts|dall-?e|davinci|babbage|ada|moderation|guard|reranker|voxtral|gpt-image|grok-.*-image|image-\d|audio-\d|realtime|search|computer-use)(?:[-/]|$)/i

function isChatModel(id: string): boolean {
  return !NON_CHAT_PATTERNS.test(id)
}

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
        const ids = (json.data ?? []).map((m) => m.id).filter(isChatModel).sort()
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
            // Exclude tuned / embedding / vision-only / preview models that won't work as chat
            !/embedding|retrieval|aqa|gecko|imagen|tts|audio|veo|learnlm/i.test(m.name),
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
        const ids = (json.data ?? []).map((m) => m.id).filter(isChatModel).sort()
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
