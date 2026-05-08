import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getSyncStatus, syncLocalToCloud, syncCloudToLocal } from '../sync'
import { config } from '../config'

const router = Router()

router.use(authMiddleware)

/** 获取同步状态统计 */
router.get('/status', (_req, res) => {
  const status = getSyncStatus(_req.user!.userId)
  res.json(status)
})

/** 启动本地→云端同步 */
router.post('/upload', async (req, res) => {
  const userId = req.user!.userId

  try {
    const result = await syncLocalToCloud(userId)
    res.json({
      success: true,
      direction: 'local_to_cloud',
      ...result,
    })
  } catch (err) {
    console.error('[Sync] upload error:', err)
    res.status(500).json({ error: '同步失败', details: (err as Error).message })
  }
})

/** 启动云端→本地同步 */
router.post('/download', async (req, res) => {
  const userId = req.user!.userId
  const { localPath } = req.body as { localPath?: string }
  const baseDir = localPath || config.db.path.replace('/data/', '/downloads/')

  try {
    const result = await syncCloudToLocal(userId, baseDir)
    res.json({
      success: true,
      direction: 'cloud_to_local',
      localPath: baseDir,
      ...result,
    })
  } catch (err) {
    console.error('[Sync] download error:', err)
    res.status(500).json({ error: '同步失败', details: (err as Error).message })
  }
})

export default router
