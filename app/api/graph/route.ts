// ─────────────────────────────────────────────────────────────────────────────
// /api/graph — Cognitive Graph endpoint
//
// Receives the last user message + a compressed conversation summary,
// instantiates a GraphRunner, and streams GraphStreamEvents as SSE.
// The client parses these events to render the graph trace in real time.
// ─────────────────────────────────────────────────────────────────────────────

import { GraphRunner } from "@/lib/graph/runner"
import { buildSelectedModel } from "@/lib/model-factory"
import { buildFastModel } from "@/lib/graph/fast-model"

export const maxDuration = 120

export async function POST(req: Request) {
  const { userMessage, conversationSummary, sessionId } = await req.json() as {
    userMessage: string
    conversationSummary?: string
    sessionId?: string
  }

  if (!userMessage?.trim()) {
    return Response.json({ error: "userMessage is required" }, { status: 400 })
  }

  const built = await buildSelectedModel()
  if (!built) {
    return Response.json(
      { error: "لا يوجد نموذج محدد — افتح الإعدادات وأضف مفتاح API واختر نموذجاً." },
      { status: 400 },
    )
  }

  // fastModel is optional — used only by the RouterNode for cheap classification.
  // If unavailable we fall back to the primary model.
  const fastModel = await buildFastModel(built.provider)

  const runner = new GraphRunner()

  // Start the graph run in the background — don't await here so we can return
  // the stream header immediately.
  runner.run({
    sessionId: sessionId ?? "default",
    userMessage,
    conversationSummary: conversationSummary ?? "",
    model: built.model,
    fastModel,
  })

  return new Response(runner.stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
