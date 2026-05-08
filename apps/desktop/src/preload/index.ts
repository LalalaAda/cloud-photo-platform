import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '@cloud-photo/shared'
import type { ScanResult } from '@cloud-photo/shared'

const api = {
  /** 扫描本地目录 */
  scanDirectory: (dirPath: string): Promise<ScanResult> =>
    ipcRenderer.invoke(IpcChannels.SCAN_DIRECTORY, dirPath),

  /** 读取文件为 Data URL */
  readFileDataUrl: (filePath: string): Promise<string> =>
    ipcRenderer.invoke(IpcChannels.READ_FILE_DATA_URL, filePath),

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
}

contextBridge.exposeInMainWorld('electronAPI', api)
