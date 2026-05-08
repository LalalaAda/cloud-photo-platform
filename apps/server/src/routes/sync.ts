import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getSyncStatus, syncLocalToCloud, syncCloudToLocal, getConflicts, resolveConflict } from '../sync'
import { config } from '../config'

const router = Router()

router.use(authMiddleware)

/** 获取同步状态统计 */
router.get('/status', (_req, res) => {
  const status = getSyncStatus(_req.user!.userId)
  res.json(status)
})

/** 获取冲突列表 */
router.get('/conflicts', (_req, res) => {
  const items = getConflicts(_req.user!.userId)
  res.json({ items })
})

/** 解决冲突 */
router.post('/resolve', async (req, res) => {
  const { mediaId, resolution } = req.body as { mediaId: string; resolution: 'keep_local' | 'keep_cloud' }
  if (!mediaId || !resolution || !['keep_local', 'keep_cloud'].includes(resolution)) {
    res.status(400).json({ error: '缺少参数 mediaId 或 resolution 无效' })
    return
  }

  try {
    const result = await resolveConflict(req.user!.userId, mediaId, resolution)
    if (result.success) {
      res.json(result)
    } else {
      res.status(400).json(result)
    }
  } catch (err) {
    console.error('[Sync] resolve error:', err)
    res.status(500).json({ error: '解决冲突失败', details: (err as Error).message })
  }
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
