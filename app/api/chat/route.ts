import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai"
import { jarvisTools } from "@/lib/tools"
import { buildSelectedModel } from "@/lib/model-factory"
import { getConfig } from "@/lib/config"

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const built = await buildSelectedModel()
  if (!built) {
    return Response.json(
      {
        error:
          "No model configured. Open Settings, paste an API key for at least one provider, and pick a model.",
      },
      { status: 400 },
    )
  }

  const config = await getConfig()

  const result = streamText({
    model: built.model,
    system: config.systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: jarvisTools,
    // 8 steps is plenty for any realistic multi-step task and prevents runaway
    // tool-loops that drain credits when a model keeps retrying a failing call.
    stopWhen: stepCountIs(8),
    // Cap output so a chatty model can't silently burn 4k+ tokens per turn.
    maxOutputTokens: 1500,
    onError: ({ error }) => {
      const msg = error instanceof Error ? error.message : String(error)
      console.error("[jarvis] LLM error:", msg)
    },
  })

  // Surface the real error message to the client instead of hiding it.
  // Without this, AI SDK v6 returns a generic message and the user has no idea
  // why the request failed.
  return result.toUIMessageStreamResponse({
    onError: (error) => {
      const msg = error instanceof Error ? error.message : String(error)
      // Map provider-specific error patterns to friendly messages
      if (/credit|balance|quota|insufficient/i.test(msg)) {
        return `الرصيد غير كافٍ في حساب ${built.provider}. تحقق من رصيدك على لوحة التحكم.`
      }
      if (/invalid.*key|unauthorized|401/i.test(msg)) {
        return `مفتاح API غير صحيح أو منتهي. أعد إدخال المفتاح في الإعدادات.`
      }
      if (/403|forbidden|denied/i.test(msg)) {
        return `الوصول مرفوض. تحقق من أن مفتاح API لديه صلاحية استخدام نموذج "${built.modelId}".`
      }
      if (/404|not found|does not exist/i.test(msg)) {
        return `النموذج "${built.modelId}" غير موجود مع هذا المزود. اختر نموذجاً آخر من الإعدادات.`
      }
      if (/429|rate limit/i.test(msg)) {
        return `تم تجاوز الحد المسموح. انتظر قليلاً ثم حاول مجدداً.`
      }
      if (/gateway/i.test(msg)) {
        return `خطأ في تجاوز AI Gateway: ${msg}. أعد تشغيل التطبيق.`
      }
      return `خطأ من ${built.provider}: ${msg}`
    },
  })
}
