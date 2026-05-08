import { FolderOpen, Search, Grid3X3, List, LayoutGrid, RefreshCw, Upload, Eye, AlertTriangle } from 'lucide-react'

interface TopBarProps {
  onOpenFolder: () => void
  onRescan?: () => void
  onSyncToCloud?: () => void
  onOpenConflicts?: () => void
  fileCount: number
  loading: boolean
  watching: boolean
  conflictCount: number
}

export function TopBar({
  onOpenFolder,
  onRescan,
  onSyncToCloud,
  onOpenConflicts,
  fileCount,
  loading,
  watching,
  conflictCount,
}: TopBarProps) {
  return (
    <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800/60">
      {/* 打开文件夹按钮 */}
      <button
        onClick={onOpenFolder}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 transition-colors text-sm"
      >
        <FolderOpen size={16} />
        <span>打开文件夹</span>
      </button>

      {/* 重新扫描 */}
      {onRescan && (
        <button
          onClick={onRescan}
          disabled={loading}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-xs text-zinc-400"
          title="重新扫描当前目录"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>刷新</span>
        </button>
      )}

      {/* 同步到云端 */}
      {onSyncToCloud && (
        <button
          onClick={onSyncToCloud}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 transition-colors text-xs text-blue-300"
          title="上传到云端存储"
        >
          <Upload size={14} />
          <span>同步到云端</span>
        </button>
      )}

      {/* 冲突处理 */}
      {conflictCount > 0 && onOpenConflicts && (
        <button
          onClick={onOpenConflicts}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 transition-colors text-xs text-amber-300"
          title={`${conflictCount} 个文件存在同步冲突`}
        >
          <AlertTriangle size={14} />
          <span>冲突 ({conflictCount})</span>
        </button>
      )}

      {/* 文件监听指示器 */}
      {watching && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-900/20 border border-green-700/30 text-xs text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span>实时监控中</span>
        </div>
      )}

      {/* 分隔线 */}
      <div className="w-px h-5 bg-zinc-700" />

      {/* 视图切换 */}
      <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-0.5">
        <button className="p-1.5 rounded-md bg-zinc-700/60 text-zinc-100" title="网格视图">
          <Grid3X3 size={16} />
        </button>
        <button className="p-1.5 rounded-md hover:bg-zinc-700/30 text-zinc-400" title="瀑布流视图">
          <LayoutGrid size={16} />
        </button>
        <button className="p-1.5 rounded-md hover:bg-zinc-700/30 text-zinc-400" title="列表视图">
          <List size={16} />
        </button>
      </div>

      {/* 搜索框 */}
      <div className="relative flex-1 max-w-xs ml-auto">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="搜索文件..."
          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
        />
      </div>

      {/* 文件计数 */}
      <span className="text-xs text-zinc-500 tabular-nums">
        {loading ? '扫描中...' : `${fileCount.toLocaleString()} 个文件`}
      </span>
    </header>
  )
}
