"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Volume2, VolumeX, Save, Play, Loader2, ExternalLink } from "lucide-react"
import { useLocale } from "./locale-provider"
import type { VoiceConfig } from "@/lib/types"
import { cn } from "@/lib/utils"

interface VoiceCardProps {
  voice?: VoiceConfig
  onSave: (voice: Partial<VoiceConfig>) => Promise<void>
}

export function VoiceCard({ voice, onSave }: VoiceCardProps) {
  const { t, dir } = useLocale()
  const [expanded, setExpanded] = useState(voice?.enabled ?? false)
  const [apiKey, setApiKey] = useState("")
  const [voiceId, setVoiceId] = useState(voice?.voiceId ?? "")
  const [voiceName, setVoiceName] = useState(voice?.voiceName ?? "")
  const [speed, setSpeed] = useState(voice?.speed ?? 1.0)
  const [model, setModel] = useState<"s1" | "s2-pro">(voice?.model ?? "s2-pro")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        enabled: true,
        apiKey: apiKey || undefined,
        voiceId: voiceId || undefined,
        voiceName: voiceName || undefined,
        speed,
        model,
      })
      setApiKey("")
      toast.success(t("voice_saved"))
    } catch (e) {
      toast.error(t("voice_save_failed"))
    } finally {
      setSaving(false)
    }
  }

  async function handleDisable() {
    setSaving(true)
    try {
      await onSave({ enabled: false })
      toast.success(t("voice_disabled"))
    } catch {
      toast.error(t("voice_save_failed"))
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: t("voice_test_text") }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "TTS failed")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.play()
      audio.onended = () => URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed")
    } finally {
      setTesting(false)
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-card/40 backdrop-blur-sm transition-colors",
        expanded ? "border-primary/40" : "border-border/60"
      )}
      dir={dir}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-start"
      >
        <div className={cn(
          "grid place-items-center size-9 rounded-md",
          voice?.enabled ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground"
        )}>
          {voice?.enabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Fish Audio</div>
          <div className="text-xs text-muted-foreground truncate">
            {voice?.enabled
              ? voice.voiceName || voice.voiceId || t("voice_default")
              : t("voice_disabled_label")}
          </div>
        </div>
        <div className={cn(
          "size-2 rounded-full",
          voice?.enabled && voice?.apiKey ? "bg-green-500" : "bg-muted-foreground/30"
        )} />
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/40 pt-3">
          {/* API Key */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
              {t("voice_api_key")}
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={voice?.apiKey ? "••••••••" : "sk-..."}
                className="flex-1 bg-input rounded-sm px-2.5 py-1.5 text-sm font-mono outline-none border border-border/60 focus:border-primary/60"
                dir="ltr"
              />
              <a
                href="https://fish.audio/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="grid place-items-center size-8 rounded-sm border border-border/60 hover:border-primary/60 text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>

          {/* Voice ID */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
              {t("voice_id")}
            </label>
            <input
              type="text"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              placeholder="e.g. a0e99f3a-..."
              className="w-full bg-input rounded-sm px-2.5 py-1.5 text-sm font-mono outline-none border border-border/60 focus:border-primary/60"
              dir="ltr"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              <a
                href="https://fish.audio/discover"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {t("voice_browse_voices")}
              </a>
            </p>
          </div>

          {/* Voice Name (optional label) */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
              {t("voice_name")}
            </label>
            <input
              type="text"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              placeholder={t("voice_name_placeholder")}
              className="w-full bg-input rounded-sm px-2.5 py-1.5 text-sm outline-none border border-border/60 focus:border-primary/60"
            />
          </div>

          {/* Speed slider */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 flex items-center justify-between">
              <span>{t("voice_speed")}</span>
              <span className="text-foreground">{speed.toFixed(1)}x</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          {/* Model select */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 block">
              {t("voice_model")}
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as "s1" | "s2-pro")}
              className="w-full bg-input rounded-sm px-2.5 py-1.5 text-sm outline-none border border-border/60 focus:border-primary/60"
            >
              <option value="s2-pro">S2-Pro (Recommended)</option>
              <option value="s1">S1 (Legacy)</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            {voice?.enabled && voice?.apiKey && (
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm border border-border/60 hover:border-primary/60 hover:text-primary disabled:opacity-50"
              >
                {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                {t("voice_test")}
              </button>
            )}
            <div className="flex-1" />
            {voice?.enabled && (
              <button
                type="button"
                onClick={handleDisable}
                disabled={saving}
                className="px-3 py-1.5 text-xs rounded-sm border border-destructive/60 text-destructive hover:bg-destructive/10"
              >
                {t("voice_disable")}
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm border border-primary text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              {t("voice_save")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
