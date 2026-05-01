import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createXai } from "@ai-sdk/xai"
import { createMistral } from "@ai-sdk/mistral"
import type { LanguageModel } from "ai"
import type { ProviderId } from "./types"
import { getConfig } from "./config"

// Build a LanguageModel from the user's stored API key for the selected
// provider/model. This lets the user bring their own key for any supported
// provider — we never proxy through a Vercel-managed gateway.
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
      model = createOpenAI({ apiKey })(modelId)
      break
    case "anthropic":
      model = createAnthropic({ apiKey })(modelId)
      break
    case "google":
      model = createGoogleGenerativeAI({ apiKey })(modelId)
      break
    case "groq":
      model = createGroq({ apiKey })(modelId)
      break
    case "xai":
      model = createXai({ apiKey })(modelId)
      break
    case "mistral":
      model = createMistral({ apiKey })(modelId)
      break
    default:
      return null
  }

  return { model, provider, modelId }
}
