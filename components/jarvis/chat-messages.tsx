"use client"

import type { UIMessage } from "ai"
import { useEffect, useRef } from "react"
import { ToolCallCard } from "./tool-call-card"
import { cn } from "@/lib/utils"

interface ChatMessagesProps {
  messages: UIMessage[]
  status: "ready" | "streaming" | "submitted" | "error"
}

export function ChatMessages({ messages, status }: ChatMessagesProps) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, status])

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      {messages.map((m) => (
        <Message key={m.id} message={m} />
      ))}
      {status === "submitted" && (
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-primary">
          <span className="size-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_currentColor]" />
          processing
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}

function Message({ message }: { message: UIMessage }) {
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"

  return (
    <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      {!isUser && (
        <div className="text-[10px] font-mono uppercase tracking-widest text-primary/80">
          jarvis
        </div>
      )}
      <div className={cn("max-w-[88%] flex flex-col gap-2", isUser ? "items-end" : "items-start w-full")}>
        {message.parts?.map((part, idx) => {
          // Plain text
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

          // Reasoning (Anthropic / o-series)
          if (part.type === "reasoning") {
            return (
              <div
                key={idx}
                className="text-xs font-mono text-muted-foreground italic px-3 py-2 border-l-2 border-muted/60"
              >
                {part.text}
              </div>
            )
          }

          // Tool calls — typed as `tool-{name}` or `dynamic-tool`
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
