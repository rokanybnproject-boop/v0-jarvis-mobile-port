// ─────────────────────────────────────────────────────────────────────────────
// MemoryNode — No LLM. Reads all stored memories from Redis and injects them
// into the shared context so downstream nodes can reference them without extra
// round-trips. Also exposes a write helper used by the ResponderNode.
// ─────────────────────────────────────────────────────────────────────────────

import { GraphNode, type NodeEmitter } from "../node"
import type { GraphContext, NodeResult } from "../types"
import { redis, KEYS } from "@/lib/redis"

export class MemoryNode extends GraphNode {
  constructor() {
    super("memory", "memory")
  }

  async run(ctx: GraphContext, emit: NodeEmitter): Promise<NodeResult> {
    const { startedAt } = this.startResult()

    emit({ type: "node_start", nodeId: this.id, nodeKind: this.kind })

    try {
      const raw = (await redis.hgetall(KEYS.memory())) ?? {}
      // Inject into the shared context so every subsequent node can read them.
      // We cast to `any` here only because GraphContext.memories is the write
      // target and context is shared-by-reference through the graph run.
      ;(ctx as { memories: Record<string, string> }).memories = raw as Record<string, string>

      const count = Object.keys(raw).length
      const result = this.finishResult(startedAt, {
        status: "done",
        output: `Loaded ${count} memories`,
        payload: raw,
      })

      emit({ type: "node_done", nodeId: this.id, nodeKind: this.kind, result })
      return result
    } catch (e) {
      const result = this.errorResult(startedAt, e)
      emit({ type: "node_error", nodeId: this.id, nodeKind: this.kind, result })
      return result
    }
  }

  // Called by ResponderNode after it decides to persist something.
  static async write(key: string, value: string): Promise<void> {
    await redis.hset(KEYS.memory(), { [key]: value })
  }

  static async forget(key: string): Promise<void> {
    await redis.hdel(KEYS.memory(), key)
  }
}
