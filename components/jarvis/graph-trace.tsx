// ─────────────────────────────────────────────────────────────────────────────
// GraphTrace — Real-time cognitive graph visualiser
//
// Renders a live HUD-style timeline of the node DAG as it executes.
// Each node shows: kind badge, status indicator, duration, token usage.
// ─────────────────────────────────────────────────────────────────────────────
"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type {
  GraphStreamEvent,
  GraphTrace,
  NodeKind,
  NodeResult,
  IntentClass,
} from "@/lib/graph/types"

// ── Labels ────────────────────────────────────────────────────────────────────
const NODE_LABELS: Record<NodeKind, { ar: string; en: string }> = {
  router:     { ar: "الموجّه",    en: "Router"     },
  planner:    { ar: "المخطّط",   en: "Planner"    },
  executor:   { ar: "المنفّذ",   en: "Executor"   },
  memory:     { ar: "الذاكرة",   en: "Memory"     },
  responder:  { ar: "المجيب",    en: "Responder"  },
}

const INTENT_LABELS: Record<IntentClass, { ar: string; en: string }> = {
  direct:    { ar: "مباشر",      en: "Direct"    },
  plan:      { ar: "تخطيط",     en: "Plan"      },
  memory:    { ar: "ذاكرة",     en: "Memory"    },
  chitchat:  { ar: "دردشة",     en: "Chitchat"  },
}

