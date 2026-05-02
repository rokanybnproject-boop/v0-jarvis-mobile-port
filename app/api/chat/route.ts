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
    stopWhen: stepCountIs(15),
    onError: ({ error }) => {
      // Surface a clear error in the stream so the UI can show it
      const msg = error instanceof Error ? error.message : String(error)
      // Detect common provider error patterns
      if (/credit|balance|quota|billing|insufficient/i.test(msg)) {
        console.error("[jarvis] Provider billing error:", msg)
      } else if (/invalid.*key|auth|unauthorized|403|401/i.test(msg)) {
        console.error("[jarvis] Provider auth error:", msg)
      } else {
        console.error("[jarvis] Provider error:", msg)
      }
    },
  })

  return result.toUIMessageStreamResponse({
    getErrorMessage(error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (/credit|balance|quota|billing|insufficient/i.test(msg)) {
        return "رصيد المزود منتهٍ — يرجى شحن حساب " + built.provider + " أو اختيار مزود آخر."
      }
      if (/invalid.*key|auth|unauthorized|403|401/i.test(msg)) {
        return "مفتاح API غير صحيح أو منتهي الصلاحية — تحقق من الإعدادات."
      }
      if (/model.*not.*found|does not exist/i.test(msg)) {
        return "النموذج المحدد غير متاح لهذا المفتاح — اختر نموذجاً آخر من الإعدادات."
      }
      return "خطأ من المزود: " + msg.slice(0, 200)
    },
  })
}
