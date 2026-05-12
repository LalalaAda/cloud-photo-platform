import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '@cloud-photo/shared'
import type { ScanResult } from '@cloud-photo/shared'

const api = {
  /** 扫描本地目录 */
  scanDirectory: (dirPath: string): Promise<ScanResult> =>
    ipcRenderer.invoke(IpcChannels.SCAN_DIRECTORY, dirPath),

  /** 读取文件为 raw Buffer + MIME (渲染端通过 createObjectURL 转为 Blob URL) */
  readFileDataUrl: (filePath: string): Promise<{ data: Uint8Array; mime: string } | null> =>
    ipcRenderer.invoke(IpcChannels.READ_FILE_DATA_URL, filePath),

  /** 读取缩略图为 raw Buffer + MIME (sharp 缩小, IPC 传输量比 base64 低 ~33%) */
  readThumbnailDataUrl: (filePath: string): Promise<{ data: Uint8Array; mime: string } | null> =>
    ipcRenderer.invoke(IpcChannels.READ_THUMBNAIL_DATA_URL, filePath),

  /** 删除本地文件 */
  deleteLocalFile: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.DELETE_LOCAL_FILE, filePath),

  /** 打开文件选择器 */
  openFilePicker: () => ipcRenderer.invoke(IpcChannels.OPEN_FILE_PICKER),

  /** 打开目录选择器 */
  openDirPicker: () => ipcRenderer.invoke(IpcChannels.OPEN_DIR_PICKER),

  /** 获取应用路径 */
  getAppPath: (name: string): Promise<string> =>
    ipcRenderer.invoke(IpcChannels.GET_APP_PATH, name),

  /** 写入剪贴板 */
  clipboardWrite: (text: string): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.CLIPBOARD_WRITE, text),

  /** 打开外部链接 */
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.OPEN_EXTERNAL, url),

  /** 开始监听目录文件变化 */
  watchDirectory: (dirPath: string): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.WATCH_DIRECTORY, dirPath),

  /** 停止文件监听 */
  unwatchDirectory: (): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.UNWATCH_DIRECTORY),

  /** 注册文件变更回调（返回取消函数） */
  onFilesChanged: (callback: (data: { type: string; filename: string; fullPath: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data)
    ipcRenderer.on(IpcChannels.FILES_CHANGED, handler)
    return () => {
      ipcRenderer.removeListener(IpcChannels.FILES_CHANGED, handler)
    }
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
