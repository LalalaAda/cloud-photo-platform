import { create } from 'zustand'
import type { Media, ScanResult } from '@cloud-photo/shared'
import { clearCache } from './thumbnailCache'

interface MediaState {
  /** 当前目录下的所有媒体文件 */
  files: Media[]
  /** 当前扫描的目录路径 */
  currentDir: string | null
  /** 是否正在扫描 */
  loading: boolean
  /** 错误信息 */
  error: string | null
  /** 是否正在监听文件变更 */
  watching: boolean
  /** 文件变更计数（用于触发刷新） */
  changeCount: number

  /** 扫描指定目录 */
  scanDirectory: (dirPath: string) => Promise<void>
  /** 重新扫描当前目录 */
  rescanCurrentDir: () => Promise<void>
  /** 添加文件到列表 */
  addFiles: (files: Media[]) => void
  /** 从列表移除文件 */
  removeFiles: (ids: string[]) => void
  /** 更新单个文件 */
  updateFile: (id: string, updates: Partial<Media>) => void
  /** 清空列表 */
  clearFiles: () => void
  /** 设置监听状态 */
  setWatching: (watching: boolean) => void
}

export const useMediaStore = create<MediaState>((set, get) => ({
  files: [],
  currentDir: null,
  loading: false,
  error: null,
  watching: false,
  changeCount: 0,

  scanDirectory: async (dirPath: string) => {
    set({ loading: true, error: null })
    // 切换到新目录时清空缩略图缓存
    clearCache()
    try {
      const result: ScanResult = await window.electronAPI.scanDirectory(dirPath)
      set({
        files: result.files,
        currentDir: dirPath,
        loading: false,
        error: null,
      })
      // 扫描完成后启动文件监听
      try {
        await window.electronAPI.watchDirectory(dirPath)
        set({ watching: true })
      } catch {
        // 监听失败不阻塞
      }
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '扫描目录时发生错误',
      })
    }
  },

  rescanCurrentDir: async () => {
    const { currentDir } = get()
    if (!currentDir) return
    // 重新扫描前先停止监听
    try {
      await window.electronAPI.unwatchDirectory()
    } catch { /* ignore */ }
    set({ watching: false })
    await get().scanDirectory(currentDir)
  },

  addFiles: (files: Media[]) => {
    set(state => ({
      files: [...state.files, ...files],
    }))
  },

  removeFiles: (ids: string[]) => {
    const idSet = new Set(ids)
    set(state => ({
      files: state.files.filter(f => !idSet.has(f.id)),
    }))
  },

  updateFile: (id: string, updates: Partial<Media>) => {
    set(state => ({
      files: state.files.map(f => (f.id === id ? { ...f, ...updates } : f)),
    }))
  },

  clearFiles: () => {
    set({ files: [], currentDir: null, error: null })
    // 停止监听
    window.electronAPI?.unwatchDirectory().catch(() => {})
    set({ watching: false })
  },

  setWatching: (watching: boolean) => {
    set({ watching })
  },
}))
