"use client"

import useSWR, { mutate } from "swr"
import Link from "next/link"
import { ArrowLeft, Trash2, RefreshCw } from "lucide-react"
import { StatusBar } from "@/components/jarvis/status-bar"
import { NavBar } from "@/components/jarvis/nav-bar"
import { ToolCallCard } from "@/components/jarvis/tool-call-card"
import type { ExecutionLogEntry } from "@/lib/types"
import { toast } from "sonner"

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export default function LogsPage() {
  const { data, isLoading } = useSWR<{ entries: ExecutionLogEntry[] }>("/api/logs", fetcher, {
    refreshInterval: 3000,
  })

  async function clearLogs() {
    if (!confirm("Clear the entire execution log?")) return
    await fetch("/api/logs", { method: "DELETE" })
    mutate("/api/logs")
    toast.success("Log cleared")
  }

  const entries = data?.entries ?? []

  return (
    <div className="relative min-h-dvh flex flex-col">
      <StatusBar />

      <main className="flex-1 mx-auto w-full max-w-md px-4 pt-4 pb-[120px]">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="grid place-items-center size-8 rounded-sm border border-border/60 hover:border-primary/60 hover:text-primary transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-lg font-semibold tracking-tight flex-1">Execution log</h1>
          <button
            type="button"
            onClick={() => mutate("/api/logs")}
            className="grid place-items-center size-8 rounded-sm border border-border/60 hover:border-primary/60 hover:text-primary transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="size-4" />
          </button>
          <button
            type="button"
            onClick={clearLogs}
            className="grid place-items-center size-8 rounded-sm border border-border/60 hover:border-destructive/60 hover:text-destructive transition-colors"
            aria-label="Clear log"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-3 text-pretty">
          Every command Jarvis dispatched to the phone, oldest at the bottom. Tap any entry to inspect the
          full args and output.
        </p>

        {isLoading && entries.length === 0 && (
          <div className="rounded-md border border-dashed border-border/60 bg-card/20 p-6 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <div className="rounded-md border border-dashed border-border/60 bg-card/20 p-6 text-center text-sm text-muted-foreground">
            No commands yet. Ask Jarvis to do something on your phone.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {entries.map((e) => (
            <div key={e.cmdId}>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                {new Date(e.createdAt).toLocaleString()} · {e.deviceId}
              </div>
              <ToolCallCard
                toolName="device_command"
                state={e.result?.ok ? "output-available" : "output-error"}
                input={{ kind: e.kind, intent: e.intent, ...e.args }}
                output={e.result}
              />
            </div>
          ))}
        </div>
      </main>

      <NavBar />
    </div>
  )
}
