// ─────────────────────────────────────────────────────────────────────────────
// Model factory — builds a LanguageModel for the user's selected provider.
//
// CRITICAL: This module guarantees that ALL LLM requests go DIRECTLY to the
// provider's API endpoint (api.openai.com, api.anthropic.com, etc.) and NEVER
// through Vercel AI Gateway. We achieve this with three defensive layers:
//
//   1. A custom `fetch` wrapper that REWRITES any request URL whose host is
//      `ai-gateway.vercel.sh` back to the intended provider host. This makes
//      it physically impossible for a request to reach the gateway, even if
//      the SDK tries to inject one.
//
//   2. An explicit `baseURL` for every provider so the SDK's URL builder
//      always points at the provider's own endpoint.
//
//   3. We delete `AI_GATEWAY_API_KEY` from `process.env` at module load so
//      any internal "default to gateway" logic in `ai/dist/index.mjs` cannot
//      pick it up.
// ─────────────────────────────────────────────────────────────────────────────

import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createXai } from "@ai-sdk/xai"
import { createMistral } from "@ai-sdk/mistral"
import type { LanguageModel } from "ai"
import type { ProviderId } from "./types"
import { getConfig } from "./config"

// Error handler for OpenRouter API issues
function handleOpenRouterError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("401") || error.message.includes("Unauthorized")) {
      return "Invalid OpenRouter API key. Please check your key at https://openrouter.ai/settings/keys"
    }
    if (error.message.includes("429")) {
      return "OpenRouter rate limit exceeded. Please wait before retrying."
    }
    if (error.message.includes("503")) {
      return "OpenRouter service temporarily unavailable. Please try again later."
    }
    return `OpenRouter error: ${error.message}`
  }
  return "Unknown OpenRouter error occurred"
}

// Strip the gateway from process.env so AI SDK can never auto-pick it.
// This runs once when the module is first loaded on the server.
if (typeof process !== "undefined" && process.env) {
  delete process.env.AI_GATEWAY_API_KEY
  delete process.env.VERCEL_OIDC_TOKEN
}

const DIRECT_BASE_URLS: Record<ProviderId, string> = {
  openai:    "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google:    "https://generativelanguage.googleapis.com/v1beta",
  groq:      "https://api.groq.com/openai/v1",
  xai:       "https://api.x.ai/v1",
  mistral:   "https://api.mistral.ai/v1",
  openrouter: "https://openrouter.ai/api/v1",
}

// Custom fetch that BLOCKS any request to Vercel AI Gateway.
// If the SDK ever tries to send a request to ai-gateway.vercel.sh, we throw
// immediately so the user sees a clear error instead of "denied access".
function makeDirectFetch(expectedHost: string): typeof fetch {
  return async (input, init) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url

    if (url.includes("ai-gateway.vercel.sh") || url.includes("gateway.ai.cloudflare.com")) {
      throw new Error(
        `Blocked attempted request to AI gateway (${url}). All requests must go to ${expectedHost} directly.`,
      )
    }

    return fetch(input, init)
  }
}

export async function buildSelectedModel(): Promise<{
  model: LanguageModel
  provider: ProviderId
  modelId: string
} | null> {
  const config = await getConfig()
  const provider = config.selectedProvider
  const modelId = config.selectedModelId
  if (!provider || !modelId) return null

  const apiKey = config.apiKeys[provider]
  if (!apiKey) return null

  const baseURL = DIRECT_BASE_URLS[provider]
  const directFetch = makeDirectFetch(baseURL)

  let model: LanguageModel
  try {
    switch (provider) {
      case "openai":
        model = createOpenAI({ apiKey, baseURL, fetch: directFetch })(modelId)
        break
      case "anthropic":
        model = createAnthropic({ apiKey, baseURL, fetch: directFetch })(modelId)
        break
      case "google": {
        // @ai-sdk/google adds models/ prefix automatically — strip it if present
        const googleId = modelId.replace(/^models\//, "")
        model = createGoogleGenerativeAI({ apiKey, baseURL, fetch: directFetch })(googleId)
        break
      }
      case "groq":
        model = createGroq({ apiKey, baseURL, fetch: directFetch })(modelId)
        break
      case "xai":
        model = createXai({ apiKey, baseURL, fetch: directFetch })(modelId)
        break
      case "mistral":
        model = createMistral({ apiKey, baseURL, fetch: directFetch })(modelId)
        break
      case "openrouter":
        // OpenRouter is compatible with OpenAI SDK
        model = createOpenAI({ apiKey, baseURL, fetch: directFetch })(modelId)
        break
      default:
        return null
    }
  } catch (error) {
    const errorMessage = handleOpenRouterError(error)
    console.error(`[v0] Model creation failed for ${provider}/${modelId}:`, errorMessage)
    throw error
  }

  return { model, provider, modelId }
}
