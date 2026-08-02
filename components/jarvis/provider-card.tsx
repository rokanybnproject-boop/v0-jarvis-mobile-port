"use client"

import { useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Check, ChevronDown, ExternalLink, KeyRound, Loader2, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ModelInfo, ProviderConfig, ProviderId } from "@/lib/types"
import { useLocale } from "./locale-provider"

const fetcher = (u: string) => fetch(u).then((r) => r.json())

interface Props {
  provider: ProviderConfig
  maskedKey?: string
  selectedProvider?: ProviderId
  selectedModelId?: string
  onSelect: (modelId: string) => Promise<void> | void
  onSaveKey: (apiKey: string) => Promise<void>
  onDeleteKey: () => Promise<void>
}

export function ProviderCard({
  provider,
  maskedKey,
  selectedProvider,
  selectedModelId,
  onSelect,
  onSaveKey,
  onDeleteKey,
}: Props) {
  const { t } = useLocale()
  const hasKey = Boolean(maskedKey)
  const [expanded, setExpanded] = useState(hasKey && selectedProvider === provider.id)
  const [editing, setEditing] = useState(false)
  const [keyInput, setKeyInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)

  const { data: modelsData, isLoading: loadingModels } = useSWR<{
    models: ModelInfo[]
    live: boolean
  }>(expanded ? `/api/models?provider=${provider.id}` : null, fetcher)

  async function validateAndSelect(modelId: string) {
    setValidating(true)
    try {
      const res = await fetch("/api/models/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: provider.id, modelId }),
      })
      const result = (await res.json()) as { valid: boolean; message: string }
      if (!result.valid) {
        toast.error(result.message || t("provider_model_invalid"))
        return
      }
      await onSelect(modelId)
      toast.success(t("provider_model_validated", { model: modelId }))
    } catch (err) {
      toast.error(
        t("provider_validate_failed", { error: (err as Error).message }),
      )
    } finally {
      setValidating(false)
    }
  }

  async function handleSave() {
    if (!keyInput.trim()) return
    setSaving(true)
    try {
      console.log("[v0] Saving API key for provider:", provider.id)
      await onSaveKey(keyInput.trim())
      setEditing(false)
      setKeyInput("")
      setExpanded(true)
      toast.success(t("provider_key_saved", { name: provider.name }))
    } catch (err) {
      console.error("[v0] Save key error:", err)
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      toast.error(`${t("provider_save_failed")} ${errorMsg}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(t("provider_remove_confirm", { name: provider.name }))) return
    await onDeleteKey()
    setExpanded(false)
    toast.success(t("provider_key_removed", { name: provider.name }))
  }

  return (
    <div className="rounded-md border border-border/60 bg-card/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-3 py-3 text-start"
      >
        <div
          className={cn(
            "shrink-0 grid place-items-center size-8 rounded-sm border font-mono text-xs uppercase",
            hasKey
              ? "border-primary/60 text-primary"
              : "border-border text-muted-foreground",
          )}
        >
          {provider.id.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{provider.name}</span>
            {selectedProvider === provider.id && selectedModelId && (
              <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-primary/15 text-primary border border-primary/40">
                {t("provider_active")}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate font-mono" dir="ltr">
            {hasKey ? maskedKey : provider.description}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-border/60 px-3 py-3 space-y-3 bg-background/40">
          {!hasKey || editing ? (
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {t("provider_api_key_label")}
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 flex items-center gap-2 rounded-sm border border-border/60 bg-input px-2.5 py-2 focus-within:border-primary/60"
                  dir="ltr"
                >
                  <KeyRound className="size-3.5 text-muted-foreground" />
                  <input
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="sk-..."
                    className="flex-1 bg-transparent text-sm font-mono outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !keyInput.trim()}
                  className="px-3 py-2 rounded-sm border border-primary text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 text-sm font-medium"
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : t("provider_save")}
                </button>
              </div>
              <a
                href={provider.apiKeyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                {t("provider_get_key")} {provider.name}
                <ExternalLink className="size-3" />
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(true)
                  setKeyInput("")
                }}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                {t("provider_replace")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
                {t("provider_remove")}
              </button>
            </div>
          )}

          {hasKey && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {t("provider_models")}{" "}
                  {modelsData?.live ? t("provider_live") : t("provider_preset")}
                </label>
                {loadingModels && (
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="grid gap-1 max-h-72 overflow-y-auto pr-1">
                {(modelsData?.models ?? []).map((m) => {
                  const active =
                    selectedProvider === provider.id && selectedModelId === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => validateAndSelect(m.id)}
                      disabled={validating}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-2 rounded-sm border text-start text-sm transition-colors disabled:opacity-50",
                        active
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/60 hover:border-primary/40 hover:bg-card/60",
                      )}
                    >
                      <span className="flex-1 truncate font-mono text-xs" dir="ltr">
                        {m.id}
                      </span>
                      {validating ? (
                        <Loader2 className="size-4 shrink-0 animate-spin" />
                      ) : active ? (
                        <Check className="size-4 shrink-0" />
                      ) : null}
                    </button>
                  )
                })}
                {!loadingModels && (modelsData?.models ?? []).length === 0 && (
                  <div className="text-xs text-muted-foreground py-2">
                    {t("provider_no_models")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
