import { FolderOpen, Search, Grid3X3, List, LayoutGrid } from 'lucide-react'

interface TopBarProps {
  onOpenFolder: () => void
  fileCount: number
  loading: boolean
}

export function TopBar({ onOpenFolder, fileCount, loading }: TopBarProps) {
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
