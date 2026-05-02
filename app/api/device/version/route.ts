import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"

// Returns the SHA-256 checksum of the current jarvis-arm.sh so the
// Termux script can detect when a new version has been deployed and
// self-update automatically.
export async function GET() {
  try {
    const scriptPath = join(process.cwd(), "public", "jarvis-arm.sh")
    const content = readFileSync(scriptPath)
    const checksum = createHash("sha256").update(content).digest("hex")
    const size = content.length
    return Response.json({ checksum, size })
  } catch {
    return Response.json({ error: "script not found" }, { status: 404 })
  }
}
