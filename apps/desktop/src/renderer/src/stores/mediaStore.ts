import { create } from 'zustand'
import type { Media, ScanResult } from '@cloud-photo/shared'

interface MediaState {
  /** 当前目录下的所有媒体文件 */
  files: Media[]
  /** 当前扫描的目录路径 */
  currentDir: string | null
  /** 是否正在扫描 */
  loading: boolean
  /** 错误信息 */
  error: string | null

  /** 扫描指定目录 */
  scanDirectory: (dirPath: string) => Promise<void>
  /** 添加文件到列表 */
  addFiles: (files: Media[]) => void
  /** 从列表移除文件 */
  removeFiles: (ids: string[]) => void
  /** 更新单个文件 */
  updateFile: (id: string, updates: Partial<Media>) => void
  /** 清空列表 */
  clearFiles: () => void
}

export const useMediaStore = create<MediaState>((set, get) => ({
  files: [],
  currentDir: null,
  loading: false,
  error: null,

  scanDirectory: async (dirPath: string) => {
    set({ loading: true, error: null })
    try {
      const result: ScanResult = await window.electronAPI.scanDirectory(dirPath)
      set({
        files: result.files,
        currentDir: dirPath,
        loading: false,
        error: null,
      })
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '扫描目录时发生错误',
      })
    }
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
  },
}))
