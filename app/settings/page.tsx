"use client"

import useSWR, { mutate } from "swr"
import { useState } from "react"
import { toast } from "sonner"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
import Link from "next/link"
import { StatusBar } from "@/components/jarvis/status-bar"
import { NavBar } from "@/components/jarvis/nav-bar"
import { ProviderCard } from "@/components/jarvis/provider-card"
import { PROVIDERS } from "@/lib/providers"
import type { JarvisConfig, ProviderId } from "@/lib/types"

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export default function SettingsPage() {
  const { data: config } = useSWR<JarvisConfig>("/api/config", fetcher)

  const [editingPrompt, setEditingPrompt] = useState(false)
  const [promptDraft, setPromptDraft] = useState<string>("")

  async function patchConfig(patch: Partial<JarvisConfig> & { deleteKey?: ProviderId }) {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error(await res.text())
    await mutate("/api/config")
    await mutate("/api/models")
  }

  async function handleSelectModel(provider: ProviderId, modelId: string) {
    await patchConfig({ selectedProvider: provider, selectedModelId: modelId })
    toast.success(`Model set: ${provider}/${modelId}`)
  }

  async function handleSaveKey(provider: ProviderId, apiKey: string) {
    await patchConfig({ apiKeys: { [provider]: apiKey } })
    await mutate(`/api/models?provider=${provider}`)
  }

  async function handleDeleteKey(provider: ProviderId) {
    await patchConfig({ deleteKey: provider })
    await mutate(`/api/models?provider=${provider}`)
  }

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
          <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        </div>

        <section className="mb-6">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Brain
          </h2>
          <p className="text-xs text-muted-foreground mb-3 text-pretty">
            Bring your own API key for any provider. Your key is encrypted at rest and only used server-side
            to talk to the model.
          </p>
          <div className="flex flex-col gap-2">
            {(Object.values(PROVIDERS)).map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                maskedKey={config?.apiKeys?.[p.id]}
                selectedProvider={config?.selectedProvider}
                selectedModelId={config?.selectedModelId}
                onSelect={(modelId) => handleSelectModel(p.id, modelId)}
                onSaveKey={(apiKey) => handleSaveKey(p.id, apiKey)}
                onDeleteKey={() => handleDeleteKey(p.id)}
              />
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Personality
          </h2>
          {!editingPrompt ? (
            <div className="rounded-md border border-border/60 bg-card/40 p-3">
              <pre className="text-xs font-mono text-foreground/85 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                {config?.systemPrompt ?? ""}
              </pre>
              <button
                type="button"
                onClick={() => {
                  setPromptDraft(config?.systemPrompt ?? "")
                  setEditingPrompt(true)
                }}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Edit system prompt
              </button>
            </div>
          ) : (
            <div className="rounded-md border border-border/60 bg-card/40 p-3 space-y-2">
              <textarea
                value={promptDraft}
                onChange={(e) => setPromptDraft(e.target.value)}
                rows={12}
                className="w-full bg-input rounded-sm p-2.5 text-xs font-mono outline-none border border-border/60 focus:border-primary/60 resize-y"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPrompt(false)}
                  className="px-3 py-1.5 text-xs rounded-sm border border-border/60 hover:border-primary/60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await patchConfig({ systemPrompt: promptDraft })
                    setEditingPrompt(false)
                    toast.success("System prompt updated")
                  }}
                  className="px-3 py-1.5 text-xs rounded-sm border border-primary text-primary bg-primary/10 hover:bg-primary/20 inline-flex items-center gap-1"
                >
                  <Save className="size-3.5" />
                  Save
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="mb-6">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Trust mode
          </h2>
          <div className="rounded-md border border-border/60 bg-card/40 p-3 flex items-start gap-3">
            <input
              type="checkbox"
              id="full-trust"
              checked={config?.fullTrustMode ?? true}
              onChange={(e) => patchConfig({ fullTrustMode: e.target.checked })}
              className="mt-1 size-4 accent-[oklch(0.82_0.16_210)]"
            />
            <label htmlFor="full-trust" className="text-sm flex-1 leading-snug">
              <div className="font-medium">Full trust</div>
              <div className="text-xs text-muted-foreground mt-0.5 text-pretty">
                Jarvis executes commands immediately without confirmation. Disable this to require manual
                approval for destructive actions.
              </div>
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Danger zone
          </h2>
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Wipe long-term memory</div>
              <div className="text-xs text-muted-foreground">Forgets everything Jarvis remembers about you.</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!confirm("Wipe all stored memories?")) return
                await fetch("/api/memory", { method: "DELETE" })
                toast.success("Memory wiped")
              }}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-sm border border-destructive/60 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              Wipe
            </button>
          </div>
        </section>
      </main>

      <NavBar />
    </div>
  )
}
