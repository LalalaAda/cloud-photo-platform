import { db, schema, saveDb } from './db'
import { eq, and, isNotNull, count } from 'drizzle-orm'
import { existsSync, readFileSync, mkdirSync, writeFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { extname } from 'node:path'
import { createHash } from 'node:crypto'
import type { Media, SyncConflictItem } from '@cloud-photo/shared'

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
  conflict: number
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

  const [conflictResult] = db.select({ c: count() })
    .from(schema.media)
    .where(and(eq(schema.media.userId, userId), eq(schema.media.status, 'conflict')))
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
    conflict: conflictResult?.c ?? 0,
    total: totalResult?.c ?? 0,
  }
}

/** 获取冲突列表 */
export function getConflicts(userId: string): SyncConflictItem[] {
  const items: Media[] = db.select()
    .from(schema.media)
    .where(and(
      eq(schema.media.userId, userId),
      eq(schema.media.status, 'conflict'),
    ))
    .all() as unknown as Media[]

  return items.map(item => ({
    media: {
      ...item,
      // 兼容旧数据：将空数组字符串转为 []（sql.js json 模式可能返回字符串）
      tags: typeof item.tags === 'string' ? JSON.parse(item.tags as string) : item.tags,
      albums: (item as any).albums ?? [],
    },
    direction: 'bidirectional' as const,
    actualLocalModifiedAt: item.localModifiedAt,
    actualCloudModifiedAt: item.cloudModifiedAt,
    localExists: item.localPath ? existsSync(item.localPath) : false,
    cloudExists: !!(item.objectName),
  }))
}

/**
 * 解决冲突：选择保留本地版本或云端版本
 */
export async function resolveConflict(
  userId: string,
  mediaId: string,
  resolution: 'keep_local' | 'keep_cloud',
): Promise<{ success: boolean; message: string }> {
  const [item] = db.select()
    .from(schema.media)
    .where(and(eq(schema.media.id, mediaId), eq(schema.media.userId, userId)))
    .limit(1)
    .all() as unknown as Media[]

  if (!item) {
    return { success: false, message: '媒体文件不存在' }
  }
  if (item.status !== 'conflict') {
    return { success: false, message: '该文件未处于冲突状态' }
  }

  const now = new Date().toISOString()

  if (resolution === 'keep_local') {
    // 保留本地版本 → 重新上传到云端覆盖
    if (!item.localPath || !existsSync(item.localPath)) {
      return { success: false, message: '本地文件不存在，无法保留本地版本' }
    }
    try {
      const buffer = readFileSync(item.localPath)
      const ext = extname(item.filename).toLowerCase()
      const md5 = createHash('md5').update(buffer).digest('hex')
      const objectName = `${userId}/${md5}${ext}`

      const { uploadToRustfs } = await import('./rustfs')
      const cloudUrl = await uploadToRustfs(objectName, buffer, item.mimeType)

      const localStat = statSync(item.localPath)

      db.update(schema.media)
        .set({
          status: 'synced',
          cloudUrl,
          objectName,
          md5: item.md5 || md5,
          localModifiedAt: localStat.mtime.toISOString(),
          cloudModifiedAt: now,
          syncedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.media.id, item.id))
        .run()
      saveDb()
      return { success: true, message: '已保留本地版本并覆盖云端' }
    } catch (err) {
      return { success: false, message: `上传失败: ${(err as Error).message}` }
    }
  } else {
    // 保留云端版本 → 重新下载到本地覆盖
    if (!item.objectName) {
      return { success: false, message: '云端对象不存在，无法保留云端版本' }
    }
    try {
      const { downloadFromRustfs } = await import('./rustfs')
      const buffer = await downloadFromRustfs(item.objectName)

      const localPath = item.localPath || join('/tmp/downloads', item.filename)
      const localDir = dirname(localPath)
      if (!existsSync(localDir)) {
        mkdirSync(localDir, { recursive: true })
      }
      writeFileSync(localPath, buffer)

      const localStat = statSync(localPath)

      db.update(schema.media)
        .set({
          status: 'synced',
          localPath,
          localModifiedAt: localStat.mtime.toISOString(),
          cloudModifiedAt: now,
          syncedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.media.id, item.id))
        .run()
      saveDb()
      return { success: true, message: '已保留云端版本并覆盖本地' }
    } catch (err) {
      return { success: false, message: `下载失败: ${(err as Error).message}` }
    }
  }
}

