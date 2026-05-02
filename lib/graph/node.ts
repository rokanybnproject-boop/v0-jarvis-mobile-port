// ─────────────────────────────────────────────────────────────────────────────
// Abstract base class for every node in the cognitive graph.
// ─────────────────────────────────────────────────────────────────────────────

import type { GraphContext, NodeId, NodeKind, NodeResult, GraphStreamEvent } from "./types"

export type NodeEmitter = (event: GraphStreamEvent) => void

export abstract class GraphNode {
  constructor(
    public readonly id: NodeId,
    public readonly kind: NodeKind,
  ) {}

  // Subclasses implement this. The node reads what it needs from ctx,
  // does its work, and returns a NodeResult. It may also emit streaming events
  // via the provided emitter for real-time UI updates.
  abstract run(ctx: GraphContext, emit: NodeEmitter): Promise<NodeResult>

  // Convenience — builds a baseline result and measures duration.
  protected startResult(): { startedAt: number } {
    return { startedAt: Date.now() }
  }

  protected finishResult(
    startedAt: number,
    partial: Omit<NodeResult, "nodeId" | "kind" | "startedAt" | "finishedAt" | "durationMs">,
  ): NodeResult {
    const finishedAt = Date.now()
    return {
      nodeId: this.id,
      kind: this.kind,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
      ...partial,
    }
  }

  protected errorResult(startedAt: number, error: unknown): NodeResult {
    const msg = error instanceof Error ? error.message : String(error)
    return this.finishResult(startedAt, { status: "error", error: msg })
  }
}
