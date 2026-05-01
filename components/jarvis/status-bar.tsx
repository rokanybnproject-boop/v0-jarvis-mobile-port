"use client"

import useSWR from "swr"
import Link from "next/link"
import { Cpu, Smartphone, AlertTriangle } from "lucide-react"
import type { Device, JarvisConfig } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function StatusBar() {
  const { data: config } = useSWR<JarvisConfig>("/api/config", fetcher, { refreshInterval: 0 })
  const { data: devicesData } = useSWR<{ devices: Device[] }>("/api/device/pair", fetcher, {
    refreshInterval: 5000,
  })

  const onlineDevice = devicesData?.devices?.find((d) => d.status === "online")
  const anyDevice = devicesData?.devices?.[0]
  const device = onlineDevice ?? anyDevice
  const hasModel = Boolean(config?.selectedProvider && config?.selectedModelId)

  return (
    <header
      className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]"
      aria-label="System status"
    >
      <div className="mx-auto max-w-md flex items-center gap-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest">
        <Link
          href="/settings"
          className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-border/60 hover:border-primary/60 hover:text-primary transition-colors"
          title="Model"
        >
          <Cpu className="size-3" />
          <span className="truncate max-w-[140px]">
            {hasModel ? `${config!.selectedProvider}/${config!.selectedModelId}` : "no model"}
          </span>
        </Link>

        <div className="flex-1" />

        <Link
          href="/devices"
          className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-border/60 hover:border-primary/60 transition-colors"
          title="Device"
        >
          {device?.status === "online" ? (
            <>
              <span className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_currentColor] text-primary" />
              <Smartphone className="size-3 text-primary" />
              <span className="text-primary truncate max-w-[80px]">{device.name}</span>
            </>
          ) : device ? (
            <>
              <span className="size-1.5 rounded-full bg-accent" />
              <Smartphone className="size-3 text-accent" />
              <span className="text-accent">offline</span>
            </>
          ) : (
            <>
              <AlertTriangle className="size-3 text-destructive" />
              <span className="text-destructive">no arm</span>
            </>
          )}
        </Link>
      </div>
    </header>
  )
}