/**
 * 本地→云端同步（带冲突检测）
 * 将 status='local_only' 且有本地路径的文件上传到 RustFS
 * 对已存在云端对象的 local_only 文件标记为冲突
 */
export async function syncLocalToCloud(
  userId: string,
  onProgress?: ProgressCallback,
): Promise<{ uploaded: number; failed: number; conflicts: number }> {
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
  let conflicts = 0
  const total = items.length
  const { headObject } = await import('./rustfs')

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
      // 冲突检测：检查云端是否已存在同名对象
      // 使用 md5 作为 objectName 的一部分，构造可能的云端对象名
      const buffer = readFileSync(localPath)
      const ext = extname(item.filename).toLowerCase()
      const localMd5 = createHash('md5').update(buffer).digest('hex')
      let objectName = item.objectName || `${userId}/${localMd5}${ext}`
      let cloudUrl = item.cloudUrl || ''
      const localStat = statSync(localPath)

      // 检查云端是否已存在该对象
      const meta = await headObject(objectName)
      if (meta.exists) {
        // 云端已有对象 → 冲突
        db.update(schema.media)
          .set({
            status: 'conflict',
            objectName,
            cloudUrl: cloudUrl || `${meta.lastModified || ''}`,
            md5: item.md5 || localMd5,
            localModifiedAt: localStat.mtime.toISOString(),
            cloudModifiedAt: meta.lastModified,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.media.id, item.id))
          .run()
        conflicts++
        continue
      }

      // 云端不存在 → 正常上传
      db.update(schema.media)
        .set({ status: 'syncing', updatedAt: new Date().toISOString() })
        .where(eq(schema.media.id, item.id))
        .run()

      const { uploadToRustfs } = await import('./rustfs')
      cloudUrl = await uploadToRustfs(objectName, buffer, item.mimeType)

      const now = new Date().toISOString()
      db.update(schema.media)
        .set({
          status: 'synced',
          cloudUrl,
          objectName,
          md5: item.md5 || localMd5,
          localModifiedAt: localStat.mtime.toISOString(),
          cloudModifiedAt: now,
          syncedAt: now,
          updatedAt: now,
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
  return { uploaded, failed, conflicts }
}

/**
 * 云端→本地同步（带冲突检测）
 * 将 status='cloud_only' 且有 objectName 的文件下载到本地
 * 对本地已存在文件的 cloud_only 项标记为冲突
 */
export async function syncCloudToLocal(
  userId: string,
  localBaseDir: string,
  onProgress?: ProgressCallback,
): Promise<{ downloaded: number; failed: number; conflicts: number }> {
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
  let conflicts = 0
  const now = new Date().toISOString()
  const total = items.length

  for (let i = 0; i < total; i++) {
    const item = items[i]
    const objectName = item.objectName!

    onProgress?.({ total, completed: i, failed, current: item.filename })

    try {
      const localPath = join(localBaseDir, item.filename)

      // 冲突检测：本地是否已存在同名文件
      if (existsSync(localPath)) {
        // 本地已有文件 → 冲突
        const localStat = statSync(localPath)

        db.update(schema.media)
          .set({
            status: 'conflict',
            localPath,
            localModifiedAt: localStat.mtime.toISOString(),
            cloudModifiedAt: now,
            updatedAt: now,
          })
          .where(eq(schema.media.id, item.id))
          .run()
        conflicts++
        continue
      }

      // 本地不存在 → 正常下载
      db.update(schema.media)
        .set({ status: 'syncing', updatedAt: now })
        .where(eq(schema.media.id, item.id))
        .run()

      const { downloadFromRustfs } = await import('./rustfs')
      const buffer = await downloadFromRustfs(objectName)

      const localDir = dirname(localPath)
      if (!existsSync(localDir)) {
        mkdirSync(localDir, { recursive: true })
      }

      writeFileSync(localPath, buffer)

      const localStat = statSync(localPath)

      db.update(schema.media)
        .set({
          status: 'synced',
          localPath,
          localModifiedAt: localStat.mtime.toISOString(),
          cloudModifiedAt: now,
          syncedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.media.id, item.id))
        .run()

      downloaded++
    } catch (err) {
      console.error(`[Sync] Download failed for ${item.filename}:`, err)
      failed++
      db.update(schema.media)
        .set({ status: 'cloud_only', updatedAt: now })
        .where(eq(schema.media.id, item.id))
        .run()
    }

    if (i % 5 === 0) saveDb()
  }

  saveDb()
  onProgress?.({ total, completed: total, failed, current: '' })
  return { downloaded, failed, conflicts }
}
