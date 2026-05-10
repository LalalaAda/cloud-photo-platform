import { useState, useEffect, useRef, useCallback } from 'react'
import { formatFileSize } from '@cloud-photo/shared'
import type { Media } from '@cloud-photo/shared'

interface ListViewProps {
  files: Media[]
  onMediaClick: (media: Media) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

/**
 * 列表视图 — 以表格行展示文件信息
 */
export function ListView({ files, onMediaClick, selectedIds, onToggleSelect }: ListViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)

  const ROW_HEIGHT = 48
  const BUFFER = 5

  // ResizeObserver 监听容器高度
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })
    observer.observe(el)
    setContainerHeight(el.clientHeight)
    return () => observer.disconnect()
  }, [])

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])

  // 可见范围
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER)
  const endIdx = Math.min(files.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER)
  const visibleItems = files.slice(startIdx, endIdx)
  const totalHeight = files.length * ROW_HEIGHT
  const offsetY = startIdx * ROW_HEIGHT

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto"
      onScroll={handleScroll}
    >
      {/* 表头 */}
      <div
        className="sticky top-0 z-10 flex items-center h-10 px-4 text-xs text-zinc-500 bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-800"
      >
        <span className="w-10 flex-shrink-0" />
        <span className="flex-1 min-w-0">文件名</span>
        <span className="w-24 flex-shrink-0 text-right">大小</span>
        <span className="w-28 flex-shrink-0 text-right">修改时间</span>
        <span className="w-20 flex-shrink-0 text-center">类型</span>
      </div>

      {/* 列表行 */}
      <div style={{ height: totalHeight - 40, position: 'relative' }}>
        <div
          style={{ transform: `translateY(${offsetY}px)` }}
        >
          {visibleItems.map((media) => {
            const isSelected = selectedIds?.has(media.id) ?? false
            return (
              <div
                key={media.id}
                className={`flex items-center h-12 px-4 border-b border-zinc-800/50 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-900/30 hover:bg-blue-900/40'
                    : 'hover:bg-zinc-800/50'
                }`}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    onToggleSelect?.(media.id)
                  } else {
                    onMediaClick(media)
                  }
                }}
                onDoubleClick={() => onToggleSelect?.(media.id)}
              >
                {/* 选中指示 */}
                <span className="w-10 flex-shrink-0 text-xs">
                  {isSelected && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-500 text-white text-[10px]">
                      ✓
                    </span>
                  )}
                </span>

                {/* 文件名 */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  {/* 缩略图 */}
                  <ThumbnailPreview media={media} />
                  <span className="text-sm text-zinc-200 truncate">{media.filename}</span>
                </div>

                {/* 大小 */}
                <span className="w-24 flex-shrink-0 text-right text-xs text-zinc-400 tabular-nums">
                  {formatFileSize(media.size)}
                </span>

                {/* 修改时间 */}
                <span className="w-28 flex-shrink-0 text-right text-xs text-zinc-500 tabular-nums">
                  {formatDate(media.updatedAt)}
                </span>

                {/* 类型 */}
                <span className="w-20 flex-shrink-0 text-center text-xs text-zinc-500">
                  {media.mediaType === 'image' ? '图片' : media.mediaType === 'video' ? '视频' : '其他'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** 列表缩略图预览 */
function ThumbnailPreview({ media }: { media: Media }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!media.localPath || !window.electronAPI) return
    let cancelled = false

    window.electronAPI.readFileDataUrl(media.localPath).then((url) => {
      if (!cancelled) setDataUrl(url)
    })

    return () => { cancelled = true }
  }, [media.localPath])

  return (
    <div className="w-8 h-8 rounded overflow-hidden bg-zinc-700 flex-shrink-0">
      {dataUrl ? (
        <img src={dataUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-zinc-700 animate-pulse" />
      )}
    </div>
  )
}

/** 格式化日期 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
