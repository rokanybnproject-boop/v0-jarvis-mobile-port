"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, MessageSquare, Settings, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

const ITEMS = [
  { href: "/", label: "Chat", icon: MessageSquare },
  { href: "/devices", label: "Device", icon: Smartphone },
  { href: "/logs", label: "Logs", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function NavBar() {
  const pathname = usePathname()
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <ul className="flex items-stretch justify-around max-w-md mx-auto">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-mono uppercase tracking-wider transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                <span>{item.label}</span>
                {active && <span className="absolute -top-px h-px w-10 bg-primary shadow-[0_0_8px_currentColor]" />}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
