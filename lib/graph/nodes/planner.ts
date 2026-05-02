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

  return `You are J.A.R.V.I.S. planning module — precise, analytical, dependency-aware.
Break the multi-step request into atomic executable steps with explicit dependency edges.
${memBlock}

Rules:
1. Atomic steps only — one tool call or one LLM inference per step. No compound actions.
2. Mark dependencies: if step B needs step A's output, set B.dependsOn = ["A_id"]. Independent steps run in parallel.
3. toolHint options: device_command | shell_exec | llm_inference | recall_memory | web_search.
4. Maximum 8 steps. Prefer fewer, broader steps over many micro-steps.
5. Reply with ONLY a valid JSON array. No prose, no markdown fences, no commentary.

Format:
[
  {"id":"s1","description":"Concise action description","toolHint":"device_command","dependsOn":[]},
  {"id":"s2","description":"Next action using s1 output","toolHint":"llm_inference","dependsOn":["s1"]}
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
