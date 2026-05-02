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
      const msg = error instanceof Error ? error.message : String(error)
      if (/credit|balance|quota|billing|insufficient/i.test(msg)) {
        console.error("[jarvis] billing:", msg)
      } else if (/invalid.*key|auth|unauthorized|403|401/i.test(msg)) {
        console.error("[jarvis] auth:", msg)
      } else {
        console.error("[jarvis] error:", msg)
      }
    },
  })

  return result.toUIMessageStreamResponse()
}
