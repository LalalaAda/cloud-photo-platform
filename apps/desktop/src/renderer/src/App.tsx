import { useState, useCallback, useEffect, useRef } from 'react'
import { useMediaStore } from './stores/mediaStore'
import { useAuthStore, authHeader } from './stores/authStore'
import { PhotoGrid } from './components/PhotoGrid'
import { ListView } from './components/ListView'
import { TopBar } from './components/TopBar'
import { Lightbox } from './components/Lightbox'
import { AuthDialog } from './components/AuthDialog'
import { ConflictDialog } from './components/ConflictDialog'
import type { Media } from '@cloud-photo/shared'
import type { ViewMode } from './types'

const SERVER_BASE = 'http://localhost:3001'

export default function App() {
  const { files, scanDirectory, rescanCurrentDir, removeFiles, loading, error, watching } = useMediaStore()
  const { token, user, logout, hydrate } = useAuthStore()
  const [lightboxMedia, setLightboxMedia] = useState<Media | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('masonry')
  const [dragOver, setDragOver] = useState(false)
  const [conflictCount, setConflictCount] = useState(0)
  const [showConflicts, setShowConflicts] = useState(false)
  const dragCounter = useRef(0)

  // 启动时从 localStorage 恢复 session
  useEffect(() => { hydrate() }, [])

  const handleOpenFolder = useCallback(async () => {
    if (!window.electronAPI) {
      return
    }
    const dir = await window.electronAPI.openDirPicker()
    if (dir) {
      await scanDirectory(dir)
      setSelectedIds(new Set())
      setFocusedId(null)
    }
  }, [scanDirectory])

  const handleMediaClick = useCallback((media: Media) => {
    setLightboxMedia(media)
  }, [])

  /** 删除选中文件 */
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0 || !window.electronAPI) return

    for (const id of selectedIds) {
      const file = files.find(f => f.id === id)
      if (file?.localPath) {
        await window.electronAPI.deleteLocalFile(file.localPath)
      }
    }
    removeFiles(Array.from(selectedIds))
    setSelectedIds(new Set())
    setFocusedId(null)
  }, [selectedIds, files, removeFiles])

  /** 全选 / 取消全选 */
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set())
      setFocusedId(null)
    } else {
      setSelectedIds(new Set(files.map(f => f.id)))
      setFocusedId(files.length > 0 ? files[0].id : null)
    }
  }, [files, selectedIds])

  /** 获取同步状态（含冲突数） */
  const fetchSyncStatus = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_BASE}/api/sync/status`, {
        headers: { ...authHeader() },
      })
      if (!res.ok) return
      const data = await res.json()
      setConflictCount(data.conflict ?? 0)
    } catch {
      // 服务未运行时忽略
    }
  }, [token])

  /** 同步到云端 */
  const handleSyncToCloud = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_BASE}/api/sync/status`, {
        headers: { ...authHeader() },
      })
      if (!res.ok) throw new Error('服务未运行')
      const data = await res.json()
      alert(
        `同步状态:\n` +
        `本地待上传: ${data.localOnly}\n` +
        `云端待下载: ${data.cloudOnly}\n` +
        `已同步: ${data.synced}\n` +
        `冲突: ${data.conflict}`
      )
      // 同步后刷新冲突数
      fetchSyncStatus()
    } catch {
      alert('无法连接同步服务，请确保后端已启动 (http://localhost:3001)')
    }
  }, [fetchSyncStatus])

  /** 首次加载时获取冲突数 */
  useEffect(() => {
    fetchSyncStatus()
  }, [fetchSyncStatus])

  /** 键盘快捷键 */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 如果灯箱开着，由 Lightbox 处理快捷键
      if (lightboxMedia) return

      // 忽略输入框中的快捷键
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      switch (true) {
        case e.key === 'Delete' || e.key === 'Backspace':
          e.preventDefault()
          handleDeleteSelected()
          break
        case e.ctrlKey && (e.key === 'a' || e.key === 'A'):
          e.preventDefault()
          handleSelectAll()
          break
        case e.key === ' ':
          // Space → 打开第一个选中或第一个文件的灯箱
          e.preventDefault()
          if (files.length === 0) return
          const target = focusedId
            ? files.find(f => f.id === focusedId)
            : files[0]
          if (target) setLightboxMedia(target)
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxMedia, files, focusedId, handleDeleteSelected, handleSelectAll])

  /** 文件变更监听（从主进程接收） */
  useEffect(() => {
    if (!window.electronAPI?.onFilesChanged) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = window.electronAPI.onFilesChanged(() => {
      // 文件变更时延迟 2 秒后自动重新扫描
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        rescanCurrentDir()
      }, 2000)
    })
    return () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [rescanCurrentDir])

  /** 拖拽上传 */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    dragCounter.current = 0

    const items = e.dataTransfer.items
    if (!items) return

    // 尝试提取文件夹路径（Electron 拖拽文件夹会携带路径）
    const files_list = e.dataTransfer.files
    if (files_list.length > 0) {
      // 优先取第一个文件夹或文件所在目录
      const firstPath = (files_list[0] as any).path
      if (firstPath) {
        await scanDirectory(firstPath)
        setSelectedIds(new Set())
        setFocusedId(null)
        return
      }
    }

    // 检查是否有文件夹被拖入（Electron 拖拽）
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.()
      if (entry?.isDirectory && (entry as any).fullPath) {
        // webkitGetAsEntry 拿到的 fullPath 是 /dirname 格式
        // 在 Electron 中，需要通过 file.path 获取实际路径
        const file = files_list[i]
        if (file && (file as any).path) {
          await scanDirectory((file as any).path)
          setSelectedIds(new Set())
          setFocusedId(null)
        }
        return
      }
    }
  }, [scanDirectory])

  return (
    <div
      className="h-screen flex flex-col overflow-hidden bg-zinc-950 text-zinc-100"
      onDragEnter={handleDragEnter}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      {/* 顶部工具栏 */}
      <TopBar
        onOpenFolder={handleOpenFolder}
        onRescan={rescanCurrentDir}
        onSyncToCloud={handleSyncToCloud}
        onOpenConflicts={() => setShowConflicts(true)}
        fileCount={files.length}
        loading={loading}
        watching={watching}
        conflictCount={conflictCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        user={user}
        onLogout={logout}
      />

      {/* 选中状态栏 */}
      {selectedIds.size > 0 && (
        <div className="mx-4 mt-2 px-3 py-1.5 flex items-center gap-3 bg-blue-900/30 border border-blue-700/50 rounded-lg text-sm">
          <span className="text-blue-200">已选中 {selectedIds.size} 项</span>
          <span className="text-zinc-500">|</span>
          <button
            onClick={handleDeleteSelected}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            删除 (Delete)
          </button>
          <span className="text-zinc-500">|</span>
          <button
            onClick={handleSelectAll}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {selectedIds.size === files.length ? '取消全选' : '全选'}
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mt-2 px-4 py-2 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden">
        {files.length === 0 && !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-lg mb-2">打开一个文件夹以查看照片</p>
            <p className="text-sm text-zinc-600">
              点击上方「打开文件夹」按钮，或拖拽文件夹到窗口
            </p>
            <div className="mt-6 flex gap-4 text-xs text-zinc-700">
              <span>Space 预览</span>
              <span>Ctrl+A 全选</span>
              <span>Delete 删除</span>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          <ListView
            files={files}
            onMediaClick={handleMediaClick}
            selectedIds={selectedIds}
            onToggleSelect={(id) => {
              setSelectedIds(prev => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }}
          />
        ) : (
          <PhotoGrid
            files={files}
            onMediaClick={handleMediaClick}
            selectedIds={selectedIds}
            onToggleSelect={(id) => {
              setSelectedIds(prev => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }}
            layout={viewMode}
          />
        )}
      </main>

      {/* 拖拽浮层 */}
      {dragOver && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-40 rounded-2xl border-2 border-dashed border-blue-400/60 bg-blue-500/10 backdrop-blur-sm flex flex-col items-center justify-center">
            <svg className="w-10 h-10 text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-blue-300 text-sm">拖拽文件夹以打开</span>
          </div>
        </div>
      )}

      {/* 灯箱预览 */}
      {lightboxMedia && (
        <Lightbox
          media={lightboxMedia}
          onClose={() => setLightboxMedia(null)}
          onPrev={() => {
            const idx = files.findIndex(f => f.id === lightboxMedia.id)
            if (idx > 0) setLightboxMedia(files[idx - 1])
          }}
          onNext={() => {
            const idx = files.findIndex(f => f.id === lightboxMedia.id)
            if (idx < files.length - 1) setLightboxMedia(files[idx + 1])
          }}
          allFiles={files}
        />
      )}

      {/* 冲突处理弹窗 */}
      {showConflicts && (
        <ConflictDialog
          onClose={() => {
            setShowConflicts(false)
            // 关闭后刷新冲突数
            fetchSyncStatus()
          }}
        />
      )}

      {/* 未认证 → 全屏登录/注册 */}
      {!token && <AuthDialog />}
    </div>
  )
}
