// ─────────────────────────────────────────────────────────────────────────────
// RouterNode — The entry point of the graph.
//
// Uses the fastest available model (fastModel if set, otherwise the primary
// model) with a minimal prompt that contains ONLY the last user utterance and
// the available intent classes. No conversation history, no tools.
//
// Output: sets ctx.intent to one of: direct | plan | memory | chitchat
// ─────────────────────────────────────────────────────────────────────────────

import { generateText, Output } from "ai"
import { z } from "zod"
import { GraphNode, type NodeEmitter } from "../node"
import type { GraphContext, IntentClass, NodeResult } from "../types"

const ROUTER_SYSTEM = `You are a fast intent classifier for an AI assistant called Jarvis.
Classify the user message into EXACTLY ONE of these intents:

- direct   : single-step question or single-action request (weather, calculation, one device command, definition, simple translation)
- plan     : multi-step task requiring sequential or parallel execution (e.g. "send SMS then check battery", "book, summarise, then notify me")
- memory   : the user is asking to remember, recall, or forget personal information with no other action needed
- chitchat : casual conversation, greeting, or acknowledgement with no action needed

Reply with ONLY a JSON object: {"intent":"<one of the four>"}.
No explanation. No markdown.`

const intentSchema = z.object({
  intent: z.enum(["direct", "plan", "memory", "chitchat"]),
})

export class RouterNode extends GraphNode {
  constructor() {
    super("router", "router")
  }

  async run(ctx: GraphContext, emit: NodeEmitter): Promise<NodeResult> {
    const { startedAt } = this.startResult()
    emit({ type: "node_start", nodeId: this.id, nodeKind: this.kind })

    try {
      const model = ctx.fastModel ?? ctx.model

      const { text, usage } = await generateText({
        model,
        system: ROUTER_SYSTEM,
        // Only the bare user message — cheapest possible context
        prompt: ctx.userMessage,
        maxOutputTokens: 32,
      })

      let intent: IntentClass = "direct"
      try {
        const parsed = intentSchema.parse(JSON.parse(text.trim()))
        intent = parsed.intent
      } catch {
        // Fallback: scan text for keywords
        if (text.includes("plan")) intent = "plan"
        else if (text.includes("memory")) intent = "memory"
        else if (text.includes("chitchat")) intent = "chitchat"
      }

      ;(ctx as { intent: IntentClass }).intent = intent

      const result = this.finishResult(startedAt, {
        status: "done",
        output: intent,
        usage: {
          promptTokens: usage?.inputTokens ?? 0,
          completionTokens: usage?.outputTokens ?? 0,
        },
      })

      emit({ type: "node_done", nodeId: this.id, nodeKind: this.kind, result })
      return result
    } catch (e) {
      // On failure, default to "direct" so the graph always makes progress
      ;(ctx as { intent: IntentClass }).intent = "direct"
      const result = this.errorResult(startedAt, e)
      emit({ type: "node_error", nodeId: this.id, nodeKind: this.kind, result })
      return result
    }
  }
}
