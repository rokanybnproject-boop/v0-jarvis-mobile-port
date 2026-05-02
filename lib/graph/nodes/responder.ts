// ─────────────────────────────────────────────────────────────────────────────
// ResponderNode — The final node in every subgraph.
//
// Receives the outputs of all executor nodes (or the direct result) and
// synthesises a single, coherent natural-language reply. Also decides whether
// to persist any new facts to long-term memory.
//
// Context is still narrow: we pass executor summaries (not raw tool responses)
// to keep token costs low.
// ─────────────────────────────────────────────────────────────────────────────

import { streamText, stepCountIs, tool } from "ai"
import { z } from "zod"
import { GraphNode, type NodeEmitter } from "../node"
import type { GraphContext, NodeResult } from "../types"
import { MemoryNode } from "./memory"

const buildResponderSystem = (
  userMessage: string,
  conversationSummary: string,
  memories: Record<string, string>,
) => {
  const memBlock =
    Object.keys(memories).length > 0
      ? `\nLong-term memories about the user:\n${Object.entries(memories)
          .map(([k, v]) => `  ${k}: ${v}`)
          .join("\n")}`
      : ""

  const ctxBlock = conversationSummary
    ? `\nConversation context:\n${conversationSummary}`
    : ""

  return `You are Jarvis, a highly capable AI assistant.
Your task: synthesise the outputs from previous steps and write a clear, helpful response to the user.

Guidelines:
- Be concise but complete. Avoid repeating tool call details verbatim.
- If an action was taken (SMS sent, command run), confirm it naturally.
- If there were errors, acknowledge them and suggest next steps.
- Write in the same language the user used.
- If you learned something new about the user that should be remembered, call remember().
${memBlock}${ctxBlock}

User's original request: ${userMessage}`
}

export class ResponderNode extends GraphNode {
  private readonly onText: (delta: string) => void

  constructor(onText: (delta: string) => void) {
    super("responder", "responder")
    this.onText = onText
  }

  async run(ctx: GraphContext, emit: NodeEmitter): Promise<NodeResult> {
    const { startedAt } = this.startResult()
    emit({ type: "node_start", nodeId: this.id, nodeKind: this.kind })

    // Build a brief summary of what the executor nodes produced
    const executorSummaries = Object.entries(ctx.nodeOutputs)
      .filter(([, r]) => r.kind === "executor" && r.output)
      .map(([id, r]) => `[${id}]: ${r.output}`)
      .join("\n")

    // For direct intent: the router skipped the planner, so we pass the raw
    // user message as the "step output" so the responder has something to work with.
    const stepContext =
      executorSummaries ||
      (ctx.intent === "direct" || ctx.intent === "chitchat" ? ctx.userMessage : "")

    try {
      const stream = streamText({
        model: ctx.model,
        system: buildResponderSystem(
          ctx.userMessage,
          ctx.conversationSummary,
          ctx.memories,
        ),
        prompt: stepContext
          ? `Step results:\n${stepContext}`
          : "No steps were executed. Respond directly.",
        // Allow the responder to call remember() if it wants to persist a fact
        tools: {
          remember: tool({
            description: "Persist a new long-term memory about the user.",
            inputSchema: z.object({
              key: z.string().describe("Memory key (e.g. 'user_name')"),
              value: z.string().describe("Memory value to store"),
            }),
            execute: async ({ key, value }) => {
              await MemoryNode.write(key, value)
              return { ok: true }
            },
          }),
        },
        stopWhen: stepCountIs(3),
        maxOutputTokens: 2048,
      })

      let fullText = ""
      let promptTokens = 0
      let completionTokens = 0

      for await (const chunk of stream.textStream) {
        fullText += chunk
        this.onText(chunk)
        emit({ type: "text_delta", nodeId: this.id, delta: chunk })
      }

      const usage = await stream.usage
      promptTokens = usage?.inputTokens ?? 0
      completionTokens = usage?.outputTokens ?? 0

      const result = this.finishResult(startedAt, {
        status: "done",
        output: fullText,
        usage: { promptTokens, completionTokens },
      })

      emit({ type: "node_done", nodeId: this.id, nodeKind: this.kind, result })
      return result
    } catch (e) {
      const result = this.errorResult(startedAt, e)
      emit({ type: "node_error", nodeId: this.id, nodeKind: this.kind, result })
      return result
    }
  }
}
