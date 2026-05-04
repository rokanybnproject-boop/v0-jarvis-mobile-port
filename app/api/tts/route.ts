import { getConfig } from "@/lib/config"
import { NextResponse } from "next/server"

// Fish Audio only accepts these three model names in the `model` header.
// Any other value (notably the legacy "s2-pro" we used to ship as default)
// causes the request to fail with HTTP 400 / "invalid model".
const VALID_FISH_MODELS = new Set(["speech-1.5", "speech-1.6", "s1"])
const DEFAULT_FISH_MODEL = "speech-1.6"

function normaliseFishModel(raw: string | undefined): string {
  if (raw && VALID_FISH_MODELS.has(raw)) return raw
  return DEFAULT_FISH_MODEL
}

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text: string }

  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 })
  }

  const config = await getConfig()
  const voice = config.voice

  if (!voice?.enabled || !voice?.apiKey) {
    return NextResponse.json({ error: "Voice not configured" }, { status: 400 })
  }

  const model = normaliseFishModel(voice.model)

  // Body: only fields explicitly documented at
  // https://docs.fish.audio/text-to-speech/text-to-speech.
  // Sending unknown fields (e.g. temperature / top_p / sample_rate / volume)
  // on the JSON endpoint can return 400 on some accounts.
  const body: Record<string, unknown> = {
    text: text.slice(0, 2000),
    format: "mp3",
    mp3_bitrate: 128,
    chunk_length: 200,
    normalize: true,
    latency: "normal",
  }
  if (voice.voiceId) body.reference_id = voice.voiceId
  if (typeof voice.speed === "number" && voice.speed !== 1.0) {
    body.prosody = { speed: voice.speed }
  }

  try {
    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${voice.apiKey}`,
        "Content-Type": "application/json",
        model,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      // Fish Audio returns plain text on some errors and JSON on others.
      const errText = await response.text().catch(() => "")
      console.error("[v0] Fish Audio error:", response.status, errText)
      let message = `Fish Audio error ${response.status}`
      try {
        const parsed = JSON.parse(errText) as { message?: string; detail?: string }
        message = parsed.message || parsed.detail || message
      } catch {
        if (errText) message = errText.slice(0, 200)
      }
      // Friendly hints for the most common cases
      if (response.status === 401) message = "Fish Audio: مفتاح API غير صحيح"
      else if (response.status === 402) message = "Fish Audio: رصيد غير كافٍ"
      else if (response.status === 404) message = `Fish Audio: معرّف الصوت غير موجود (${voice.voiceId ?? "—"})`
      return NextResponse.json({ error: message }, { status: response.status })
    }

    const audioBuffer = await response.arrayBuffer()
    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    })
  } catch (e) {
    console.error("[v0] TTS error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "TTS failed" },
      { status: 500 },
    )
  }
}
