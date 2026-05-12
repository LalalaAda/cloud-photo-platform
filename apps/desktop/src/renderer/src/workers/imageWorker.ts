/**
 * 图片处理 Web Worker
 *
 * 职责:
 * 1. IndexedDB 缩略图缓存管理 (持久化, 存储 raw Uint8Array + MIME)
 * 2. OffscreenCanvas 图片压缩 (未来可扩展)
 *
 * 通信协议: { id, type, payload } → { id, type, data?, error? }
 */

interface CacheEntry {
  /** 缓存键: filePath::size::mtime */
  cacheKey: string
  /** Raw thumbnail binary data */
  data: Uint8Array
  /** MIME type (e.g. 'image/webp') */
  mime: string
  /** 创建时间戳 */
  createdAt: number
  /** 最近访问时间戳 (LRU) */
  lastAccessed: number
}

interface WorkerRequest {
  id: number
  type: 'get' | 'set' | 'delete' | 'clear' | 'compress'
  payload: any
}

interface WorkerResponse {
  id: number
  type: string
  data?: any
  error?: string
}

// ====== IndexedDB ======

const DB_NAME = 'cloud-photo-thumbnails'
const DB_VERSION = 2 // v2: 存储格式从 base64 字符串改为 Uint8Array + MIME
const STORE_NAME = 'thumbnails'
const MAX_CACHE_ENTRIES = 3000
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 天

let db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db)

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      // v2: 删除旧 store (base64 字符串格式), 重建为 Uint8Array + MIME 格式
      if (event.oldVersion < 2) {
        const result = request.result
        if (result.objectStoreNames.contains(STORE_NAME)) {
          result.deleteObjectStore(STORE_NAME)
        }
        const store = result.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' })
        store.createIndex('lastAccessed', 'lastAccessed', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = () => {
      db = request.result

      // 数据库连接关闭时重置引用
      db.onclose = () => { db = null }
      db.onversionchange = () => { db = null }

      resolve(db!)
    }

    request.onerror = () => reject(request.error)
  })
}

async function dbGet(cacheKey: string): Promise<{ data: Uint8Array; mime: string } | null> {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(cacheKey)

      req.onsuccess = () => {
        if (!req.result) return resolve(null)
        const entry: CacheEntry = req.result

        // 更新访问时间 (fire-and-forget)
        const updateTx = database.transaction(STORE_NAME, 'readwrite')
        updateTx.objectStore(STORE_NAME).put({
          ...entry,
          lastAccessed: Date.now(),
        })

        resolve({ data: new Uint8Array(entry.data), mime: entry.mime })
      }

      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

async function dbSet(cacheKey: string, data: Uint8Array, mime: string): Promise<void> {
  try {
    const database = await openDB()
    const now = Date.now()

    const tx = database.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    store.put({ cacheKey, data, mime, createdAt: now, lastAccessed: now } as CacheEntry)

    // 异步清理过期条目 (不等待完成)
    dbCleanup(database)
  } catch {
    // IndexedDB 不可用时静默失败
  }
}

async function dbDelete(cacheKey: string): Promise<void> {
  try {
    const database = await openDB()
    const tx = database.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(cacheKey)
  } catch {
    // 静默失败
  }
}

async function dbClear(): Promise<void> {
  try {
    const database = await openDB()
    const tx = database.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).clear()
  } catch {
    // 静默失败
  }
}

/** 清理过期条目 + 超出上限的条目 */
async function dbCleanup(database: IDBDatabase): Promise<void> {
  try {
    const tx = database.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const countReq = store.count()

    countReq.onsuccess = () => {
      const count = countReq.result
      if (count <= MAX_CACHE_ENTRIES) return

      // 超出上限: 按 lastAccessed 淘汰最旧的
      const cleanupTx = database.transaction(STORE_NAME, 'readwrite')
      const cleanupStore = cleanupTx.objectStore(STORE_NAME)
      const index = cleanupStore.index('lastAccessed')
      const range = IDBKeyRange.upperBound(Date.now() - CACHE_MAX_AGE_MS)
      const cursorReq = index.openCursor(range)

      let deleted = 0
      const toDelete = count - MAX_CACHE_ENTRIES + 500 // 一次多删一些

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (cursor && deleted < toDelete) {
          cleanupStore.delete(cursor.primaryKey)
          deleted++
          cursor.continue()
        }
      }
    }
  } catch {
    // 静默失败
  }
}

// ====== OffscreenCanvas 压缩 (未来可扩展) ======

async function compressImage(dataUrl: string, maxWidth = 400, quality = 0.7): Promise<string> {
  try {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    const bitmap = await createImageBitmap(blob)

    const width = Math.min(bitmap.width, maxWidth)
    const height = Math.round(width * (bitmap.height / bitmap.width))

    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('OffscreenCanvas 2D context 不可用')

    ctx.drawImage(bitmap, 0, 0, width, height)
    const compressedBlob = await canvas.convertToBlob({ type: 'image/webp', quality })
    bitmap.close()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(compressedBlob)
    })
  } catch {
    return dataUrl
  }
}

// ====== Worker 消息处理 ======

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = e.data

  try {
    switch (type) {
      case 'get': {
        const data = await dbGet(payload.cacheKey)
        self.postMessage({ id, type, data } as WorkerResponse)
        break
      }

      case 'set': {
        await dbSet(payload.cacheKey, payload.data, payload.mime)
        self.postMessage({ id, type } as WorkerResponse)
        break
      }

      case 'delete': {
        await dbDelete(payload.cacheKey)
        self.postMessage({ id, type } as WorkerResponse)
        break
      }

      case 'clear': {
        await dbClear()
        self.postMessage({ id, type } as WorkerResponse)
        break
      }

      case 'compress': {
        const compressed = await compressImage(payload.dataUrl, payload.maxWidth, payload.quality)
        self.postMessage({ id, type, data: compressed } as WorkerResponse)
        break
      }

      default:
        self.postMessage({ id, type, error: `未知操作: ${type}` } as WorkerResponse)
    }
  } catch (err) {
    self.postMessage({ id, type, error: String(err) } as WorkerResponse)
  }
}
