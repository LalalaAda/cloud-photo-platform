import { Router } from 'express'
import archiver from 'archiver'
import { authMiddleware } from '../middleware/auth'
import { db, schema } from '../db'
import { inArray } from 'drizzle-orm'
import { createReadStream, existsSync } from 'node:fs'

const router = Router()

/**
 * 批量下载 ZIP
 *
 * POST /api/download
 * Body: { ids: string[] } — 按媒体 ID 打包下载本地文件
 * 或 { albumId: string } — 按相册打包下载
 */
router.post('/', authMiddleware, async (req, res) => {
  const { ids, albumId } = req.body as { ids?: string[]; albumId?: string }

  let mediaIds: string[] = []

  if (albumId) {
    // 按相册查询媒体 ID
    const albumMedia = db.select({ mediaId: schema.albumMedia.mediaId })
      .from(schema.albumMedia)
      .where(inArray(schema.albumMedia.albumId, [albumId]))
      .all()
    mediaIds = albumMedia.map(am => am.mediaId)
  } else if (Array.isArray(ids) && ids.length > 0) {
    mediaIds = ids
  } else {
    res.status(400).json({ error: '请提供 ids 或 albumId' })
    return
  }

  // 从数据库查询媒体信息
  const items = db.select()
    .from(schema.media)
    .where(inArray(schema.media.id, mediaIds as [string, ...string[]]))
    .all()

  if (items.length === 0) {
    res.status(404).json({ error: '未找到匹配的媒体文件' })
    return
  }

  // 设置响应头
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="photos-${Date.now()}.zip"`)

  const archive = archiver('zip', { zlib: { level: 6 } })

  archive.on('error', (err: Error) => {
    console.error('[Download] Archiver error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: '压缩失败' })
    }
    res.end()
  })

  archive.pipe(res)

  let addedCount = 0
  for (const item of items) {
    // 优先使用本地文件
    if (item.localPath && existsSync(item.localPath)) {
      archive.file(item.localPath, { name: item.filename })
      addedCount++
    }
  }

  if (addedCount === 0) {
    archive.destroy()
    if (!res.headersSent) {
      res.status(404).json({ error: '没有可下载的本地文件' })
    }
    return
  }

  await archive.finalize()
})

export default router
