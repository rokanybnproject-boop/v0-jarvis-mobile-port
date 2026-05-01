"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import useSWR from "swr"
import Link from "next/link"
import { useMemo } from "react"
import { StatusBar } from "@/components/jarvis/status-bar"
import { NavBar } from "@/components/jarvis/nav-bar"
import { ChatMessages } from "@/components/jarvis/chat-messages"
import { ChatInput } from "@/components/jarvis/chat-input"
import { Orb } from "@/components/jarvis/orb"
import type { JarvisConfig, Device } from "@/lib/types"
import { ArrowRight, Sparkles, Zap, Cpu, Cog } from "lucide-react"

const fetcher = (u: string) => fetch(u).then((r) => r.json())

const SUGGESTIONS = [
  { icon: Zap, label: "Run diagnostics on the phone", prompt: "Run a quick diagnostic on the phone — battery, location, wifi, free disk." },
  { icon: Sparkles, label: "Check what's around me", prompt: "Take a photo with the back camera and tell me what you see." },
  { icon: Cog, label: "Speak the time", prompt: "Use TTS to speak the current time out loud." },
  { icon: Cpu, label: "Show me top processes", prompt: "Run `top -b -n1 | head -20` and summarise what's running on the phone." },
]

export default function ChatPage() {
  const { data: config } = useSWR<JarvisConfig>("/api/config", fetcher)
  const { data: devicesData } = useSWR<{ devices: Device[] }>("/api/device/pair", fetcher, {
    refreshInterval: 10000,
  })

  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })

  const orbState = useMemo<"idle" | "thinking" | "executing" | "error">(() => {
    if (status === "error" || error) return "error"
    if (status === "submitted") return "thinking"
    if (status === "streaming") {
      // If a tool call is in flight, mark as executing
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
  }, [status, messages, error])

  const hasModel = Boolean(config?.selectedProvider && config?.selectedModelId)
  const hasDevice = (devicesData?.devices?.length ?? 0) > 0
  const isEmpty = messages.length === 0

  return (
    <div className="relative min-h-dvh flex flex-col">
      <StatusBar />

      <main className="flex-1 mx-auto w-full max-w-md pb-[140px]">
        {!hasModel || !hasDevice ? <SetupBanner hasModel={hasModel} hasDevice={hasDevice} /> : null}

        {isEmpty ? (
          <section className="flex flex-col items-center px-6 pt-6">
            <div className="relative">
              <Orb state={orbState} size={240} />
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-balance text-center">
              At your service
            </h1>
            <p className="mt-2 text-center text-muted-foreground text-pretty max-w-xs">
              Just A Rather Very Intelligent System. Type a command — I&apos;ll handle the phone.
            </p>

            <ul className="mt-8 w-full grid gap-2">
              {SUGGESTIONS.map((s) => (
                <li key={s.label}>
                  <button
                    type="button"
                    onClick={() => sendMessage({ text: s.prompt })}
                    disabled={!hasModel}
                    className="group w-full flex items-center gap-3 px-3 py-3 rounded-md border border-border/60 hover:border-primary/60 hover:bg-card/60 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="grid place-items-center size-8 rounded-sm border border-border/60 text-primary group-hover:border-primary/60">
                      <s.icon className="size-4" />
                    </span>
                    <span className="flex-1 text-sm">{s.label}</span>
                    <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <>
            <div className="flex justify-center pt-4 pb-2">
              <Orb state={orbState} size={72} />
            </div>
            <ChatMessages messages={messages} status={status} />
            {error && (
              <div className="mx-4 my-2 rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {String(error.message ?? error)}
              </div>
            )}
          </>
        )}
      </main>

      <ChatInput
        status={status}
        onSend={(text) => sendMessage({ text })}
        onStop={stop}
        disabled={!hasModel}
        placeholder={hasModel ? "Issue a command, sir." : "Configure a model in Settings to begin."}
      />

      <NavBar />
    </div>
  )
}

function SetupBanner({ hasModel, hasDevice }: { hasModel: boolean; hasDevice: boolean }) {
  return (
    <div className="mx-4 mt-3 rounded-md border border-accent/50 bg-accent/5 p-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-accent mb-1">
        setup required
      </div>
      <ul className="text-sm space-y-1.5">
        {!hasModel && (
          <li>
            <Link href="/settings" className="underline underline-offset-4 hover:text-primary">
              Add an API key and pick a model
            </Link>
          </li>
        )}
        {!hasDevice && (
          <li>
            <Link href="/devices" className="underline underline-offset-4 hover:text-primary">
              Pair your Android phone via Termux
            </Link>
          </li>
        )}
      </ul>
    </div>
  )
}
