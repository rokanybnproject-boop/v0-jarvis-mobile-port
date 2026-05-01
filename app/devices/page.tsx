"use client"

import useSWR, { mutate } from "swr"
import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Copy, Plus, Smartphone, Trash2, Terminal, ExternalLink, CheckCircle2 } from "lucide-react"
import { StatusBar } from "@/components/jarvis/status-bar"
import { NavBar } from "@/components/jarvis/nav-bar"
import { cn } from "@/lib/utils"
import type { Device } from "@/lib/types"

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export default function DevicesPage() {
  const { data } = useSWR<{ devices: Device[] }>("/api/device/pair", fetcher, { refreshInterval: 5000 })
  const [newKey, setNewKey] = useState<{ deviceId: string; pairKey: string; name: string } | null>(null)
  const [name, setName] = useState("")
  const [creating, setCreating] = useState(false)

  async function createDevice() {
    setCreating(true)
    try {
      const res = await fetch("/api/device/pair", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "My Phone" }),
      })
      const json = await res.json()
      setNewKey(json)
      setName("")
      mutate("/api/device/pair")
    } finally {
      setCreating(false)
    }
  }

  async function deleteDevice(id: string) {
    if (!confirm("Unpair this device?")) return
    await fetch(`/api/device/pair?id=${encodeURIComponent(id)}`, { method: "DELETE" })
    mutate("/api/device/pair")
    toast.success("Device unpaired")
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`))
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

  return (
    <div className="relative min-h-dvh flex flex-col">
      <StatusBar />

      <main className="flex-1 mx-auto w-full max-w-md px-4 pt-4 pb-[120px]">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="grid place-items-center size-8 rounded-sm border border-border/60 hover:border-primary/60 hover:text-primary transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">Devices</h1>
        </div>

        {/* Pair new */}
        <section className="mb-6">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Pair a new arm
          </h2>
          <div className="rounded-md border border-border/60 bg-card/40 p-3">
            <p className="text-sm text-muted-foreground text-pretty mb-3">
              Mint a fresh device + pair key, then run the script in Termux on your phone. The key is shown
              once — copy it now.
            </p>
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Phone"
                className="flex-1 bg-input border border-border/60 rounded-sm px-2.5 py-2 text-sm outline-none focus:border-primary/60"
              />
              <button
                type="button"
                onClick={createDevice}
                disabled={creating}
                className="px-3 py-2 rounded-sm border border-primary text-primary bg-primary/10 hover:bg-primary/20 inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="size-4" />
                <span className="text-sm">Mint</span>
              </button>
            </div>
          </div>

          {newKey && <PairKeyReveal newKey={newKey} baseUrl={baseUrl} onCopy={copy} onClose={() => setNewKey(null)} />}
        </section>

        {/* Existing devices */}
        <section className="mb-6">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Paired arms
          </h2>
          <div className="flex flex-col gap-2">
            {(data?.devices ?? []).length === 0 && (
              <div className="rounded-md border border-dashed border-border/60 bg-card/20 p-6 text-center text-sm text-muted-foreground">
                No devices paired yet.
              </div>
            )}
            {(data?.devices ?? []).map((d) => (
              <div key={d.id} className="rounded-md border border-border/60 bg-card/40 p-3 flex items-center gap-3">
                <div
                  className={cn(
                    "shrink-0 grid place-items-center size-9 rounded-sm border",
                    d.status === "online" ? "border-primary/60 text-primary" : "border-border text-muted-foreground",
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
                      {d.status ?? "unknown"}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate">
                    {d.id} · last seen {d.lastSeen ? new Date(d.lastSeen).toLocaleTimeString() : "never"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteDevice(d.id)}
                  className="shrink-0 grid place-items-center size-8 rounded-sm border border-border/60 text-muted-foreground hover:border-destructive/60 hover:text-destructive transition-colors"
                  aria-label="Unpair"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Setup guide */}
        <section className="mb-6">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Termux setup guide
          </h2>
          <ol className="rounded-md border border-border/60 bg-card/40 p-3 text-sm space-y-3 list-decimal pl-5">
            <li>
              Install <a href="https://f-droid.org/packages/com.termux/" target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">Termux<ExternalLink className="size-3" /></a> and{" "}
              <a href="https://f-droid.org/packages/com.termux.api/" target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">Termux:API<ExternalLink className="size-3" /></a> from F-Droid.
            </li>
            <li>
              In Termux, run:
              <CodeBlock onCopy={copy} text={`pkg update -y && pkg install -y termux-api curl jq termux-tools`} />
            </li>
            <li>Grant storage and permissions: <CodeBlock onCopy={copy} text={`termux-setup-storage`} /></li>
            <li>
              Mint a device above, copy the install command, paste it into Termux. The script runs forever in
              the foreground — keep Termux open or use <code className="font-mono text-xs px-1 rounded bg-muted">termux-wake-lock</code>.
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
  const installCmd = `curl -fsSL ${baseUrl}/jarvis-arm.sh | JARVIS_URL='${baseUrl}' JARVIS_DEVICE_ID='${newKey.deviceId}' JARVIS_PAIR_KEY='${newKey.pairKey}' bash`
  const envBlock = `export JARVIS_URL='${baseUrl}'
export JARVIS_DEVICE_ID='${newKey.deviceId}'
export JARVIS_PAIR_KEY='${newKey.pairKey}'`

  return (
    <div className="mt-3 rounded-md border border-primary/60 bg-primary/5 p-3">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="size-4 text-primary" />
        <div className="text-sm font-medium">Device minted: {newKey.name}</div>
      </div>
      <p className="text-xs text-muted-foreground mb-3 text-pretty">
        Save this key now — it will not be shown again. Run the command below in Termux to wire up the arm.
      </p>

      <div className="space-y-2">
        <Field label="Device ID" value={newKey.deviceId} onCopy={onCopy} />
        <Field label="Pair key" value={newKey.pairKey} onCopy={onCopy} mono />
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1">
            <Terminal className="size-3" /> One-line install
          </div>
          <CodeBlock onCopy={onCopy} text={installCmd} />
        </div>
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-primary">Or set env vars manually</summary>
          <CodeBlock onCopy={onCopy} text={envBlock} className="mt-2" />
        </details>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          Got it, hide
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
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2 rounded-sm border border-border/60 bg-input px-2.5 py-1.5">
        <code className={cn("flex-1 text-xs truncate", mono && "font-mono")}>{value}</code>
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
    <div className={cn("relative rounded-sm border border-border/60 bg-input/60 p-2.5 mt-1", className)}>
      <pre className="text-[11px] font-mono text-foreground/90 overflow-x-auto whitespace-pre-wrap break-all pr-7">
        {text}
      </pre>
      <button
        type="button"
        onClick={() => onCopy(text, "Command")}
        className="absolute top-1.5 right-1.5 grid place-items-center size-6 rounded-sm border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/60 bg-background/80"
        aria-label="Copy"
      >
        <Copy className="size-3" />
      </button>
    </div>
  )
}
