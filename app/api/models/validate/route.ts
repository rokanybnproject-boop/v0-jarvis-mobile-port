import { buildSelectedModel } from "@/lib/model-factory"
import { getConfig } from "@/lib/config"
import { generateText } from "ai"

export async function POST(req: Request) {
  const { provider, modelId, apiKey } = (await req.json()) as {
    provider: string
    modelId: string
    apiKey?: string
  }

  try {
    // If apiKey provided, create model directly; otherwise use buildSelectedModel
    if (apiKey) {
      // Quick validation: send a trivial request
      // (Don't use streamText since we can't finish a stream in a route)
      const { text } = await generateText({
        model: (await (await import("@ai-sdk/openai")).createOpenAI({
          apiKey,
          baseURL: "https://api.openai.com/v1",
        }))(modelId),
        prompt: "say OK",
        maxOutputTokens: 2,
      })
      return Response.json({ valid: true, message: "Model works" })
    }

    const built = await buildSelectedModel()
    if (!built) {
      return Response.json(
        { valid: false, message: "No model configured" },
        { status: 400 },
      )
    }

    // Send trivial request to test the model
    const { text } = await generateText({
      model: built.model,
      prompt: "say OK",
      maxOutputTokens: 2,
    })

    return Response.json({ valid: true, message: "Model works" })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json(
      {
        valid: false,
        message: msg.includes("credit")
          ? "رصيد المزود منخفض أو غير كافٍ"
          : msg.includes("auth") || msg.includes("invalid")
            ? "مفتاح API غير صحيح أو منتهي الصلاحية"
            : msg.includes("model")
              ? "النموذج غير موجود أو غير متاح مع هذا المفتاح"
              : msg.slice(0, 200),
      },
      { status: 400 },
    )
  }
}
