import { Router } from 'express'
import { db, schema } from '../db'
import { eq, and, count, inArray } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { CreateAlbumSchema, generateId } from '@cloud-photo/shared'

const router = Router()

/** 获取所有相册 */
router.get('/', authMiddleware, async (_req, res) => {
  const items = db.select().from(schema.albums)
    .where(eq(schema.albums.userId, _req.user!.userId))
    .all()

  // 补充媒体数量
  const result = await Promise.all(items.map(async (album) => {
    const cnt = db.select({ count: count() })
      .from(schema.albumMedia)
      .where(eq(schema.albumMedia.albumId, album.id))
      .get()
    return { ...album, mediaCount: cnt?.count ?? 0 }
  }))

  res.json(result)
})

/** 创建相册 */
router.post('/', authMiddleware, async (req, res) => {
  const data = CreateAlbumSchema.parse(req.body)
  const now = new Date().toISOString()

  const album = {
    id: generateId(),
    name: data.name,
    description: data.description ?? '',
    coverMediaId: null,
    userId: req.user!.userId,
    createdAt: now,
    updatedAt: now,
  }

  db.insert(schema.albums).values(album).run()
  res.status(201).json(album)
})

/** 向相册添加媒体 */
router.post('/:id/media', authMiddleware, async (req, res) => {
  const albumId = req.params.id as string
  const { mediaIds } = req.body as { mediaIds: string[] }
  if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
    res.status(400).json({ error: 'mediaIds must be a non-empty array' })
    return
  }

  const now = new Date().toISOString()
  const values = mediaIds.map((mediaId, idx) => ({
    albumId,
    mediaId,
    sortOrder: idx,
    addedAt: now,
  }))

  for (const v of values) {
    db.insert(schema.albumMedia).values(v).run()
  }

  db.update(schema.albums)
    .set({ updatedAt: now })
    .where(eq(schema.albums.id, albumId))
    .run()

  res.json({ added: mediaIds.length })
})

/** 从相册移除媒体 */
router.delete('/:id/media/:mediaId', authMiddleware, async (req, res) => {
  const albumId = req.params.id as string
  const mediaId = req.params.mediaId as string

  db.delete(schema.albumMedia)
    .where(and(
      eq(schema.albumMedia.albumId, albumId),
      eq(schema.albumMedia.mediaId, mediaId),
    ))
    .run()

  res.json({ removed: true })
})

/** 删除相册 */
router.delete('/:id', authMiddleware, async (req, res) => {
  const id = req.params.id as string
  db.delete(schema.albums)
    .where(and(
      eq(schema.albums.id, id),
      eq(schema.albums.userId, req.user!.userId),
    ))
    .run()

  res.json({ deleted: true })
})

export default router
