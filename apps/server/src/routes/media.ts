import { Router } from 'express'
import { db, schema } from '../db'
import { eq, like, and, desc, asc, count, inArray } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import { MediaQuerySchema, generateId } from '@cloud-photo/shared'
import type { MediaSortField } from '@cloud-photo/shared'

const router = Router()

/** 获取媒体列表（分页 + 筛选） */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const query = MediaQuerySchema.parse(req.query)

    const conditions = [eq(schema.media.userId, req.user!.userId)]

    if (query.search) {
      conditions.push(like(schema.media.filename, `%${query.search}%`))
    }
    if (query.mediaType) {
      conditions.push(eq(schema.media.mediaType, query.mediaType))
    }
    if (query.status) {
      conditions.push(eq(schema.media.status, query.status))
    }
    if (query.isFavorite !== undefined) {
      conditions.push(eq(schema.media.isFavorite, query.isFavorite))
    }

    const sortFieldMap: Record<MediaSortField, unknown> = {
      filename: schema.media.filename,
      size: schema.media.size,
      createdAt: schema.media.createdAt,
      takenAt: schema.media.takenAt,
    }
    const col = sortFieldMap[query.sortBy]
    const orderBy = query.sortDir === 'asc' ? asc(col as any) : desc(col as any)

    const offset = (query.page - 1) * query.pageSize

    const [items, totalResult] = await Promise.all([
      db.select()
        .from(schema.media)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(query.pageSize)
        .offset(offset),
      db.select({ count: count() })
        .from(schema.media)
        .where(and(...conditions)),
    ])

    const total = totalResult[0]?.count ?? 0

    res.json({
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      hasMore: offset + query.pageSize < total,
    })
  } catch (err) {
    console.error('[Media] List error:', err)
    res.status(400).json({ error: 'Invalid query parameters' })
  }
})

/** 获取单个媒体详情 */
router.get('/:id', authMiddleware, async (req, res) => {
  const id = req.params.id as string
  const item = db.select()
    .from(schema.media)
    .where(and(
      eq(schema.media.id, id),
      eq(schema.media.userId, req.user!.userId),
    ))
    .get()

  if (!item) {
    res.status(404).json({ error: 'Media not found' })
    return
  }

  res.json(item)
})

/** 创建媒体记录 */
router.post('/', authMiddleware, async (req, res) => {
  const now = new Date().toISOString()
  const mediaItem = {
    ...req.body,
    id: generateId(),
    userId: req.user!.userId,
    createdAt: now,
    updatedAt: now,
  }

  db.insert(schema.media).values(mediaItem).run()
  res.status(201).json(mediaItem)
})

/** 更新媒体（收藏、评分、标签） */
router.patch('/:id', authMiddleware, async (req, res) => {
  const id = req.params.id as string
  const allowedFields = ['isFavorite', 'rating', 'tags', 'status', 'cloudUrl', 'objectName']

  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No valid fields to update' })
    return
  }

  updates.updatedAt = new Date().toISOString()

  db.update(schema.media)
    .set(updates)
    .where(and(
      eq(schema.media.id, id),
      eq(schema.media.userId, req.user!.userId),
    ))
    .run()

  const updated = db.select()
    .from(schema.media)
    .where(eq(schema.media.id, id))
    .get()

  res.json(updated)
})

/** 批量删除媒体 */
router.delete('/batch', authMiddleware, async (req, res) => {
  const { ids } = req.body as { ids: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids must be a non-empty array' })
    return
  }

  // 分批删除避免 SQL 过长
  const batchSize = 100
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    db.delete(schema.media)
      .where(and(
        inArray(schema.media.id, batch as [string, ...string[]]),
        eq(schema.media.userId, req.user!.userId),
      ))
      .run()
  }

  res.json({ deleted: ids.length })
})

export default router