// ── Status colours ────────────────────────────────────────────────────────────
const STATUS_CLASS: Record<string, string> = {
  pending:  "border-border/40 text-muted-foreground",
  running:  "border-accent/60 text-accent animate-pulse",
  done:     "border-primary/60 text-primary",
  error:    "border-destructive/60 text-destructive",
  skipped:  "border-border/30 text-muted-foreground/50",
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-border/50",
  running: "bg-accent shadow-[0_0_6px_currentColor] text-accent animate-pulse",
  done:    "bg-primary shadow-[0_0_4px_currentColor] text-primary",
  error:   "bg-destructive",
  skipped: "bg-border/30",
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(ms: number | undefined): string {
  if (!ms) return ""
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function tokens(r: NodeResult): string | null {
  if (!r.usage) return null
  const total = r.usage.promptTokens + r.usage.completionTokens
  return `${total}t`
}

// ── NodeCard ──────────────────────────────────────────────────────────────────
function NodeCard({
  result,
  locale,
}: {
  result: NodeResult
  locale: "ar" | "en"
}) {
  const [open, setOpen] = useState(false)
  const label = NODE_LABELS[result.kind]?.[locale] ?? result.kind
  const statusCls = STATUS_CLASS[result.status] ?? STATUS_CLASS.pending
  const dotCls = STATUS_DOT[result.status] ?? STATUS_DOT.pending
  const t = tokens(result)

  return (
    <div
      className={cn(
        "rounded-md border bg-card/40 backdrop-blur-sm overflow-hidden transition-colors",
        statusCls,
      )}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-start"
      >
        {/* Status dot */}
        <span className={cn("shrink-0 size-2 rounded-full", dotCls)} />

        {/* Kind badge */}
        <span className="shrink-0 text-[9px] font-mono uppercase tracking-widest border border-current/40 rounded px-1.5 py-0.5">
          {label}
        </span>

        {/* Node id (truncated) */}
        <span className="flex-1 truncate text-[11px] font-mono text-muted-foreground">
          {result.nodeId}
        </span>

        {/* Meta */}
        <span className="shrink-0 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/70">
          {t && <span>{t}</span>}
          {result.durationMs !== undefined && (
            <span>{fmt(result.durationMs)}</span>
          )}
        </span>
      </button>

      {/* Expandable output */}
      {open && (
        <div className="border-t border-border/40 px-3 py-2">
          {result.output && (
            <p className="text-[12px] text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
              {result.output.length > 400
                ? result.output.slice(0, 400) + "…"
                : result.output}
            </p>
          )}
          {result.error && (
            <p className="text-[12px] text-destructive font-mono break-words">
              {result.error}
            </p>
          )}
          {!result.output && !result.error && (
            <p className="text-[11px] text-muted-foreground italic">
              {locale === "ar" ? "لا توجد مخرجات" : "No output"}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface GraphTraceViewProps {
  sessionId?: string
  locale: "ar" | "en"
  onFinalAnswer?: (text: string) => void
}

export function GraphTraceView({
  sessionId,
  locale,
  onFinalAnswer,
}: GraphTraceViewProps) {
  const [nodes, setNodes] = useState<NodeResult[]>([])
  const [intent, setIntent] = useState<IntentClass | null>(null)
  const [done, setDone] = useState(false)
  const [totalMs, setTotalMs] = useState<number | null>(null)
  const startRef = useRef<number>(Date.now())

  // Exposed method: called by parent to start a graph run
  // Returns a stream controller so parent can pipe events here
  return { nodes, intent, done, totalMs }
}

// ── Hook: useGraphRun ─────────────────────────────────────────────────────────
// Drives a graph run against /api/graph and streams events back.
export function useGraphRun() {
  const [nodes, setNodes] = useState<NodeResult[]>([])
  const [intent, setIntent] = useState<IntentClass | null>(null)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [trace, setTrace] = useState<GraphTrace | null>(null)
  const [finalText, setFinalText] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  const start = async (userMessage: string, conversationSummary = "") => {
    // Reset
    setNodes([])
    setIntent(null)
    setDone(false)
    setTrace(null)
    setFinalText("")
    setRunning(true)

    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch("/api/graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage, conversationSummary }),
        signal: abort.signal,
      })

      if (!res.ok || !res.body) {
        setRunning(false)
        setDone(true)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith("data:")) continue
          const raw = trimmed.slice(5).trim()
          if (!raw || raw === "[DONE]") continue
          try {
            const event: GraphStreamEvent = JSON.parse(raw)
            handleEvent(event)
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.log("[v0] useGraphRun error:", e)
      }
    } finally {
      setRunning(false)
      setDone(true)
    }
  }

  const handleEvent = (event: GraphStreamEvent) => {
    switch (event.type) {
      case "node_start":
        setNodes((prev) => {
          const exists = prev.find((n) => n.nodeId === event.nodeId)
          if (exists) return prev
          return [
            ...prev,
            {
              nodeId: event.nodeId!,
              kind: event.nodeKind!,
              status: "running",
              startedAt: Date.now(),
            } as NodeResult,
          ]
        })
        break

      case "node_done":
      case "node_error":
        if (event.result) {
          setNodes((prev) =>
            prev.map((n) => (n.nodeId === event.result!.nodeId ? event.result! : n)),
          )
          // Extract intent from router result
          if (event.result.kind === "router" && event.result.output) {
            setIntent(event.result.output as IntentClass)
          }
        }
        break

      case "text_delta":
        if (event.delta) setFinalText((t) => t + event.delta)
        break

      case "graph_done":
        if (event.trace) {
          setTrace(event.trace)
          setNodes(event.trace.nodes)
          setIntent(event.trace.intent)
        }
        setDone(true)
        break
    }
  }

  const stop = () => {
    abortRef.current?.abort()
    setRunning(false)
    setDone(true)
  }

  return { nodes, intent, running, done, trace, finalText, start, stop }
}

// ── GraphTracePanel — the visible UI panel ────────────────────────────────────
export function GraphTracePanel({
  nodes,
  intent,
  running,
  done,
  finalText,
  locale,
}: {
  nodes: NodeResult[]
  intent: IntentClass | null
  running: boolean
  done: boolean
  finalText: string
  locale: "ar" | "en"
}) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [nodes])

  const totalMs = done && nodes.length > 0
    ? Math.max(...nodes.map((n) => n.finishedAt ?? 0)) -
      Math.min(...nodes.map((n) => n.startedAt))
    : null

  const totalTokens = nodes.reduce((acc, n) => {
    if (!n.usage) return acc
    return acc + n.usage.promptTokens + n.usage.completionTokens
  }, 0)

  const intentLabel = intent ? (INTENT_LABELS[intent]?.[locale] ?? intent) : null

  return (
    <div className="rounded-lg border border-primary/30 bg-background/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-card/40">
        {/* Live indicator */}
        <span
          className={cn(
            "size-2 rounded-full shrink-0",
            running
              ? "bg-accent animate-pulse shadow-[0_0_6px_currentColor] text-accent"
              : done
                ? "bg-primary"
                : "bg-border/50",
          )}
        />
        <span className="text-[10px] font-mono uppercase tracking-widest text-primary flex-1">
          {locale === "ar" ? "الشبكة المعرفية" : "Cognitive Graph"}
        </span>
        {intentLabel && (
          <span className="text-[9px] font-mono border border-primary/40 text-primary rounded px-1.5 py-0.5">
            {intentLabel}
          </span>
        )}
        {totalMs !== null && (
          <span className="text-[10px] font-mono text-muted-foreground">
            {fmt(totalMs)}
          </span>
        )}
        {totalTokens > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground">
            {totalTokens}t
          </span>
        )}
      </div>

      {/* Node list */}
      <div className="flex flex-col gap-1.5 p-2">
        {nodes.map((n) => (
          <NodeCard key={n.nodeId} result={n} locale={locale} />
        ))}
        {nodes.length === 0 && (
          <div className="py-3 text-center text-[11px] font-mono text-muted-foreground">
            {locale === "ar" ? "انتظار العقد…" : "Awaiting nodes…"}
          </div>
        )}
      </div>

      {/* Streaming text preview */}
      {finalText && (
        <div className="border-t border-border/40 px-3 py-2.5">
          <p className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap break-words">
            {finalText}
          </p>
        </div>
      )}

      <div ref={endRef} />
    </div>
  )
}
