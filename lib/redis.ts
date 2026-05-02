import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Redis key namespaces — Jarvis stores everything in Upstash so it survives
// across serverless invocations and across devices.
export const KEYS = {
  // Configuration
  config: () => "jarvis:config",
  apiKeys: () => "jarvis:apikeys",
  selectedModel: () => "jarvis:model:selected",

  // Device pairing
  devices: () => "jarvis:devices",
  device: (id: string) => `jarvis:device:${id}`,
  deviceLastSeen: (id: string) => `jarvis:device:${id}:lastseen`,

  // Command queue (per-device list, BLPOP-able from Termux)
  commandQueue: (deviceId: string) => `jarvis:queue:cmd:${deviceId}`,
  commandPending: (cmdId: string) => `jarvis:cmd:${cmdId}`,
  commandResult: (cmdId: string) => `jarvis:cmd:${cmdId}:result`,

  // Conversations
  chatList: () => "jarvis:chats",
  chat: (id: string) => `jarvis:chat:${id}`,

  // Long-term memory
  memory: () => "jarvis:memory",

  // Execution log (capped list)
  executionLog: () => "jarvis:log:executions",

  // Cognitive graph traces (capped to 100 runs)
  graphTrace: () => "jarvis:graph:traces",
}
