import { db, schema, saveDb } from './db'
import { eq, and, isNotNull, count } from 'drizzle-orm'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { extname } from 'node:path'
import { createHash } from 'node:crypto'
import type { Media } from '@cloud-photo/shared'

export interface SyncProgress {
  total: number
  completed: number
  failed: number
  current: string
}

export interface SyncStatus {
  localOnly: number
  cloudOnly: number
  synced: number
  syncing: number
  total: number
}

type ProgressCallback = (progress: SyncProgress) => void

/** 获取同步状态统计 */
export function getSyncStatus(userId: string): SyncStatus {
  const [localResult] = db.select({ c: count() })
    .from(schema.media)
    .where(and(eq(schema.media.userId, userId), eq(schema.media.status, 'local_only')))
    .all()

  const [cloudResult] = db.select({ c: count() })
    .from(schema.media)
    .where(and(eq(schema.media.userId, userId), eq(schema.media.status, 'cloud_only')))
    .all()

  const [syncedResult] = db.select({ c: count() })
    .from(schema.media)
    .where(and(eq(schema.media.userId, userId), eq(schema.media.status, 'synced')))
    .all()

  const [syncingResult] = db.select({ c: count() })
    .from(schema.media)
    .where(and(eq(schema.media.userId, userId), eq(schema.media.status, 'syncing')))
    .all()

  const [totalResult] = db.select({ c: count() })
    .from(schema.media)
    .where(eq(schema.media.userId, userId))
    .all()

  return {
    localOnly: localResult?.c ?? 0,
    cloudOnly: cloudResult?.c ?? 0,
    synced: syncedResult?.c ?? 0,
    syncing: syncingResult?.c ?? 0,
    total: totalResult?.c ?? 0,
  }
}

/**
 * 本地→云端同步
 * 将 status='local_only' 且有本地路径的文件上传到 RustFS
 */
export async function syncLocalToCloud(
  userId: string,
  onProgress?: ProgressCallback,
): Promise<{ uploaded: number; failed: number }> {
  const items: Media[] = db.select()
    .from(schema.media)
    .where(and(
      eq(schema.media.userId, userId),
      eq(schema.media.status, 'local_only'),
      isNotNull(schema.media.localPath),
    ))
    .all() as unknown as Media[]

  let uploaded = 0
  let failed = 0
  const total = items.length

  for (let i = 0; i < total; i++) {
    const item = items[i]
    const localPath = item.localPath!

    onProgress?.({ total, completed: i, failed, current: item.filename })

    // 本地文件不存在 → 标记 cloud_only（如果云端有）
    if (!existsSync(localPath)) {
      if (item.cloudUrl) {
        db.update(schema.media)
          .set({ status: 'cloud_only', updatedAt: new Date().toISOString() })
          .where(eq(schema.media.id, item.id))
          .run()
      }
      continue
    }

    try {
      db.update(schema.media)
        .set({ status: 'syncing', updatedAt: new Date().toISOString() })
        .where(eq(schema.media.id, item.id))
        .run()

      const buffer = readFileSync(localPath)
      const ext = extname(item.filename).toLowerCase()
      const md5 = createHash('md5').update(buffer).digest('hex')
      const objectName = `${userId}/${md5}${ext}`

      const { uploadToRustfs } = await import('./rustfs')
      const cloudUrl = await uploadToRustfs(objectName, buffer, item.mimeType)

      db.update(schema.media)
        .set({
          status: 'synced',
          cloudUrl,
          objectName,
          md5: item.md5 || md5,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.media.id, item.id))
        .run()

      uploaded++
    } catch (err) {
      console.error(`[Sync] Upload failed for ${item.filename}:`, err)
      failed++
      db.update(schema.media)
        .set({ status: 'local_only', updatedAt: new Date().toISOString() })
        .where(eq(schema.media.id, item.id))
        .run()
    }

    if (i % 5 === 0) saveDb()
  }

  saveDb()
  onProgress?.({ total, completed: total, failed, current: '' })
  return { uploaded, failed }
}

/**
 * 云端→本地同步
 * 将 status='cloud_only' 且有 objectName 的文件下载到本地
 */
export async function syncCloudToLocal(
  userId: string,
  localBaseDir: string,
  onProgress?: ProgressCallback,
): Promise<{ downloaded: number; failed: number }> {
  if (!existsSync(localBaseDir)) {
    mkdirSync(localBaseDir, { recursive: true })
  }

  const items: Media[] = db.select()
    .from(schema.media)
    .where(and(
      eq(schema.media.userId, userId),
      eq(schema.media.status, 'cloud_only'),
      isNotNull(schema.media.objectName),
    ))
    .all() as unknown as Media[]

  let downloaded = 0
  let failed = 0
  const total = items.length

  for (let i = 0; i < total; i++) {
    const item = items[i]
    const objectName = item.objectName!

    onProgress?.({ total, completed: i, failed, current: item.filename })

    try {
      db.update(schema.media)
        .set({ status: 'syncing', updatedAt: new Date().toISOString() })
        .where(eq(schema.media.id, item.id))
        .run()

      const { downloadFromRustfs } = await import('./rustfs')
      const buffer = await downloadFromRustfs(objectName)

      const localPath = join(localBaseDir, item.filename)
      const localDir = dirname(localPath)
      if (!existsSync(localDir)) {
        mkdirSync(localDir, { recursive: true })
      }

      writeFileSync(localPath, buffer)

      db.update(schema.media)
        .set({ status: 'synced', localPath, updatedAt: new Date().toISOString() })
        .where(eq(schema.media.id, item.id))
        .run()

      downloaded++
    } catch (err) {
      console.error(`[Sync] Download failed for ${item.filename}:`, err)
      failed++
      db.update(schema.media)
        .set({ status: 'cloud_only', updatedAt: new Date().toISOString() })
        .where(eq(schema.media.id, item.id))
        .run()
    }

    if (i % 5 === 0) saveDb()
  }

  saveDb()
  onProgress?.({ total, completed: total, failed, current: '' })
  return { downloaded, failed }
}
