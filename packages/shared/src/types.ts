/** 媒体文件类型 */
export type MediaType = 'image' | 'video' | 'other'

/** 媒体文件状态 */
export type MediaStatus = 'local_only' | 'cloud_only' | 'synced' | 'syncing'

/** 媒体文件元数据 */
export interface Media {
  id: string
  /** 本地文件路径 (Electron 端) */
  localPath: string | null
  /** 云端 URL (Server 端) */
  cloudUrl: string | null
  /** MinIO 对象名 */
  objectName: string | null
  filename: string
  mimeType: string
  mediaType: MediaType
  size: number
  width: number | null
  height: number | null
  md5: string | null
  status: MediaStatus
  isFavorite: boolean
  rating: number
  tags: string[]
  albums: string[]
  createdAt: string
  updatedAt: string
  /** EXIF 拍摄时间 */
  takenAt: string | null
}

/** 相册 */
export interface Album {
  id: string
  name: string
  description: string
  coverMediaId: string | null
  mediaCount: number
  createdAt: string
  updatedAt: string
}

/** 用户 */
export interface User {
  id: string
  username: string
  email: string
  avatar: string | null
  createdAt: string
}

/** 分页参数 */
export interface PaginationParams {
  page: number
  pageSize: number
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/** 排序方向 */
export type SortDirection = 'asc' | 'desc'

/** 媒体文件排序字段 */
export type MediaSortField = 'filename' | 'size' | 'createdAt' | 'takenAt'

/** 媒体文件查询参数 */
export interface MediaQueryParams extends PaginationParams {
  search?: string
  mediaType?: MediaType
  status?: MediaStatus
  isFavorite?: boolean
  tags?: string[]
  albumId?: string
  sortBy?: MediaSortField
  sortDir?: SortDirection
}

/** IPC 通道名 */
export const IpcChannels = {
  /** 扫描本地目录 */
  SCAN_DIRECTORY: 'scan:directory',
  /** 获取文件元数据 */
  GET_FILE_META: 'file:getMeta',
  /** 打开文件选择器 */
  OPEN_FILE_PICKER: 'file:openPicker',
  /** 打开目录选择器 */
  OPEN_DIR_PICKER: 'file:openDirPicker',
  /** 读取文件为 Data URL */
  READ_FILE_DATA_URL: 'file:readDataUrl',
  /** 删除本地文件 */
  DELETE_LOCAL_FILE: 'file:delete',
  /** 获取应用路径 */
  GET_APP_PATH: 'app:getPath',
  /** 写入剪贴板 */
  CLIPBOARD_WRITE: 'clipboard:write',
  /** 打开外部链接 */
  OPEN_EXTERNAL: 'shell:openExternal',
  /** 文件系统监听 */
  WATCH_DIRECTORY: 'fs:watchDirectory',
  UNWATCH_DIRECTORY: 'fs:unwatchDirectory',
  /** 文件变更通知（主→渲染） */
  FILES_CHANGED: 'fs:filesChanged',
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]

/** 文件扫描结果 */
export interface ScanResult {
  files: Media[]
  scannedCount: number
  elapsed: number
}
