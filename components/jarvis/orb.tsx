"use client"

import { cn } from "@/lib/utils"

interface OrbProps {
  state: "idle" | "thinking" | "executing" | "error"
  size?: number
  className?: string
}

export function Orb({ state, size = 200, className }: OrbProps) {
  const colorClass =
    state === "executing"
      ? "text-accent"
      : state === "error"
        ? "text-destructive"
        : "text-primary"

  return (
    <div
      className={cn("relative", colorClass, className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Outer rotating ring */}
      <svg
        viewBox="0 0 200 200"
        className={cn("absolute inset-0 size-full", state !== "idle" && "jarvis-spin-slow")}
      >
        <defs>
          <linearGradient id="orb-grad-outer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r="94"
          fill="none"
          stroke="url(#orb-grad-outer)"
          strokeWidth="1.2"
          strokeDasharray="2 6 40 6 80 6"
        />
        <circle cx="100" cy="6" r="2.5" fill="currentColor" />
      </svg>

      {/* Middle counter-rotating ring */}
      <svg
        viewBox="0 0 200 200"
        className={cn("absolute inset-0 size-full", state !== "idle" && "jarvis-spin-reverse")}
      >
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="0.8"
          strokeDasharray="1 3"
        />
        <circle
          cx="100"
          cy="100"
          r="68"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="0.6"
          strokeDasharray="20 4 8 4"
        />
        <g transform="translate(100,22)">
          <rect x="-8" y="-3" width="16" height="6" fill="currentColor" opacity="0.7" />
        </g>
        <g transform="translate(100,178)">
          <rect x="-8" y="-3" width="16" height="6" fill="currentColor" opacity="0.7" />
        </g>
      </svg>

      {/* Inner pulsing core */}
      <div className="absolute inset-0 grid place-items-center">
        <div
          className={cn(
            "rounded-full bg-current/15 backdrop-blur-sm",
            "ring-1 ring-current/40",
            state !== "idle" && "jarvis-pulse",
          )}
          style={{ width: size * 0.5, height: size * 0.5 }}
        >
          <div className="size-full rounded-full grid place-items-center">
            <div
              className="rounded-full bg-current"
              style={{
                width: size * 0.18,
                height: size * 0.18,
                boxShadow: `0 0 ${size * 0.1}px currentColor, 0 0 ${size * 0.25}px currentColor`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Cross hairlines */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full">
        <line x1="0" y1="100" x2="20" y2="100" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.5" />
        <line x1="180" y1="100" x2="200" y2="100" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.5" />
        <line x1="100" y1="0" x2="100" y2="20" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.5" />
        <line x1="100" y1="180" x2="100" y2="200" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.5" />
      </svg>
    </div>
  )
}
