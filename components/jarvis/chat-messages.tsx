"use client"

import type { UIMessage } from "ai"
import { useEffect, useRef, useState, useCallback } from "react"
import { Volume2, Loader2 } from "lucide-react"
import { ToolCallCard } from "./tool-call-card"
import { useLocale } from "./locale-provider"
import { cn } from "@/lib/utils"

interface ChatMessagesProps {
  messages: UIMessage[]
  status: "ready" | "streaming" | "submitted" | "error"
  voiceEnabled?: boolean
  autoPlay?: boolean
}

export function ChatMessages({ messages, status, voiceEnabled, autoPlay }: ChatMessagesProps) {
  const { t, dir } = useLocale()
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, status])

  return (
    <div className="flex flex-col gap-5 px-4 py-4" dir={dir}>
      {messages.map((m) => (
        <Message key={m.id} message={m} voiceEnabled={voiceEnabled} autoPlay={autoPlay} />
      ))}
      {status === "submitted" && (
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-primary">
          <span className="size-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_currentColor]" />
          {t("chat_processing")}
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}

function Message({ message, voiceEnabled, autoPlay }: { message: UIMessage; voiceEnabled?: boolean; autoPlay?: boolean }) {
  const { t } = useLocale()
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const textContent = message.parts
    ?.filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join(" ")

  const playVoice = useCallback(async () => {
    if (!textContent || playing) return
    setPlaying(true)
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: textContent.slice(0, 2000) }),
      })
      if (!res.ok) throw new Error("TTS failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setPlaying(false)
        URL.revokeObjectURL(url)
      }
      audio.play()
    } catch {
      setPlaying(false)
    }
  }, [textContent, playing])

  // Auto-play voice if enabled and message is from assistant
  useEffect(() => {
    if (autoPlay && voiceEnabled && isAssistant && textContent && !playing) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => playVoice(), 100)
      return () => clearTimeout(timer)
    }
  }, [autoPlay, voiceEnabled, isAssistant, textContent, playing, playVoice])

  return (
    <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      {!isUser && (
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-primary/80">
            {t("chat_label_jarvis")}
          </div>
          {voiceEnabled && textContent && (
            <button
              type="button"
              onClick={playVoice}
              disabled={playing}
              className="p-1 rounded-sm text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors"
              title={t("voice_play")}
            >
              {playing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Volume2 className="size-3.5" />
              )}
            </button>
          )}
        </div>
      )}
      <div
        className={cn(
          "max-w-[88%] flex flex-col gap-2",
          isUser ? "items-end" : "items-start w-full",
        )}
      >
        {message.parts?.map((part, idx) => {
          if (part.type === "text") {
            return (
              <div
                key={idx}
                className={cn(
                  "rounded-md px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words",
                  isUser
                    ? "bg-primary/15 border border-primary/40 text-foreground"
                    : "bg-card/60 border border-border/60 text-foreground",
                )}
              >
                {part.text}
              </div>
            )
          }

          if (part.type === "reasoning") {
            return (
              <div
                key={idx}
                className="text-xs font-mono text-muted-foreground italic px-3 py-2 border-s-2 border-muted/60"
              >
                {part.text}
              </div>
            )
          }

          if (part.type?.startsWith("tool-") || part.type === "dynamic-tool") {
            const toolName =
              part.type === "dynamic-tool"
                ? (part as unknown as { toolName: string }).toolName
                : part.type.replace(/^tool-/, "")
            const p = part as unknown as {
              state: "input-streaming" | "input-available" | "output-available" | "output-error"
              input?: unknown
              output?: unknown
              errorText?: string
            }
            return (
              <div key={idx} className="w-full">
                <ToolCallCard
                  toolName={toolName}
                  state={p.state}
                  input={p.input}
                  output={p.output}
                  errorText={p.errorText}
                />
              </div>
            )
          }

          return null
        })}
        {isAssistant && (!message.parts || message.parts.length === 0) && (
          <div className="text-xs font-mono text-muted-foreground">…</div>
        )}
      </div>
    </div>
  )
}
