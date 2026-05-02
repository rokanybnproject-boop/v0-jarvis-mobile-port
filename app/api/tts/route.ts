import { getConfig } from "@/lib/config"
import { NextResponse } from "next/server"

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

  try {
    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${voice.apiKey}`,
        "Content-Type": "application/json",
        "model": voice.model || "s2-pro",
      },
      body: JSON.stringify({
        text: text.slice(0, 2000), // Limit text length
        reference_id: voice.voiceId || null,
        temperature: 0.7,
        top_p: 0.7,
        prosody: {
          speed: voice.speed || 1.0,
          volume: 0,
          normalize_loudness: true,
        },
        format: "mp3",
        sample_rate: 44100,
        mp3_bitrate: 128,
        latency: "balanced",
        normalize: true,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error("[v0] Fish Audio error:", err)
      return NextResponse.json(
        { error: err.message || `Fish Audio error: ${response.status}` },
        { status: response.status }
      )
    }

    // Stream audio back to client
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
      { status: 500 }
    )
  }
}
