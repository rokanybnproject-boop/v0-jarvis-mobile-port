import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createXai } from "@ai-sdk/xai"
import { createMistral } from "@ai-sdk/mistral"
import { generateText } from "ai"
import type { LanguageModel } from "ai"
import type { ProviderId } from "@/lib/types"
import { getConfig } from "@/lib/config"

const BASE_URLS: Record<ProviderId, string> = {
  openai:    "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google:    "https://generativelanguage.googleapis.com/v1beta",
  groq:      "https://api.groq.com/openai/v1",
  xai:       "https://api.x.ai/v1",
  mistral:   "https://api.mistral.ai/v1",
}

// This function is no longer used — keeping for reference only
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _buildDefaultModel(provider: ProviderId, apiKey: string): LanguageModel | null {
  if (!apiKey) return null
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey, baseURL: BASE_URLS.openai })("gpt-4o-mini")
    case "anthropic":
      return createAnthropic({ apiKey, baseURL: BASE_URLS.anthropic })("claude-3-5-haiku-latest")
    case "google":
      return createGoogleGenerativeAI({ apiKey, baseURL: BASE_URLS.google })("gemini-2.0-flash")
    case "groq":
      return createGroq({ apiKey, baseURL: BASE_URLS.groq })("llama-3.1-8b-instant")
    case "xai":
      return createXai({ apiKey, baseURL: BASE_URLS.xai })("grok-2-1212")
    case "mistral":
      return createMistral({ apiKey, baseURL: BASE_URLS.mistral })("mistral-small-latest")
    default:
      return null
  }
}

export async function POST(req: Request) {
  const { provider, modelId } = (await req.json()) as {
    provider: string
    modelId: string
  }

  try {
    const config = await getConfig()
    const apiKey = config.apiKeys[provider as ProviderId]
    
    if (!apiKey) {
      return Response.json(
        { valid: false, message: "مفتاح API غير موجود لهذا المزود" },
        { status: 400 },
      )
    }

    // Build the exact model the user selected, not a fallback
    let model: LanguageModel | null = null
    const providerKey = provider as ProviderId
    
    switch (providerKey) {
      case "openai":
        model = createOpenAI({ apiKey, baseURL: BASE_URLS.openai })(modelId)
        break
      case "anthropic":
        model = createAnthropic({ apiKey, baseURL: BASE_URLS.anthropic })(modelId)
        break
      case "google":
        // @ai-sdk/google adds models/ prefix automatically — strip if present
        const googleId = modelId.replace(/^models\//, "")
        model = createGoogleGenerativeAI({ apiKey, baseURL: BASE_URLS.google })(googleId)
        break
      case "groq":
        model = createGroq({ apiKey, baseURL: BASE_URLS.groq })(modelId)
        break
      case "xai":
        model = createXai({ apiKey, baseURL: BASE_URLS.xai })(modelId)
        break
      case "mistral":
        model = createMistral({ apiKey, baseURL: BASE_URLS.mistral })(modelId)
        break
    }

    if (!model) {
      return Response.json(
        { valid: false, message: "المزود غير معروف" },
        { status: 400 },
      )
    }

    // Test with trivial request
    await generateText({
      model,
      prompt: "say OK",
      maxOutputTokens: 2,
    })

    return Response.json({ valid: true, message: "النموذج يعمل بشكل صحيح" })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[v0] validate error:", msg)
    
    let friendlyMsg = msg.slice(0, 200)
    if (msg.includes("credit") || msg.includes("balance")) {
      friendlyMsg = "رصيد المزود منخفض أو غير كافٍ"
    } else if (msg.includes("auth") || msg.includes("invalid") || msg.includes("401") || msg.includes("403")) {
      friendlyMsg = "مفتاح API غير صحيح أو منتهي الصلاحية"
    } else if (msg.includes("model") || msg.includes("not found")) {
      friendlyMsg = "النموذج غير موجود أو غير متاح مع هذا المفتاح"
    } else if (msg.includes("denied") || msg.includes("access")) {
      friendlyMsg = "تم رفض الوصول — تأكد من أن مفتاح API صحيح"
    }
    
    return Response.json(
      { valid: false, message: friendlyMsg },
      { status: 400 },
    )
  }
}
