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
    // Allow Jarvis to take up to 15 sequential tool steps in a single turn —
    // enough for "search for X, summarise it, send it as SMS, then notify me".
    stopWhen: stepCountIs(15),
    onError: ({ error }) => {
      console.log("[v0] streamText error:", error)
    },
  })

  return result.toUIMessageStreamResponse()
}
