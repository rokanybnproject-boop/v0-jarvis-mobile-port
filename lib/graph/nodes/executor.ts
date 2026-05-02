// ─────────────────────────────────────────────────────────────────────────────
// ExecutorNode — Executes one PlanStep (or the direct intent).
//
// Each instance handles exactly one step. Multiple instances run in parallel
// when their dependsOn constraints allow it (managed by the Runner).
//
// Context given to the LLM is deliberately narrow:
//   - The single step description
//   - Outputs from dependency steps only (not all prior steps)
//   - Relevant memories
// This keeps token usage minimal while still giving the model everything it
// needs to act.
// ─────────────────────────────────────────────────────────────────────────────

import { generateText, stepCountIs } from "ai"
import { GraphNode, type NodeEmitter } from "../node"
import type { GraphContext, NodeResult, PlanStep } from "../types"
import { jarvisTools } from "@/lib/tools"

const buildExecutorSystem = (
  memories: Record<string, string>,
  dependencyOutputs: string,
) => {
  const memBlock =
    Object.keys(memories).length > 0
      ? `\nUser memories:\n${Object.entries(memories)
          .map(([k, v]) => `  ${k}: ${v}`)
          .join("\n")}`
      : ""

  const depBlock = dependencyOutputs
    ? `\nOutputs from prior steps:\n${dependencyOutputs}`
    : ""

  return `You are the execution module of Jarvis, an AI assistant.
Execute the given step using the available tools. Be concise — focus only on this step.
If you need to call a device command, do so. If you need to reason, think briefly then respond.
${memBlock}${depBlock}`
}

export class ExecutorNode extends GraphNode {
  private readonly step: PlanStep

  constructor(step: PlanStep) {
    super(`executor-${step.id}`, "executor")
    this.step = step
  }

  async run(ctx: GraphContext, emit: NodeEmitter): Promise<NodeResult> {
    const { startedAt } = this.startResult()
    emit({ type: "node_start", nodeId: this.id, nodeKind: this.kind })

    try {
      // Collect outputs from steps this one depends on
      const dependencyOutputs = (this.step.dependsOn ?? [])
        .map((depId) => {
          const depResult = ctx.nodeOutputs[`executor-${depId}`]
          return depResult?.output ? `[${depId}]: ${depResult.output}` : ""
        })
        .filter(Boolean)
        .join("\n")

      const { text, usage } = await generateText({
        model: ctx.model,
        system: buildExecutorSystem(ctx.memories, dependencyOutputs),
        prompt: this.step.description,
        tools: jarvisTools,
        // Allow up to 5 tool calls per step — enough for most atomic actions
        stopWhen: stepCountIs(5),
        maxOutputTokens: 1024,
      })

      const result = this.finishResult(startedAt, {
        status: "done",
        output: text,
        usage: {
          promptTokens: usage?.inputTokens ?? 0,
          completionTokens: usage?.outputTokens ?? 0,
        },
      })

      emit({ type: "node_done", nodeId: this.id, nodeKind: this.kind, result })
      return result
    } catch (e) {
      const result = this.errorResult(startedAt, e)
      emit({ type: "node_error", nodeId: this.id, nodeKind: this.kind, result })
      return result
    }
  }
}
