"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import useSWR from "swr"
import Link from "next/link"
import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import { StatusBar } from "@/components/jarvis/status-bar"
import { NavBar } from "@/components/jarvis/nav-bar"
import { ChatMessages } from "@/components/jarvis/chat-messages"
import { ChatInput } from "@/components/jarvis/chat-input"
import { Orb } from "@/components/jarvis/orb"
import { useLocale } from "@/components/jarvis/locale-provider"
import { GraphTracePanel, useGraphRun } from "@/components/jarvis/graph-trace"
import type { JarvisConfig, Device } from "@/lib/types"
import { ArrowRight, Sparkles, Zap, Cpu, Cog, Network, MessageSquare, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TranslationKey } from "@/lib/i18n"

const fetcher = (u: string) => fetch(u).then((r) => r.json())

const SUGGESTION_KEYS: {
  icon: React.ElementType
  labelKey: TranslationKey
  promptKey: TranslationKey
}[] = [
  { icon: Zap,      labelKey: "suggestion_diagnostics", promptKey: "suggestion_diagnostics_prompt" },
  { icon: Sparkles, labelKey: "suggestion_camera",      promptKey: "suggestion_camera_prompt"      },
  { icon: Cog,      labelKey: "suggestion_tts",         promptKey: "suggestion_tts_prompt"          },
  { icon: Cpu,      labelKey: "suggestion_top",         promptKey: "suggestion_top_prompt"          },
]

// Build a short summary of the last N chat messages for the graph planner
function buildSummary(messages: UIMessage[], maxMessages = 6): string {
  const recent = messages.slice(-maxMessages)
  return recent
    .map((m) => {
      const role = m.role === "user" ? "User" : "Jarvis"
      const text = m.parts
        ?.filter((p) => p.type === "text")
        .map((p) => (p as { text: string }).text)
        .join(" ") ?? ""
      return `${role}: ${text.slice(0, 200)}`
    })
    .join("\n")
}

