"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, MessageSquare, Settings, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLocale } from "./locale-provider"
import { LocaleToggle } from "./locale-toggle"
import type { TranslationKey } from "@/lib/i18n"

const ITEMS: { href: string; labelKey: TranslationKey; icon: React.ElementType }[] = [
  { href: "/", labelKey: "nav_chat", icon: MessageSquare },
  { href: "/devices", labelKey: "nav_device", icon: Smartphone },
  { href: "/logs", labelKey: "nav_logs", icon: Activity },
  { href: "/settings", labelKey: "nav_settings", icon: Settings },
]

export function NavBar() {
  const pathname = usePathname()
  const { t } = useLocale()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label={t("nav_chat")}
    >
      {/* Language toggle sits above the tabs */}
      <div className="flex justify-center pt-1.5 pb-0.5">
        <LocaleToggle />
      </div>

      <ul className="flex items-stretch justify-around max-w-md mx-auto">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <li key={item.href} className="flex-1 relative">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-mono uppercase tracking-wider transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute top-0 inset-x-0 h-px bg-primary shadow-[0_0_8px_currentColor]" />
                )}
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                <span>{t(item.labelKey)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
