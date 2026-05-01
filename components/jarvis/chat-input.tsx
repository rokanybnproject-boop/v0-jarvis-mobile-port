"use client"

import { useState, useRef, useEffect, type FormEvent } from "react"
import { ArrowUp, Square } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSend: (text: string) => void
  onStop?: () => void
  status: "ready" | "streaming" | "submitted" | "error"
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, onStop, status, disabled, placeholder }: ChatInputProps) {
  const [text, setText] = useState("")
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize the textarea up to 6 lines
  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px"
  }, [text])

  const isWorking = status === "streaming" || status === "submitted"

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || isWorking) return
    onSend(t)
    setText("")
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 px-3 pb-3 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent"
    >
      <div
        className={cn(
          "mx-auto max-w-md flex items-end gap-2 rounded-md border bg-card/70 backdrop-blur-xl px-3 py-2.5",
          "border-border/60 focus-within:border-primary/60 transition-colors",
        )}
      >
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e as unknown as FormEvent)
            }
          }}
          rows={1}
          disabled={disabled}
          placeholder={placeholder ?? "Issue a command, sir."}
          className="flex-1 resize-none bg-transparent text-[15px] leading-6 outline-none placeholder:text-muted-foreground/70 disabled:opacity-50"
        />
        {isWorking && onStop ? (
          <button
            type="button"
            onClick={onStop}
            className="shrink-0 grid place-items-center size-9 rounded-sm border border-accent/60 text-accent hover:bg-accent/10 transition-colors"
            aria-label="Stop"
          >
            <Square className="size-4" fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!text.trim() || disabled}
            className={cn(
              "shrink-0 grid place-items-center size-9 rounded-sm border transition-colors",
              text.trim() && !disabled
                ? "border-primary text-primary-foreground bg-primary hover:bg-primary/90"
                : "border-border text-muted-foreground",
            )}
            aria-label="Send"
          >
            <ArrowUp className="size-4" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </form>
  )
}
