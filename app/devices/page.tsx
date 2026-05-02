"use client"

import useSWR, { mutate } from "swr"
import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Copy,
  Plus,
  Smartphone,
  Trash2,
  Terminal,
  ExternalLink,
  CheckCircle2,
} from "lucide-react"
import { StatusBar } from "@/components/jarvis/status-bar"
import { NavBar } from "@/components/jarvis/nav-bar"
import { useLocale } from "@/components/jarvis/locale-provider"
import { cn } from "@/lib/utils"
import type { Device } from "@/lib/types"

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export default function DevicesPage() {
  const { t } = useLocale()
  const { data } = useSWR<{ devices: Device[] }>("/api/device/pair", fetcher, {
    refreshInterval: 5000,
  })
  const [newKey, setNewKey] = useState<{
    deviceId: string
    pairKey: string
    name: string
  } | null>(null)
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)

  async function createDevice() {
    setCreating(true)
    try {
      const res = await fetch("/api/device/pair", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || t("devices_name_placeholder") }),
      })
      const json = await res.json()
      setNewKey(json)
      setName("")
      mutate("/api/device/pair")
      toast.success(t("devices_minted", { name: json.name }))
    } finally {
      setCreating(false)
    }
  }

  async function deleteDevice(id: string) {
    if (!confirm(t("devices_unpair_confirm"))) return
    await fetch(`/api/device/pair?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    mutate("/api/device/pair")
    toast.success(t("devices_unpaired"))
  }

  function copy(text: string, label: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(t("devices_copied", { label })))
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

  return (
    <div className="relative min-h-dvh flex flex-col">
      <StatusBar />

      <main className="flex-1 mx-auto w-full max-w-md px-4 pt-4 pb-[140px]">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="grid place-items-center size-8 rounded-sm border border-border/60 hover:border-primary/60 hover:text-primary transition-colors"
            aria-label={t("back")}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">{t("devices_title")}</h1>
        </div>

        {/* Pair new device */}
        <section className="mb-6">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            {t("devices_section_pair")}
          </h2>
          <div className="rounded-md border border-border/60 bg-card/40 p-3">
            <p className="text-sm text-muted-foreground text-pretty mb-3">
              {t("devices_pair_desc")}
            </p>
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("devices_name_placeholder")}
                className="flex-1 bg-input border border-border/60 rounded-sm px-2.5 py-2 text-sm outline-none focus:border-primary/60"
              />
              <button
                type="button"
                onClick={createDevice}
                disabled={creating}
                className="px-3 py-2 rounded-sm border border-primary text-primary bg-primary/10 hover:bg-primary/20 inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="size-4" />
                <span className="text-sm">{t("devices_mint")}</span>
              </button>
            </div>
          </div>

          {newKey && (
            <PairKeyReveal
              newKey={newKey}
              baseUrl={baseUrl}
              onCopy={copy}
              onClose={() => setNewKey(null)}
            />
          )}
        </section>

        {/* Existing paired devices */}
        <section className="mb-6">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            {t("devices_section_paired")}
          </h2>
          <div className="flex flex-col gap-2">
            {(data?.devices ?? []).length === 0 && (
              <div className="rounded-md border border-dashed border-border/60 bg-card/20 p-6 text-center text-sm text-muted-foreground">
                {t("devices_none")}
              </div>
            )}
            {(data?.devices ?? []).map((d) => (
              <div
                key={d.id}
                className="rounded-md border border-border/60 bg-card/40 p-3 flex items-center gap-3"
              >
                <div
                  className={cn(
                    "shrink-0 grid place-items-center size-9 rounded-sm border",
                    d.status === "online"
                      ? "border-primary/60 text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  <Smartphone className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {d.name}
                    <span
                      className={cn(
                        "text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-sm border",
                        d.status === "online"
                          ? "border-primary/40 text-primary bg-primary/10"
                          : d.status === "offline"
                            ? "border-accent/40 text-accent bg-accent/10"
                            : "border-border text-muted-foreground",
                      )}
                    >
                      {d.status === "online"
                        ? t("devices_status_online")
                        : d.status === "offline"
                          ? t("devices_status_offline")
                          : t("devices_status_unknown")}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate" dir="ltr">
                    {d.id} · {t("devices_last_seen")}{" "}
                    {d.lastSeen ? new Date(d.lastSeen).toLocaleTimeString() : t("devices_never")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteDevice(d.id)}
                  className="shrink-0 grid place-items-center size-8 rounded-sm border border-border/60 text-muted-foreground hover:border-destructive/60 hover:text-destructive transition-colors"
                  aria-label={t("devices_unpair")}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Termux Setup Guide */}
        <section className="mb-6">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            {t("devices_section_setup")}
          </h2>
          <ol className="rounded-md border border-border/60 bg-card/40 p-3 text-sm space-y-4 list-decimal ps-5">
            <li>
              {t("devices_setup_step1_pre")}{" "}
              <a
                href="https://f-droid.org/packages/com.termux/"
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                Termux <ExternalLink className="size-3" />
              </a>{" "}
              {t("devices_setup_step1_and")}{" "}
              <a
                href="https://f-droid.org/packages/com.termux.api/"
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                Termux:API <ExternalLink className="size-3" />
              </a>{" "}
              {t("devices_setup_step1_post")}
            </li>
            <li>
              {t("devices_setup_step2")}
              <CodeBlock
                onCopy={copy}
                text="pkg update -y && pkg install -y termux-api curl jq termux-tools"
              />
            </li>
            <li>
              {t("devices_setup_step3")}
              <CodeBlock onCopy={copy} text="termux-setup-storage" />
            </li>
            <li>
              {t("devices_setup_step4")}{" "}
              <code className="font-mono text-xs px-1 rounded bg-muted">
                termux-wake-lock
              </code>{" "}
              {t("devices_setup_keep_awake")}
            </li>
          </ol>
        </section>
      </main>

      <NavBar />
    </div>
  )
}

function PairKeyReveal({
  newKey,
  baseUrl,
  onCopy,
  onClose,
}: {
  newKey: { deviceId: string; pairKey: string; name: string }
  baseUrl: string
  onCopy: (text: string, label: string) => void
  onClose: () => void
}) {
  const { t } = useLocale()

  const installCmd = `curl -fsSL '${baseUrl}/jarvis-arm.sh' -o ~/jarvis-arm.sh && chmod +x ~/jarvis-arm.sh && JARVIS_URL='${baseUrl}' JARVIS_DEVICE_ID='${newKey.deviceId}' JARVIS_PAIR_KEY='${newKey.pairKey}' bash ~/jarvis-arm.sh`
  const envBlock = `export JARVIS_URL='${baseUrl}'
export JARVIS_DEVICE_ID='${newKey.deviceId}'
export JARVIS_PAIR_KEY='${newKey.pairKey}'`

  return (
    <div className="mt-3 rounded-md border border-primary/60 bg-primary/5 p-3">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="size-4 text-primary" />
        <div className="text-sm font-medium">{t("devices_minted", { name: newKey.name })}</div>
      </div>
      <p className="text-xs text-muted-foreground mb-3 text-pretty">
        {t("devices_save_now")}
      </p>

      <div className="space-y-2">
        <Field label={t("devices_field_id")} value={newKey.deviceId} onCopy={onCopy} />
        <Field label={t("devices_field_key")} value={newKey.pairKey} onCopy={onCopy} mono />
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
            <Terminal className="size-3" /> {t("devices_install_oneliner")}
          </div>
          <CodeBlock onCopy={onCopy} text={installCmd} />
        </div>
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-primary">
            {t("devices_env_manual")}
          </summary>
          <CodeBlock onCopy={onCopy} text={envBlock} className="mt-2" />
        </details>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          {t("devices_dismiss")}
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  mono,
  onCopy,
}: {
  label: string
  value: string
  mono?: boolean
  onCopy: (text: string, label: string) => void
}) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2 rounded-sm border border-border/60 bg-input px-2.5 py-1.5">
        <code className={cn("flex-1 text-xs truncate", mono && "font-mono")} dir="ltr">
          {value}
        </code>
        <button
          type="button"
          onClick={() => onCopy(value, label)}
          className="shrink-0 text-muted-foreground hover:text-primary"
          aria-label={`Copy ${label}`}
        >
          <Copy className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function CodeBlock({
  text,
  onCopy,
  className,
}: {
  text: string
  onCopy: (text: string, label: string) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative rounded-sm border border-border/60 bg-input/60 p-2.5 mt-1",
        className,
      )}
    >
      <pre
        className="text-[11px] font-mono text-foreground/90 overflow-x-auto whitespace-pre-wrap break-all pe-7"
        dir="ltr"
      >
        {text}
      </pre>
      <button
        type="button"
        onClick={() => onCopy(text, "Command")}
        className="absolute top-1.5 end-1.5 grid place-items-center size-6 rounded-sm border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/60 bg-background/80"
        aria-label="Copy"
      >
        <Copy className="size-3" />
      </button>
    </div>
  )
}
