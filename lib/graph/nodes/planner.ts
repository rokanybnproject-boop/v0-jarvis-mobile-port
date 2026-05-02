// ─────────────────────────────────────────────────────────────────────────────
// PlannerNode — Decomposes a multi-step task into a dependency-aware step list.
//
// Only invoked when RouterNode returns intent === "plan".
// Receives: userMessage + memories + conversationSummary (NOT full history).
// Produces: ctx.plan — an array of PlanStep with optional dependsOn edges,
//           which the Runner uses to build the execution DAG.
// ─────────────────────────────────────────────────────────────────────────────

import { generateText } from "ai"
import { GraphNode, type NodeEmitter } from "../node"
import type { GraphContext, NodeResult, PlanStep } from "../types"
import { nanoid } from "nanoid"

const buildPlannerSystem = (memories: Record<string, string>) => {
  const memBlock =
    Object.keys(memories).length > 0
      ? `\nKnown user context:\n${Object.entries(memories)
          .map(([k, v]) => `  ${k}: ${v}`)
          .join("\n")}`
      : ""

  return `You are the planning module of an AI assistant called Jarvis.
Your job is to break a multi-step user request into an ordered, dependency-aware list of atomic steps.
${memBlock}

Rules:
1. Each step must be atomic — a single tool call or a single LLM inference, not a compound action.
2. If step B must wait for step A's output, set B.dependsOn = ["A_id"]. Independent steps have no dependsOn.
3. Use toolHint to suggest the right tool: device_command | web_search | recall_memory | llm_inference.
4. Maximum 8 steps. If the task genuinely needs more, split it and say so.
5. Reply with ONLY a JSON array — no prose, no markdown fences.

Format:
[
  {"id":"s1","description":"What to do","toolHint":"device_command","dependsOn":[]},
  {"id":"s2","description":"What to do next","toolHint":"llm_inference","dependsOn":["s1"]}
]`
}

export class PlannerNode extends GraphNode {
  constructor() {
    super("planner", "planner")
  }

  async run(ctx: GraphContext, emit: NodeEmitter): Promise<NodeResult> {
    const { startedAt } = this.startResult()
    emit({ type: "node_start", nodeId: this.id, nodeKind: this.kind })

    try {
      const { text, usage } = await generateText({
        model: ctx.model,
        system: buildPlannerSystem(ctx.memories),
        // Narrow context: summary + current message only
        prompt: ctx.conversationSummary
          ? `Prior context: ${ctx.conversationSummary}\n\nUser request: ${ctx.userMessage}`
          : `User request: ${ctx.userMessage}`,
        maxOutputTokens: 512,
      })

      let steps: PlanStep[] = []
      try {
        const parsed = JSON.parse(text.trim())
        if (Array.isArray(parsed)) {
          steps = parsed.map((s: Record<string, unknown>) => ({
            id: typeof s.id === "string" ? s.id : nanoid(6),
            description: typeof s.description === "string" ? s.description : "",
            toolHint: typeof s.toolHint === "string" ? s.toolHint : undefined,
            dependsOn: Array.isArray(s.dependsOn) ? (s.dependsOn as string[]) : [],
          }))
        }
      } catch {
        // If JSON fails, create a single fallback step
        steps = [{ id: "s1", description: ctx.userMessage, toolHint: "llm_inference" }]
      }

      ;(ctx as { plan: PlanStep[] }).plan = steps

      const result = this.finishResult(startedAt, {
        status: "done",
        output: `${steps.length} steps planned`,
        payload: steps,
        usage: {
          promptTokens: usage?.inputTokens ?? 0,
          completionTokens: usage?.outputTokens ?? 0,
        },
      })

      emit({ type: "node_done", nodeId: this.id, nodeKind: this.kind, result })
      return result
    } catch (e) {
      // Fallback plan
      ;(ctx as { plan: PlanStep[] }).plan = [
        { id: "s1", description: ctx.userMessage, toolHint: "llm_inference" },
      ]
      const result = this.errorResult(startedAt, e)
      emit({ type: "node_error", nodeId: this.id, nodeKind: this.kind, result })
      return result
    }
  }
}
