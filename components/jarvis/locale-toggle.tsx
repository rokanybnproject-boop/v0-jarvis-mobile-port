"use client"

import { Languages } from "lucide-react"
import { useLocale } from "./locale-provider"
import { LOCALES } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale()
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-sm border border-border/60 p-0.5",
        className,
      )}
      role="group"
      aria-label={t("locale_switch")}
    >
      <Languages className="size-3 text-muted-foreground mx-1.5" aria-hidden />
      {LOCALES.map((l) => {
        const active = l.code === locale
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLocale(l.code)}
            className={cn(
              "px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-widest transition-colors",
              active
                ? "bg-primary/15 text-primary border border-primary/40"
                : "text-muted-foreground hover:text-foreground border border-transparent",
            )}
            aria-pressed={active}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}
