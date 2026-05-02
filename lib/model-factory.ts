import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createXai } from "@ai-sdk/xai"
import { createMistral } from "@ai-sdk/mistral"
import type { LanguageModel } from "ai"
import type { ProviderId } from "./types"
import { getConfig } from "./config"

// Direct API base URLs — always talk to the provider's own endpoint,
// never through Vercel AI Gateway. This is critical: without explicit
// baseURL, the AI SDK providers will pick up any AI_GATEWAY_* env vars
// injected by Vercel and route through the gateway, which denies access
// unless the project has a paid gateway subscription.
const DIRECT_BASE_URLS: Record<ProviderId, string> = {
  openai:    "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google:    "https://generativelanguage.googleapis.com/v1beta",
  groq:      "https://api.groq.com/openai/v1",
  xai:       "https://api.x.ai/v1",
  mistral:   "https://api.mistral.ai/v1",
}

// Build a LanguageModel from the user's stored API key for the selected
// provider/model. Always uses direct provider APIs — never Vercel Gateway.
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

  let model: LanguageModel
  switch (provider) {
    case "openai":
      model = createOpenAI({
        apiKey,
        baseURL: DIRECT_BASE_URLS.openai,
        compatibility: "strict",
      })(modelId)
      break
    case "anthropic":
      model = createAnthropic({
        apiKey,
        baseURL: DIRECT_BASE_URLS.anthropic,
      })(modelId)
      break
    case "google":
      model = createGoogleGenerativeAI({
        apiKey,
        baseURL: DIRECT_BASE_URLS.google,
      })(modelId)
      break
    case "groq":
      model = createGroq({
        apiKey,
        baseURL: DIRECT_BASE_URLS.groq,
      })(modelId)
      break
    case "xai":
      model = createXai({
        apiKey,
        baseURL: DIRECT_BASE_URLS.xai,
      })(modelId)
      break
    case "mistral":
      model = createMistral({
        apiKey,
        baseURL: DIRECT_BASE_URLS.mistral,
      })(modelId)
      break
    default:
      return null
  }

  return { model, provider, modelId }
}
