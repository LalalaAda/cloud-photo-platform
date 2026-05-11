/** 媒体文件类型 */
export type MediaType = 'image' | 'video' | 'other'

/** 媒体文件状态 */
export type MediaStatus = 'local_only' | 'cloud_only' | 'synced' | 'syncing' | 'conflict'

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
  /** 本地文件最后修改时间（用于冲突检测） */
  localModifiedAt: string | null
  /** 云端文件最后修改时间（用于冲突检测） */
  cloudModifiedAt: string | null
  /** 上次成功同步时间戳 */
  syncedAt: string | null
}

/** 同步冲突项 */
export interface SyncConflictItem {
  media: Media
  /** 冲突方向 */
  direction: 'local_to_cloud' | 'cloud_to_local' | 'bidirectional'
  /** 本地文件实际修改时间 */
  actualLocalModifiedAt: string | null
  /** 云端文件实际修改时间 */
  actualCloudModifiedAt: string | null
  /** 本地文件是否仍存在 */
  localExists: boolean
  /** 云端文件是否仍存在 */
  cloudExists: boolean
}

/** 冲突解决请求 */
export interface ResolveConflictRequest {
  mediaId: string
  /** 保留哪一侧 */
  resolution: 'keep_local' | 'keep_cloud'
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
  /** 读取文件为缩略图 Data URL (自动缩小) */
  READ_THUMBNAIL_DATA_URL: 'file:readThumbnailDataUrl',
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