export default function ChatPage() {
  const { t, locale, dir } = useLocale()
  const { data: config }       = useSWR<JarvisConfig>("/api/config", fetcher)
  const { data: devicesData }  = useSWR<{ devices: Device[] }>("/api/device/pair", fetcher, { refreshInterval: 10000 })

  // Restore messages from sessionStorage on mount (survives page refresh)
  const STORAGE_KEY = "jarvis_chat_messages"
  const loadInitialMessages = (): UIMessage[] => {
    if (typeof window === "undefined") return []
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as UIMessage[]) : []
    } catch {
      return []
    }
  }

  // Standard chat (fallback mode)
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    initialMessages: loadInitialMessages(),
  })

  // Persist messages to sessionStorage whenever they change
  const prevMessagesRef = useRef<UIMessage[]>([])
  useEffect(() => {
    if (messages.length === 0 && prevMessagesRef.current.length === 0) return
    prevMessagesRef.current = messages
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // sessionStorage quota exceeded — silently ignore
    }
  }, [messages])

  // Graph mode state
  const [graphMode, setGraphMode] = useState(false)
  const graph = useGraphRun()

  const orbState = useMemo<"idle" | "thinking" | "executing" | "error">(() => {
    if (graphMode) {
      if (graph.running) return "executing"
      return "idle"
    }
    if (status === "error" || error) return "error"
    if (status === "submitted") return "thinking"
    if (status === "streaming") {
      const last = messages[messages.length - 1] as UIMessage | undefined
      const running = last?.parts?.some(
        (p) =>
          (p.type?.startsWith("tool-") || p.type === "dynamic-tool") &&
          (p as unknown as { state: string }).state !== "output-available" &&
          (p as unknown as { state: string }).state !== "output-error",
      )
      return running ? "executing" : "thinking"
    }
    return "idle"
  }, [status, messages, error, graphMode, graph.running])

  const handleNewChat = useCallback(() => {
    try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    window.location.reload()
  }, [])

  const handleSend = useCallback((text: string) => {
    if (graphMode) {
      const summary = buildSummary(messages)
      graph.start(text, summary)
    } else {
      sendMessage({ text })
    }
  }, [graphMode, graph, messages, sendMessage])

  const handleStop = useCallback(() => {
    if (graphMode) graph.stop()
    else stop()
  }, [graphMode, graph, stop])

  const isProcessing = graphMode ? graph.running : (status === "submitted" || status === "streaming")
  const hasModel  = Boolean(config?.selectedProvider && config?.selectedModelId)
  const hasDevice = (devicesData?.devices?.length ?? 0) > 0
  const isEmpty   = graphMode ? !graph.done && graph.nodes.length === 0 : messages.length === 0

  return (
    <div className="relative min-h-dvh flex flex-col">
      <StatusBar />

      <main className="flex-1 mx-auto w-full max-w-md pb-[160px]">
        {/* Setup warnings */}
        {(!hasModel || !hasDevice) && (
          <SetupBanner hasModel={hasModel} hasDevice={hasDevice} />
        )}

        {/* Mode toggle row */}
        <div className="flex items-center justify-between gap-1 px-4 pt-3 pb-1" dir={dir}>
          {!isEmpty && (
            <button
              type="button"
              title={locale === "ar" ? "محادثة جديدة" : "New conversation"}
              onClick={handleNewChat}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-mono uppercase tracking-widest border border-border/50 text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
            >
              <PlusCircle className="size-3" />
              {locale === "ar" ? "جديد" : "New"}
            </button>
          )}
          <button
            type="button"
            title={t("graph_mode_tooltip")}
            onClick={() => setGraphMode((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-widest border transition-colors",
              graphMode
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border/50 text-muted-foreground hover:border-border",
            )}
          >
            {graphMode ? (
              <Network className="size-3" />
            ) : (
              <MessageSquare className="size-3" />
            )}
            {graphMode ? t("graph_mode_on") : t("graph_mode_off")}
          </button>
        </div>

        {/* Empty state */}
        {isEmpty ? (
          <section className="flex flex-col items-center px-6 pt-4">
            <div className="relative">
              <Orb state={orbState} size={220} />
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance text-center">
              {t("home_at_your_service")}
            </h1>
            <p className="mt-2 text-center text-muted-foreground text-pretty max-w-xs">
              {graphMode ? t("graph_mode_desc") : t("home_tagline")}
            </p>

            {!graphMode && (
              <ul className="mt-7 w-full grid gap-2">
                {SUGGESTION_KEYS.map((s) => (
                  <li key={s.labelKey}>
                    <button
                      type="button"
                      onClick={() => sendMessage({ text: t(s.promptKey) })}
                      disabled={!hasModel}
                      className="group w-full flex items-center gap-3 px-3 py-3 rounded-md border border-border/60 hover:border-primary/60 hover:bg-card/60 transition-colors text-start disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="grid place-items-center size-8 rounded-sm border border-border/60 text-primary group-hover:border-primary/60 shrink-0">
                        <s.icon className="size-4" />
                      </span>
                      <span className="flex-1 text-sm">{t(s.labelKey)}</span>
                      <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {graphMode && (
              <div className="mt-6 w-full rounded-md border border-primary/20 bg-card/30 px-4 py-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">
                  DAG
                </div>
                <div className="flex flex-col gap-1 text-[11px] font-mono text-muted-foreground">
                  {(["router","memory","planner","executor","responder"] as const).map((kind) => (
                    <div key={kind} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-border/60 shrink-0" />
                      <span className="border border-border/40 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                        {kind}
                      </span>
                      <span className="opacity-50">
                        {{
                          router:    locale === "ar" ? "تصنيف النية" : "intent classification",
                          memory:    locale === "ar" ? "استرجاع الذاكرة" : "memory retrieval",
                          planner:   locale === "ar" ? "تحليل المهمة → خطوات" : "decompose task → steps",
                          executor:  locale === "ar" ? "تنفيذ (متوازٍ)" : "execute (parallel)",
                          responder: locale === "ar" ? "صياغة الرد" : "synthesise reply",
                        }[kind]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <>
            <div className="flex justify-center pt-4 pb-2">
              <Orb state={orbState} size={72} />
            </div>

            {/* Graph mode output */}
            {graphMode ? (
              <div className="px-4 py-2 flex flex-col gap-3">
                <GraphTracePanel
                  nodes={graph.nodes}
                  intent={graph.intent}
                  running={graph.running}
                  done={graph.done}
                  finalText={graph.finalText}
                  locale={locale}
                />
              </div>
            ) : (
              <>
                <ChatMessages messages={messages} status={status} />
                {error && (
                  <div className="mx-4 my-2 rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {String((error as Error).message ?? error)}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <ChatInput
        status={isProcessing ? "streaming" : "ready"}
        onSend={handleSend}
        onStop={handleStop}
        disabled={!hasModel}
      />

      <NavBar />
    </div>
  )
}

function SetupBanner({ hasModel, hasDevice }: { hasModel: boolean; hasDevice: boolean }) {
  const { t } = useLocale()
  return (
    <div className="mx-4 mt-3 rounded-md border border-accent/50 bg-accent/5 p-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-1">
        {t("home_setup_required")}
      </div>
      <ul className="text-sm space-y-1.5">
        {!hasModel && (
          <li>
            <Link href="/settings" className="underline underline-offset-4 hover:text-primary">
              {t("home_setup_add_key")}
            </Link>
          </li>
        )}
        {!hasDevice && (
          <li>
            <Link href="/devices" className="underline underline-offset-4 hover:text-primary">
              {t("home_setup_pair_device")}
            </Link>
          </li>
        )}
      </ul>
    </div>
  )
}
