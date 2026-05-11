import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import http from 'node:http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const serverDir = resolve(__dirname, '../apps/server')
const tsxEntry = resolve(serverDir, 'node_modules/tsx/dist/cli.mjs')
const pidFile = resolve(__dirname, '.server-pid')

/** 轮询等待服务器就绪 */
function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    function check() {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Server failed to start within ${timeoutMs}ms`))
        return
      }
      http.get(url, (res) => {
        if (res.statusCode === 200) resolve()
        else setTimeout(check, 500)
      }).on('error', () => setTimeout(check, 500))
    }
    check()
  })
}

export default async function () {
  console.log('[global-setup] Starting server...')

  const server = spawn(process.execPath, [tsxEntry, 'src/index.ts'], {
    cwd: serverDir,
    stdio: 'pipe',
    windowsHide: false,
  })

  server.stdout.on('data', (data: Buffer) => {
    const msg = data.toString().trim()
    if (msg) console.log(`[server] ${msg}`)
  })
  server.stderr.on('data', (data: Buffer) => {
    const msg = data.toString().trim()
    if (msg) console.error(`[server:err] ${msg}`)
  })
  server.on('exit', (code) => {
    console.log(`[server] process exited with code ${code}`)
  })

  // 写入 PID 文件供 teardown 使用
  if (!existsSync(resolve(__dirname))) mkdirSync(resolve(__dirname), { recursive: true })
  if (server.pid !== undefined) {
    writeFileSync(pidFile, String(server.pid), 'utf-8')
  }

  await waitForServer('http://127.0.0.1:3001/api/health', 30_000)
  console.log('[global-setup] Server ready')
}
