// ─────────────────────────────────────────────────────────────────────────────
// Jarvis Cognitive Graph — Type definitions
//
// A Directed Acyclic Graph (DAG) of specialised nodes. Each node receives a
// shared GraphContext, executes a focused task (optionally calling an LLM with
// a *narrow* prompt), and writes its result back into that context.
// ─────────────────────────────────────────────────────────────────────────────

import type { LanguageModel } from "ai"

// ── Node identifiers ──────────────────────────────────────────────────────────
export type NodeKind =
  | "router"     // Classify user intent — routes to the right subgraph
  | "planner"    // Decompose complex intent into a step list
  | "executor"   // Run one step (tool call / device command)
  | "memory"     // Read / write long-term memory (no LLM)
  | "responder"  // Synthesise a final natural-language reply

export type NodeId = string   // Unique ID within a graph run, e.g. "executor-0"

// ── Intent classification ─────────────────────────────────────────────────────
// The Router classifies the user's message into one of these buckets so
// downstream nodes can short-circuit when possible.
export type IntentClass =
  | "direct"   // Simple one-step answer / tool call — skip the Planner
  | "plan"     // Multi-step task — needs Planner → Executor(s)
  | "memory"   // Pure memory recall / store — no LLM inference needed
  | "chitchat" // Casual conversation — single LLM call, no tools

// ── Shared context (immutable shape, mutable via update pattern) ──────────────
// The context travels through every node in the graph. Each node reads what it
// needs and writes its own output into `nodeOutputs[nodeId]`.
export interface GraphContext {
  runId: string
  sessionId: string             // conversation ID for memory lookups
  userMessage: string           // the raw last user utterance
  conversationSummary: string   // compressed prior-turn context (NOT full history)
  memories: Record<string, string>  // long-term memories loaded upfront
  intent: IntentClass | null
  plan: PlanStep[] | null       // filled by PlannerNode
  nodeOutputs: Record<NodeId, NodeResult>
  model: LanguageModel          // primary model (user-selected)
  fastModel: LanguageModel | null  // small/fast model for routing (optional)
  startedAt: number
}

// ── Plan step ────────────────────────────────────────────────────────────────
export interface PlanStep {
  id: string
  description: string  // what this step should achieve
  toolHint?: string    // optional hint: which tool to prefer
  dependsOn?: string[] // step ids that must complete first (DAG edges)
}

// ── Node result ──────────────────────────────────────────────────────────────
export type NodeStatus = "pending" | "running" | "done" | "error" | "skipped"

export interface NodeResult {
  nodeId: NodeId
  kind: NodeKind
  status: NodeStatus
  startedAt: number
  finishedAt?: number
  durationMs?: number
  /** Token usage for LLM nodes */
  usage?: { promptTokens: number; completionTokens: number }
  /** The primary output this node produced */
  output?: string
  /** Structured payload (tool result, plan JSON, etc.) */
  payload?: unknown
  error?: string
}

// ── Graph trace (stored in Redis for UI) ─────────────────────────────────────
export interface GraphTrace {
  runId: string
  sessionId: string
  startedAt: number
  finishedAt?: number
  intent: IntentClass | null
  nodes: NodeResult[]
  finalAnswer: string
}

// ── Edge definition (for the runner) ────────────────────────────────────────
export interface GraphEdge {
  from: NodeId
  to: NodeId
  /** If provided, edge is only followed when the condition returns true */
  when?: (ctx: GraphContext) => boolean
}

// ── Streaming event (sent to client via ReadableStream) ─────────────────────
export type GraphStreamEventType =
  | "node_start"
  | "node_done"
  | "node_error"
  | "text_delta"
  | "graph_done"

export interface GraphStreamEvent {
  type: GraphStreamEventType
  nodeId?: NodeId
  nodeKind?: NodeKind
  delta?: string
  result?: NodeResult
  trace?: GraphTrace
}
