import express from 'express'
import cors from 'cors'
import { config } from './config'
import { runMigrations } from './db/migrate'
import mediaRouter from './routes/media'
import authRouter from './routes/auth'
import albumsRouter from './routes/albums'
import uploadRouter from './routes/upload'
import downloadRouter from './routes/download'
import syncRouter from './routes/sync'

const app = express()

// 中间件
app.use(cors({ origin: config.cors.origin, credentials: true }))
app.use(express.json({ limit: '50mb' }))

// 公开路由
app.use('/api/auth', authRouter)

// 媒体路由
app.use('/api/media', mediaRouter)
app.use('/api/albums', albumsRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/download', downloadRouter)
app.use('/api/sync', syncRouter)

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 启动
async function main() {
  // 运行数据库迁移
  runMigrations()

  // 尝试初始化 RustFS（非阻塞）
  try {
    const { ensureBucket } = await import('./rustfs')
    await ensureBucket()
    console.log('[RustFS] Connected and ready')
  } catch (err) {
    console.warn('[RustFS] Not available, cloud upload will be disabled:', (err as Error).message)
  }

  app.listen(config.port, () => {
    console.log(`[Server] Running on http://localhost:${config.port}`)
    console.log(`[Server] Health check: http://localhost:${config.port}/api/health`)
  })
}

main().catch(console.error)
