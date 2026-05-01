"use client"

import { useState } from "react"
import { ChevronDown, CheckCircle2, AlertOctagon, Loader2, Terminal } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocale } from "./locale-provider"

interface ToolCallCardProps {
  toolName: string
  state: "input-streaming" | "input-available" | "output-available" | "output-error"
  input?: unknown
  output?: unknown
  errorText?: string
}

export function ToolCallCard({ toolName, state, input, output, errorText }: ToolCallCardProps) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)

  const isRunning = state === "input-streaming" || state === "input-available"
  const isError =
    state === "output-error" ||
    (output &&
      typeof output === "object" &&
      (output as { ok?: boolean }).ok === false)

  const args = (input as Record<string, unknown> | undefined) ?? {}
  const kind = (args.kind as string) || toolName
  const intent = (args.intent as string) || ""

  const StateIcon = isRunning ? Loader2 : isError ? AlertOctagon : CheckCircle2

  return (
    <div
      className={cn(
        "group relative my-2 rounded-md border bg-card/40 backdrop-blur-sm overflow-hidden",
        isRunning && "border-accent/60",
        !isRunning && !isError && "border-primary/40",
        isError && "border-destructive/60",
      )}
    >
      {/* Top scanline */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-px",
          isRunning && "bg-accent shadow-[0_0_8px_currentColor] text-accent",
          !isRunning && !isError && "bg-primary shadow-[0_0_8px_currentColor] text-primary",
          isError && "bg-destructive text-destructive",
        )}
      />

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-start"
      >
        <div
          className={cn(
            "shrink-0 grid place-items-center size-7 rounded-sm border",
            isRunning && "border-accent/60 text-accent",
            !isRunning && !isError && "border-primary/40 text-primary",
            isError && "border-destructive/60 text-destructive",
          )}
        >
          <StateIcon className={cn("size-4", isRunning && "animate-spin")} />
        </div>
        <div className="flex-1 min-w-0" dir="ltr">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <Terminal className="size-3" />
            <span>{toolName === "device_command" ? t("tool_device") : toolName}</span>
            <span className="text-foreground/80">{kind}</span>
          </div>
          {intent && (
            <div className="text-sm font-medium truncate text-foreground/95">{intent}</div>
          )}
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border/60 px-3 py-2.5 space-y-2 bg-background/50" dir="ltr">
          {Object.keys(args).length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                {t("tool_args")}
              </div>
              <pre className="text-xs font-mono text-foreground/85 overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(args, null, 2)}
              </pre>
            </div>
          )}
          {output != null && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                {t("tool_result")}
              </div>
              <pre
                className={cn(
                  "text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words",
                  isError ? "text-destructive" : "text-foreground/85",
                )}
              >
                {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
          {errorText && (
            <div className="text-xs font-mono text-destructive">{errorText}</div>
          )}
        </div>
      )}
    </div>
  )
}
