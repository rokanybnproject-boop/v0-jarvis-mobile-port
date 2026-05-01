import { tool } from "ai"
import { z } from "zod"
import { nanoid } from "nanoid"
import { redis, KEYS } from "./redis"
import type { CommandKind, CommandResult, ExecutionLogEntry, PendingCommand } from "./types"

// How long we wait for the Termux arm to pick up the command and respond.
// If we don't hear back, we tell the LLM the device is offline.
const COMMAND_TIMEOUT_MS = 15_000
const POLL_INTERVAL_MS = 250

async function getActiveDeviceId(): Promise<string | null> {
  // Use the most-recently-seen online device. The user can pair multiple
  // arms but typically only one phone is the primary.
  const ids = (await redis.smembers(KEYS.devices())) as string[]
  if (!ids.length) return null
  let bestId: string | null = null
  let bestSeen = 0
  for (const id of ids) {
    const seen = (await redis.get<number>(KEYS.deviceLastSeen(id))) || 0
    if (seen > bestSeen) {
      bestSeen = seen
      bestId = id
    }
  }
  return bestId
}

async function dispatchCommand(
  kind: CommandKind,
  args: Record<string, unknown>,
  intent?: string,
): Promise<CommandResult> {
  const deviceId = await getActiveDeviceId()
  if (!deviceId) {
    return {
      id: "no-device",
      ok: false,
      stderr: "No paired device. Open Settings → Devices and run the Termux pairing script.",
      finishedAt: Date.now(),
    }
  }

  const lastSeen = (await redis.get<number>(KEYS.deviceLastSeen(deviceId))) || 0
  const stale = Date.now() - lastSeen > 60_000
  // Even if stale, we still queue — the arm may pick it up when it reconnects.

  const cmd: PendingCommand = {
    id: nanoid(12),
    deviceId,
    kind,
    args,
    intent,
    createdAt: Date.now(),
  }

  await redis.set(KEYS.commandPending(cmd.id), cmd, { ex: 300 })
  await redis.rpush(KEYS.commandQueue(deviceId), JSON.stringify(cmd))

  // Poll Redis for the result. Termux arm will set commandResult(id) when done.
  const start = Date.now()
  while (Date.now() - start < COMMAND_TIMEOUT_MS) {
    const result = await redis.get<CommandResult>(KEYS.commandResult(cmd.id))
    if (result) {
      // Append to execution log (capped to last 500)
      const entry: ExecutionLogEntry = {
        cmdId: cmd.id,
        deviceId,
        kind,
        intent,
        args,
        result,
        createdAt: cmd.createdAt,
      }
      await redis.lpush(KEYS.executionLog(), JSON.stringify(entry))
      await redis.ltrim(KEYS.executionLog(), 0, 499)
      // Clean up
      await redis.del(KEYS.commandResult(cmd.id))
      await redis.del(KEYS.commandPending(cmd.id))
      return result
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }

  return {
    id: cmd.id,
    ok: false,
    stderr: stale
      ? `Device "${deviceId}" hasn't checked in for over a minute — likely offline. Command was queued.`
      : "Timed out waiting for device to respond. Command was queued.",
    finishedAt: Date.now(),
  }
}

// ---------------- Tools exposed to the LLM ----------------
// We keep ONE master tool with a discriminated union so the model has a clean
// surface area, plus a couple of lightweight helpers (memory, log).

export const jarvisTools = {
  device_command: tool({
    description:
      "Execute a command on the user's paired Android phone via Termux. This is your primary way to interact with the real world. Pick the most appropriate `kind`. Most kinds map directly to a termux-api binary or to a shell command.",
    inputSchema: z
      .object({
        kind: z
          .enum([
            "shell.exec",
            "shell.python",
            "sms.send",
            "sms.list",
            "call.dial",
            "contacts.list",
            "location.get",
            "battery.status",
            "wifi.info",
            "sensor.read",
            "camera.photo",
            "torch.toggle",
            "tts.speak",
            "vibrate",
            "notification.show",
            "clipboard.get",
            "clipboard.set",
            "volume.set",
            "brightness.set",
            "file.read",
            "file.write",
            "file.list",
          ])
          .describe(
            "Command kind. Use shell.exec for anything not covered by a dedicated kind. Examples: 'sms.send' to send text, 'location.get' for GPS, 'camera.photo' to snap a picture, 'shell.exec' to run arbitrary bash.",
          ),
        intent: z
          .string()
          .describe("One short sentence describing what you're trying to accomplish — shown in the user's audit log."),
        // Keep args flexible — different kinds need different fields.
        cmd: z.string().nullable().describe("For shell.exec: the bash command to run. Null otherwise."),
        code: z.string().nullable().describe("For shell.python: the Python source to execute. Null otherwise."),
        number: z.string().nullable().describe("Phone number for sms.send / call.dial. Null otherwise."),
        message: z.string().nullable().describe("Body for sms.send / tts.speak / notification.show. Null otherwise."),
        title: z.string().nullable().describe("Title for notification.show. Null otherwise."),
        path: z.string().nullable().describe("Filesystem path for file.* commands. Null otherwise."),
        content: z.string().nullable().describe("Content for file.write / clipboard.set. Null otherwise."),
        camera: z
          .enum(["back", "front"])
          .nullable()
          .describe("Camera id for camera.photo. Null otherwise."),
        sensorType: z
          .string()
          .nullable()
          .describe("Sensor name for sensor.read (e.g. 'accelerometer'). Null otherwise."),
        level: z.number().nullable().describe("Numeric value for volume.set / brightness.set (0-100). Null otherwise."),
        durationMs: z
          .number()
          .nullable()
          .describe("Duration in ms for vibrate. Null otherwise."),
        limit: z.number().nullable().describe("Max items for sms.list / contacts.list / file.list. Null otherwise."),
      })
      .describe(
        "Arguments. Set fields that don't apply to the chosen kind to null. The arm script will route based on `kind`.",
      ),
    execute: async ({ kind, intent, ...args }) => {
      console.log("[v0] device_command", kind, intent)
      const cleaned: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(args)) if (v !== null && v !== undefined) cleaned[k] = v
      const result = await dispatchCommand(kind as CommandKind, cleaned, intent)
      return result
    },
  }),

  remember: tool({
    description:
      "Save a long-term memory about the user (preferences, important people, routines, recurring tasks). Use this whenever you learn something durable that should persist across conversations.",
    inputSchema: z.object({
      key: z.string().describe("Short identifier, e.g. 'preferred_wake_time' or 'spouse_name'."),
      value: z.string().describe("The information to remember."),
    }),
    execute: async ({ key, value }) => {
      await redis.hset(KEYS.memory(), { [key]: value })
      return { ok: true, message: `Stored memory "${key}".` }
    },
  }),

  recall_memory: tool({
    description: "Retrieve everything Jarvis has remembered about the user. Returns a key/value object.",
    inputSchema: z.object({}),
    execute: async () => {
      const all = (await redis.hgetall(KEYS.memory())) || {}
      return { memories: all }
    },
  }),

  forget: tool({
    description: "Delete a specific long-term memory by key.",
    inputSchema: z.object({ key: z.string() }),
    execute: async ({ key }) => {
      await redis.hdel(KEYS.memory(), key)
      return { ok: true, message: `Forgot "${key}".` }
    },
  }),
}

export type JarvisTools = typeof jarvisTools
