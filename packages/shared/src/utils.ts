import { IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, IMAGE_MIME_TYPES } from './constants'
import type { Media, MediaType, MediaStatus } from './types'

/** 根据文件扩展名判断媒体类型 */
export function getMediaTypeByExtension(filename: string): MediaType {
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  return 'other'
}

/** 根据 MIME 判断媒体类型 */
export function getMediaTypeByMime(mime: string): MediaType {
  if (IMAGE_MIME_TYPES.has(mime)) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return 'other'
}

/** 格式化文件大小 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const idx = Math.min(i, units.length - 1)
  return `${(bytes / Math.pow(k, idx)).toFixed(idx > 0 ? 1 : 0)} ${units[idx]}`
}

/** 生成唯一 ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** 判断文件是否为图片 */
export function isImageFile(filename: string): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  return IMAGE_EXTENSIONS.has(ext)
}

/** 判断文件是否为视频 */
export function isVideoFile(filename: string): boolean {
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  return VIDEO_EXTENSIONS.has(ext)
}

/** 默认媒体对象工厂 */
export function createMedia(partial: Partial<Media> = {}): Media {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    localPath: null,
    cloudUrl: null,
    objectName: null,
    filename: 'untitled',
    mimeType: 'application/octet-stream',
    mediaType: 'other',
    size: 0,
    width: null,
    height: null,
    md5: null,
    status: 'local_only' as MediaStatus,
    isFavorite: false,
    rating: 0,
    tags: [],
    albums: [],
    createdAt: now,
    updatedAt: now,
    takenAt: null,
    ...partial,
  }
}

/** 浏览器友好的提取文件名 */
export function getBasename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || ''
}
