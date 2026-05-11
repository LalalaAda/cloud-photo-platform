/// <reference types="vite/client" />

import type { ScanResult, SyncConflictItem } from '@cloud-photo/shared'

interface FileChangeEvent {
  type: string
  filename: string
  fullPath: string
}

interface SyncStatusResponse {
  localOnly: number
  cloudOnly: number
  synced: number
  syncing: number
  conflict: number
  total: number
}

declare global {
  interface Window {
    electronAPI: {
      scanDirectory: (dirPath: string) => Promise<ScanResult>
      readFileDataUrl: (filePath: string) => Promise<string>
      /** 读取缩略图 Data URL (sharp 缩小, 大幅降低 IPC 传输量) */
      readThumbnailDataUrl: (filePath: string) => Promise<string>
      deleteLocalFile: (filePath: string) => Promise<boolean>
      openFilePicker: () => Promise<string[] | null>
      openDirPicker: () => Promise<string | null>
      getAppPath: (name: string) => Promise<string>
      clipboardWrite: (text: string) => Promise<void>
      openExternal: (url: string) => Promise<void>
      /** 开始监听目录文件变化 */
      watchDirectory: (dirPath: string) => Promise<boolean>
      /** 停止文件监听 */
      unwatchDirectory: () => Promise<boolean>
      /** 注册文件变更回调 */
      onFilesChanged: (callback: (data: FileChangeEvent) => void) => () => void
    }
  }
}
