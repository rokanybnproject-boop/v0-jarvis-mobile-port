// Fast model selection for the RouterNode — direct provider APIs only,
// never via Vercel AI Gateway. Same defensive layers as model-factory.ts.

import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createXai } from "@ai-sdk/xai"
import { createMistral } from "@ai-sdk/mistral"
import type { LanguageModel } from "ai"
import type { ProviderId } from "@/lib/types"
import { getConfig } from "@/lib/config"

// Custom fetch that blocks any request to AI gateways
const directFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url
  if (url.includes("ai-gateway.vercel.sh") || url.includes("gateway.ai.cloudflare.com")) {
    throw new Error(`Blocked AI gateway request: ${url}`)
  }
  return fetch(input, init)
}

export async function buildFastModel(
  primaryProvider: ProviderId,
): Promise<LanguageModel | null> {
  const config = await getConfig()

  // Prefer Groq — fastest for classification, sub-$1/M tokens, direct API
  const groqKey = config.apiKeys["groq"]
  if (groqKey) {
    return createGroq({
      apiKey: groqKey,
      baseURL: "https://api.groq.com/openai/v1",
      fetch: directFetch,
    })("llama-3.1-8b-instant")
  }

  // Fall back to a fast variant of the primary provider — always direct API
  const apiKey = config.apiKeys[primaryProvider]
  if (!apiKey) return null

  switch (primaryProvider) {
    case "openai":
      return createOpenAI({
        apiKey,
        baseURL: "https://api.openai.com/v1",
        fetch: directFetch,
      })("gpt-4o-mini")
    case "anthropic":
      return createAnthropic({
        apiKey,
        baseURL: "https://api.anthropic.com/v1",
        fetch: directFetch,
      })("claude-3-5-haiku-latest")
    case "google":
      return createGoogleGenerativeAI({
        apiKey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta",
        fetch: directFetch,
      })("gemini-2.0-flash")
    case "xai":
      return createXai({
        apiKey,
        baseURL: "https://api.x.ai/v1",
        fetch: directFetch,
      })("grok-2-1212")
    case "mistral":
      return createMistral({
        apiKey,
        baseURL: "https://api.mistral.ai/v1",
        fetch: directFetch,
      })("mistral-small-latest")
    default:
      return null
  }
}
