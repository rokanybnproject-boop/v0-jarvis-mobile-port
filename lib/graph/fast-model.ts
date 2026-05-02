// ─────────────────────────────────────────────────────────────────────────────
// Fast model selection for the RouterNode.
//
// The router needs the cheapest, fastest model possible because it only does
// intent classification (tiny prompt, tiny output).
//
// Strategy (in priority order):
// 1. If the user has a Groq key → groq/llama-3.1-8b-instant (free-tier fast)
// 2. If the user's primary provider is OpenAI → gpt-4o-mini
// 3. If Anthropic → claude-haiku-3-5
// 4. If Google → gemini-2.0-flash
// 5. Fallback: null (runner uses primary model)
// ─────────────────────────────────────────────────────────────────────────────

import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import type { LanguageModel } from "ai"
import type { ProviderId } from "@/lib/types"
import { getConfig } from "@/lib/config"

export async function buildFastModel(
  primaryProvider: ProviderId,
): Promise<LanguageModel | null> {
  const config = await getConfig()

  // Prefer Groq — fastest for small classification tasks, direct API
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
        compatibility: "strict",
      })("gpt-4o-mini")
    case "anthropic":
      return createAnthropic({
        apiKey,
        baseURL: "https://api.anthropic.com/v1",
      })("claude-haiku-3-5-20241022")
    case "google":
      return createGoogleGenerativeAI({
        apiKey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta",
      })("gemini-2.0-flash")
    default:
      return null
  }
}
