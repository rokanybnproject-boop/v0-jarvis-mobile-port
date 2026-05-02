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

// ── Rule-based keyword classifier (zero tokens, runs first) ──────────────────
// Mirrors the strategy in the original Jarvis intent_parser.py:
// keyword scoring → if confidence ≥ 0.7, skip LLM entirely.

const KEYWORD_RULES: Record<IntentClass, string[]> = {
  plan: [
    "then", "after that", "next", "step by step", "first.*then", "followed by",
    "ثم", "بعد ذلك", "أولاً", "خطوة", "ثم بعد",
  ],
  memory: [
    "remember", "forget", "recall", "my name is", "i am", "call me",
    "تذكر", "انسَ", "اسمي", "أنا", "أذكر",
  ],
  chitchat: [
    "^hi$", "^hello$", "^hey$", "how are you", "good morning", "good night", "thanks", "thank you",
    "^مرحبا$", "^أهلاً$", "كيف حالك", "صباح", "مساء", "شكراً",
  ],
  direct: [], // fallback — anything that doesn't match above
}

function keywordClassify(msg: string): { intent: IntentClass; confidence: number } | null {
  const lower = msg.toLowerCase().trim()
  const scores: Record<IntentClass, number> = { plan: 0, memory: 0, chitchat: 0, direct: 0 }

  for (const [intent, patterns] of Object.entries(KEYWORD_RULES) as [IntentClass, string[]][]) {
    for (const pat of patterns) {
      if (new RegExp(pat, "u").test(lower)) scores[intent]++
    }
  }

  const best = (Object.entries(scores) as [IntentClass, number][]).reduce(
    (a, b) => (b[1] > a[1] ? b : a),
  )

  // Only trust keyword match if at least 1 pattern fired AND intent is not "direct"
  if (best[1] >= 1 && best[0] !== "direct") {
    const confidence = Math.min(best[1] / 2, 1.0)
    if (confidence >= 0.5) return { intent: best[0], confidence }
  }

  return null
}

// ── LLM-based classifier (fallback) ──────────────────────────────────────────

const ROUTER_SYSTEM = `You are J.A.R.V.I.S. intent classifier.
Classify the user message into EXACTLY ONE intent:

- direct   : single-step question or single-action request
- plan     : multi-step task requiring sequential or parallel execution
- memory   : the user is asking to remember, recall, or forget personal information only
- chitchat : casual conversation or greeting with no actionable request

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
      // Step 1: Try rule-based classification (zero tokens)
      const ruleMatch = keywordClassify(ctx.userMessage)
      if (ruleMatch) {
        ;(ctx as { intent: IntentClass }).intent = ruleMatch.intent
        const result = this.finishResult(startedAt, {
          status: "done",
          output: `${ruleMatch.intent} (rule, conf=${ruleMatch.confidence.toFixed(2)})`,
          usage: { promptTokens: 0, completionTokens: 0 },
        })
        emit({ type: "node_done", nodeId: this.id, nodeKind: this.kind, result })
        return result
      }

      // Step 2: LLM fallback (only when keywords are ambiguous)
      const model = ctx.fastModel ?? ctx.model

      const { text, usage } = await generateText({
        model,
        system: ROUTER_SYSTEM,
        prompt: ctx.userMessage,
        maxOutputTokens: 32,
      })

      let intent: IntentClass = "direct"
      try {
        const parsed = intentSchema.parse(JSON.parse(text.trim()))
        intent = parsed.intent
      } catch {
        if (text.includes("plan")) intent = "plan"
        else if (text.includes("memory")) intent = "memory"
        else if (text.includes("chitchat")) intent = "chitchat"
      }

      ;(ctx as { intent: IntentClass }).intent = intent

      const result = this.finishResult(startedAt, {
        status: "done",
        output: `${intent} (llm)`,
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
