// ─────────────────────────────────────────────────────────────────────────────
// Fast model selection for the RouterNode.
//
// The router needs the cheapest, fastest model possible because it only does
// intent classification (tiny prompt, tiny output).
//
// Strategy (in priority order):
// 1. If the user has a Groq key → llama-3.1-8b-instant (sub-$1/M tokens, 560 t/s)
// 2. If the user's primary provider is OpenAI → gpt-5.4-mini (cheapest GPT-5)
// 3. If Anthropic → claude-haiku-4-5 (fastest Claude)
// 4. If Google → gemini-3-flash (frontier performance, cheap)
// 5. If xAI → grok-4.1-fast
// 6. If Mistral → mistral-small-4
// 7. Fallback: null (runner uses primary model)
// ─────────────────────────────────────────────────────────────────────────────

import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createXai } from "@ai-sdk/xai"
import { createMistral } from "@ai-sdk/mistral"
import type { LanguageModel } from "ai"
import type { ProviderId } from "@/lib/types"
import { getConfig } from "@/lib/config"

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
      })("gpt-4o-mini")
    case "anthropic":
      return createAnthropic({
        apiKey,
        baseURL: "https://api.anthropic.com/v1",
      })("claude-3-5-haiku-latest")
    case "google":
      return createGoogleGenerativeAI({
        apiKey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta",
      })("gemini-2.0-flash")
    case "xai":
      return createXai({
        apiKey,
        baseURL: "https://api.x.ai/v1",
      })("grok-2-1212")
    case "mistral":
      return createMistral({
        apiKey,
        baseURL: "https://api.mistral.ai/v1",
      })("mistral-small-latest")
    default:
      return null
  }
}
