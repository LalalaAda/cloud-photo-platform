/** 图片支持的文件扩展名 */
export const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.svg', '.avif', '.heic', '.heif',
])

/** 视频支持的文件扩展名 */
export const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.webm', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.m4v',
])

/** 支持的所有媒体扩展名 */
export const MEDIA_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS])

/** 图片 MIME 类型集合 */
export const IMAGE_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  'image/tiff', 'image/svg+xml', 'image/avif',
])

/** 虚拟滚动配置 */
export const VIRTUAL_SCROLL = {
  /** 默认项高度 (px) */
  DEFAULT_ITEM_HEIGHT: 200,
  /** 上下缓冲区大小 (项数) */
  BUFFER_SIZE: 5,
  /** 滚动节流间隔 (ms) */
  SCROLL_THROTTLE: 16,
  /** 容器高度 (px) */
  CONTAINER_HEIGHT: 800,
} as const

/** 瀑布流配置 */
export const MASONRY = {
  /** 列宽 (px) */
  COLUMN_WIDTH: 280,
  /** 列间距 (px) */
  GAP: 12,
  /** 最小列数 */
  MIN_COLUMNS: 2,
  /** 最大列数 */
  MAX_COLUMNS: 8,
} as const

/** 分页默认值 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
} as const
