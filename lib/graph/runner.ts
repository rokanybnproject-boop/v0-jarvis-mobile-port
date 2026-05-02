// ─────────────────────────────────────────────────────────────────────────────
// GraphRunner — Orchestrates the cognitive node graph.
//
// Algorithm:
// 1. Always runs: MemoryNode → RouterNode
// 2. Branches based on ctx.intent:
//    - "direct" / "chitchat" → ResponderNode  (short-circuit, 0 executor nodes)
//    - "memory"              → MemoryNode write → ResponderNode
//    - "plan"                → PlannerNode → ExecutorNodes (parallel topo-sort) → ResponderNode
// 3. Executor nodes are launched in waves using Kahn's topological sort:
//    - Each wave is Promise.all'd (true parallelism)
//    - A node only starts when all its dependsOn nodes are done
// 4. Streams every GraphStreamEvent through the provided encoder for real-time UI.
// 5. Stores the full trace in Redis (capped to 100 runs).
// ─────────────────────────────────────────────────────────────────────────────

import type { LanguageModel } from "ai"
import { nanoid } from "nanoid"
import { redis, KEYS } from "@/lib/redis"
import type { GraphContext, GraphStreamEvent, GraphTrace, NodeResult, PlanStep } from "./types"
import { MemoryNode } from "./nodes/memory"
import { RouterNode } from "./nodes/router"
import { PlannerNode } from "./nodes/planner"
import { ExecutorNode } from "./nodes/executor"
import { ResponderNode } from "./nodes/responder"
import type { NodeEmitter } from "./node"

export interface RunnerOptions {
  sessionId: string
  userMessage: string
  conversationSummary: string
  model: LanguageModel
  fastModel: LanguageModel | null
}

export class GraphRunner {
  private readonly encoder: TextEncoder
  private readonly controller: ReadableStreamDefaultController<Uint8Array>
  readonly stream: ReadableStream<Uint8Array>

  constructor() {
    this.encoder = new TextEncoder()
    let ctrl!: ReadableStreamDefaultController<Uint8Array>
    this.stream = new ReadableStream<Uint8Array>({
      start(c) { ctrl = c },
    })
    this.controller = ctrl
  }

  // Send a SSE-style event over the stream
  private send(event: GraphStreamEvent): void {
    try {
      const line = `data: ${JSON.stringify(event)}\n\n`
      this.controller.enqueue(this.encoder.encode(line))
    } catch {
      // Controller may be closed if the client disconnected
    }
  }

  private close(): void {
    try { this.controller.close() } catch { /* already closed */ }
  }

  async run(opts: RunnerOptions): Promise<void> {
    const runId = nanoid(12)
    const startedAt = Date.now()

    const ctx: GraphContext = {
      runId,
      sessionId: opts.sessionId,
      userMessage: opts.userMessage,
      conversationSummary: opts.conversationSummary,
      memories: {},
      intent: null,
      plan: null,
      nodeOutputs: {},
      model: opts.model,
      fastModel: opts.fastModel,
      startedAt,
    }

    const emit: NodeEmitter = (event) => this.send(event)

    const recordOutput = (result: NodeResult) => {
      ctx.nodeOutputs[result.nodeId] = result
    }

    let finalAnswer = ""

    try {
      // ── Phase 1: Memory + Router (always sequential) ──────────────────────
      const memResult = await new MemoryNode().run(ctx, emit)
      recordOutput(memResult)

      const routerResult = await new RouterNode().run(ctx, emit)
      recordOutput(routerResult)

      // ── Phase 2: Branch on intent ─────────────────────────────────────────
      if (ctx.intent === "plan") {
        // Sub-phase A: Planner
        const planResult = await new PlannerNode().run(ctx, emit)
        recordOutput(planResult)

        // Sub-phase B: Topological execution of steps
        const steps = ctx.plan ?? []
        await this.executeStepsTopological(steps, ctx, emit, recordOutput)
      }
      // For direct/chitchat/memory: no executor nodes needed

      // ── Phase 3: Responder (always last) ──────────────────────────────────
      const responder = new ResponderNode((delta) => { finalAnswer += delta })
      const respResult = await responder.run(ctx, emit)
      recordOutput(respResult)
      finalAnswer = respResult.output ?? finalAnswer

      // ── Persist trace to Redis ─────────────────────────────────────────────
      const trace: GraphTrace = {
        runId,
        sessionId: opts.sessionId,
        startedAt,
        finishedAt: Date.now(),
        intent: ctx.intent,
        nodes: Object.values(ctx.nodeOutputs),
        finalAnswer,
      }
      await redis.lpush(KEYS.graphTrace(), JSON.stringify(trace))
      await redis.ltrim(KEYS.graphTrace(), 0, 99)

      this.send({ type: "graph_done", trace })
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      this.send({
        type: "graph_done",
        trace: {
          runId,
          sessionId: opts.sessionId,
          startedAt,
          finishedAt: Date.now(),
          intent: ctx.intent,
          nodes: Object.values(ctx.nodeOutputs),
          finalAnswer: `Error: ${errMsg}`,
        },
      })
    } finally {
      this.close()
    }
  }

  // ── Topological sort (Kahn's algorithm) with wave-parallel execution ───────
  private async executeStepsTopological(
    steps: PlanStep[],
    ctx: GraphContext,
    emit: NodeEmitter,
    recordOutput: (r: NodeResult) => void,
  ): Promise<void> {
    if (!steps.length) return

    // Build in-degree map
    const inDegree = new Map<string, number>()
    const dependents = new Map<string, string[]>() // id → [ids that depend on it]

    for (const s of steps) {
      inDegree.set(s.id, (s.dependsOn ?? []).length)
      dependents.set(s.id, [])
    }
    for (const s of steps) {
      for (const dep of s.dependsOn ?? []) {
        dependents.get(dep)?.push(s.id)
      }
    }

    const stepMap = new Map(steps.map((s) => [s.id, s]))
    const done = new Set<string>()

    // Initial wave: steps with no dependencies
    let wave = steps.filter((s) => (s.dependsOn ?? []).length === 0)

    while (wave.length > 0) {
      // Run the whole wave in parallel
      const results = await Promise.all(
        wave.map((step) => {
          const node = new ExecutorNode(step)
          return node.run(ctx, emit).then((r) => {
            recordOutput(r)
            return step.id
          })
        }),
      )

      // Mark done and discover next wave
      for (const id of results) done.add(id)

      const nextWave: PlanStep[] = []
      for (const id of results) {
        for (const childId of dependents.get(id) ?? []) {
          const current = inDegree.get(childId) ?? 0
          const updated = current - 1
          inDegree.set(childId, updated)
          if (updated === 0 && !done.has(childId)) {
            const s = stepMap.get(childId)
            if (s) nextWave.push(s)
          }
        }
      }
      wave = nextWave
    }
  }
}
