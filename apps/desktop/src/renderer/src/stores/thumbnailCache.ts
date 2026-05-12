/**
 * 缩略图缓存系统
 *
 * 三层架构:
 *   L1: 内存 LRU (当前 session 即时访问)
 *   L2: IndexedDB (跨 session 持久化, 通过 Web Worker)
 *   L3: IPC → Main Process sharp 生成 (回退)
 *
 * 缓存键: media.md5 (基于文件 size + mtime 的哈希, 文件变化时自动失效)
 *
 * 存储格式: 使用 raw Uint8Array + MIME, 渲染端通过 createObjectURL 转为 Blob URL
 *   (相比旧版 base64 节省 ~33% 传输体积, 避免 base64 解码开销)
 */
import type { Media } from '@cloud-photo/shared'

/** 缓存条目: 二进制数据 + MIME 类型 */
export interface ThumbnailItem {
  data: Uint8Array
  mime: string
}

// ====== 内存 LRU 缓存 ======

const MEMORY_CACHE_MAX = 800
const memoryCache = new Map<string, ThumbnailItem>()

function memoryGet(key: string): ThumbnailItem | undefined {
  const val = memoryCache.get(key)
  if (val !== undefined) {
    // 移到末尾 (LRU)
    memoryCache.delete(key)
    memoryCache.set(key, val)
  }
  return val
}

function memorySet(key: string, item: ThumbnailItem): void {
  if (memoryCache.has(key)) {
    memoryCache.delete(key)
  } else if (memoryCache.size >= MEMORY_CACHE_MAX) {
    // 淘汰最久未访问的条目
    const oldest = memoryCache.keys().next().value
    if (oldest !== undefined) memoryCache.delete(oldest)
  }
  memoryCache.set(key, item)
}

// ====== Web Worker 通信 ======

let worker: Worker | null = null
let workerReady = false
let requestId = 0
const pendingRequests = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>()

function getWorker(): Worker | null {
  if (worker) return worker

  try {
    worker = new Worker(new URL('../workers/imageWorker.ts', import.meta.url), { type: 'module' })

    worker.onmessage = (e) => {
      const { id, data, error } = e.data
      const pending = pendingRequests.get(id)
      if (!pending) return
      pendingRequests.delete(id)

      if (error) {
        pending.reject(new Error(error))
      } else {
        pending.resolve(data)
      }
    }

    worker.onerror = (err) => {
      console.error('[ThumbnailCache] Worker 错误:', err)
      workerReady = false
    }

    workerReady = true
    return worker
  } catch (err) {
    console.error('[ThumbnailCache] Worker 初始化失败:', err)
    worker = null
    workerReady = false
    return null
  }
}

function postToWorker(type: string, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = getWorker()
    if (!w) {
      // Worker 不可用: 静默降级
      resolve(null)
      return
    }

    const id = ++requestId
    pendingRequests.set(id, { resolve, reject })

    try {
      w.postMessage({ id, type, payload })
    } catch (err) {
      pendingRequests.delete(id)
      reject(err)
    }

    // 30s 超时保护
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id)
        resolve(null)
      }
    }, 30000)
  })
}

// ====== 公开 API ======

/**
 * 获取缩略图: L1 内存 → L2 IndexedDB → null
 * 调用方在得到 null 后应发起 IPC 获取, 然后通过 setThumbnail 回填
 */
export async function getThumbnail(media: Media): Promise<ThumbnailItem | null> {
  const key = media.md5
  if (!key) return null

  // L1: 内存 LRU
  const mem = memoryGet(key)
  if (mem !== undefined) return mem

  // L2: IndexedDB (通过 Worker)
  try {
    const data = await postToWorker('get', { cacheKey: key })
    if (data) {
      const item: ThumbnailItem = { data: new Uint8Array(data.data), mime: data.mime }
      memorySet(key, item)
      return item
    }
  } catch {
    // Worker 不可用, 继续 L3
  }

  return null
}

/**
 * 存入缩略图缓存: L1 内存 + L2 IndexedDB
 */
export async function setThumbnail(media: Media, item: ThumbnailItem): Promise<void> {
  const key = media.md5
  if (!key || !item) return

  // L1: 内存
  memorySet(key, item)

  // L2: IndexedDB (fire-and-forget, 不阻塞 UI)
  postToWorker('set', { cacheKey: key, data: item.data, mime: item.mime }).catch(() => {})
}

/**
 * 将 ThumbnailItem 转为 Blob URL
 * 调用方负责在适当时机 URL.revokeObjectURL()
 */
export function thumbnailToBlobUrl(item: ThumbnailItem): string {
  const blob = new Blob([item.data], { type: item.mime })
  return URL.createObjectURL(blob)
}

/**
 * 清除缓存 (例如重新扫描目录时)
 */
export async function clearCache(): Promise<void> {
  memoryCache.clear()
  postToWorker('clear', {}).catch(() => {})
}

/**
 * 删除指定条目的缓存
 */
export async function deleteCacheEntry(media: Media): Promise<void> {
  const key = media.md5
  if (!key) return
  memoryCache.delete(key)
  postToWorker('delete', { cacheKey: key }).catch(() => {})
}
