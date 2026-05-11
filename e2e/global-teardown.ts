import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, unlinkSync, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pidFile = resolve(__dirname, '.server-pid')

export default async function () {
  if (!existsSync(pidFile)) {
    console.log('[global-teardown] No PID file found, skipping')
    return
  }

  try {
    const pid = parseInt(readFileSync(pidFile, 'utf-8'), 10)
    try {
      process.kill(pid, 'SIGTERM')
      console.log(`[global-teardown] Server process ${pid} terminated`)
    } catch {
      console.log(`[global-teardown] Process ${pid} already exited`)
    }
    unlinkSync(pidFile)
  } catch (err) {
    console.error('[global-teardown] Error:', err)
  }
}
