import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// 加载 .env
const envPath = resolve(root, '.env')
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    process.env[key] ??= val
  }
}

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

export const config = {
  port: Number(env('PORT', '3001')),
  jwtSecret: env('JWT_SECRET', 'dev-secret-change-in-production'),

  db: {
    path: resolve(root, env('DB_PATH', './data/photos.db')),
  },

  rustfs: {
    endpoint: env('RUSTFS_ENDPOINT', 'http://127.0.0.1:9000'),
    accessKey: env('RUSTFS_ACCESS_KEY', 'minioadmin'),
    secretKey: env('RUSTFS_SECRET_KEY', 'minioadmin'),
    bucket: env('RUSTFS_BUCKET', 'cloud-photos'),
    region: env('RUSTFS_REGION', 'cn-east-1'),
  },

  cors: {
    origin: env('CORS_ORIGIN', 'http://localhost:5173'),
  },
}
