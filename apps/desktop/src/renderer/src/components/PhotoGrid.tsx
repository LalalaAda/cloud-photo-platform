import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { VIRTUAL_SCROLL, MASONRY, formatFileSize, isImageFile } from '@cloud-photo/shared'
import type { Media } from '@cloud-photo/shared'
import { getThumbnail, setThumbnail } from '../stores/thumbnailCache'

interface PhotoGridProps {
  files: Media[]
  onMediaClick: (media: Media) => void
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  layout?: 'masonry' | 'grid'
}

/** 列数范围: grid 多列(6-9列), masonry 少列(4-6列) */
const GRID_COL_RANGE = { min: 6, max: 9 }
const MASONRY_COL_RANGE = { min: 4, max: 6 }

/** 响应式计算列数 — 容器越宽列越多, 在 min~max 范围内 */
function calcColumnCount(containerWidth: number, range: { min: number; max: number }): number {
  const WIDTH_MIN = 800
  const WIDTH_MAX = 1600
  const ratio = Math.min(1, Math.max(0, (containerWidth - WIDTH_MIN) / (WIDTH_MAX - WIDTH_MIN)))
  const count = Math.round(range.min + ratio * (range.max - range.min))
  return Math.max(range.min, Math.min(count, range.max))
}

/** 单个缩略图项 — 使用缩略图 IPC + async decode 优化 */
function Thumbnail({ media, onClick, onSelect, width, isSelected }: {
  media: Media
  onClick: () => void
  onSelect: () => void
  width: number
  isSelected: boolean
}) {
  const [loaded, setLoaded] = useState(false)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [mediaWidth, setMediaWidth] = useState<number | null>(null)
  const [mediaHeight, setMediaHeight] = useState<number | null>(null)
  const [vheight, setVHeight] = useState<number | 'auto'>(width)
  const [vwidth, setVWidth] = useState<number | 'auto'>(width)

  useEffect(() => {
    if (!media.localPath || !window.electronAPI) return
    let cancelled = false

    /** 异步加载并解码图片 */
    function loadAndDecode(url: string) {
      const img = new Image()
      img.src = url
      if (img.decode) {
        img.decode().then(() => {
          if (!cancelled) {
            setMediaWidth(img.naturalWidth)
            setMediaHeight(img.naturalHeight)
            setDataUrl(url); 
            setLoaded(true)
          }
        }).catch(() => {
          if (!cancelled) setDataUrl(url)
        })
      } else {
        if (!cancelled) setDataUrl(url)
      }
    }

    // L1+L2: 检查缓存 (内存 LRU → IndexedDB)
    getThumbnail(media).then((cachedUrl) => {
      if (cancelled) return
      if (cachedUrl) {
        loadAndDecode(cachedUrl)
        return
      }

      // L3: 通过 IPC 请求缩略图 (主进程 sharp 生成)
      window.electronAPI.readThumbnailDataUrl(media.localPath).then((url) => {
        if (cancelled) return
        if (url) {
          // 异步回填缓存 (不阻塞展示)
          setThumbnail(media, url)
          loadAndDecode(url)
        } else {
          // 非图片(视频等): 回退到原图读取
          window.electronAPI.readFileDataUrl(media.localPath).then((fallbackUrl) => {
            if (!cancelled) setDataUrl(fallbackUrl)
          })
        }
      })
    })

    return () => { cancelled = true }
  }, [media.localPath, media.md5])

  // // 估算高度（保持宽高比）
  useEffect(() => {
    const aspectRatio = mediaWidth && mediaHeight ? mediaWidth / mediaHeight : 1
    let vheight: number | 'auto' = width
    let vwidth: number | 'auto' = width
    if (aspectRatio >= 1) {
      vheight = Math.round(width / aspectRatio)
    } else {
      vwidth = Math.round(width * aspectRatio)
    }
    setVHeight(vheight)
    setVWidth(vwidth)
  }, [mediaWidth, mediaHeight])
  

  // 内存管理: 组件卸载时释放 dataUrl
  useEffect(() => {
    return () => {
      // dataUrl 是 base64 字符串, 由 GC 回收
      // 这里不需要额外操作, 但避免闭包持有 url 引用即可
    }
  }, [])

  return (
    <div
      className={`relative overflow-hidden`}
      style={{ width, height: width }}
    >
      <div
        className={`group absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg overflow-hidden bg-zinc-800 cursor-pointer transition-transform ${
          isSelected
            ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02]'
            : 'hover:ring-2 hover:ring-blue-500/50'
        }`}
        style={{ width: vwidth, height: vheight }}
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) {
            onSelect()
          } else {
            onClick()
          }
        }}
        onDoubleClick={onSelect}
      >
        {/* 骨架屏占位 */}
        {!loaded && (
          <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
        )}

        {/* 图片 (非关键资源, fetchpriority="low"; CSS will-change 提示 GPU 合成) */}
        {dataUrl && (
          <img
            src={dataUrl}
            alt={media.filename}
            className={`w-full h-full  transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            decoding="async"
            loading="lazy"
            fetchPriority="low"
            onLoad={() => setLoaded(true)}
          />
        )}

        {/* 视频标记 */}
        {media.mediaType === 'video' && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-xs text-white">
            视频
          </div>
        )}

        {/* 悬停信息 */}
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-xs text-white truncate">{media.filename}</p>
          <p className="text-[10px] text-zinc-300">{formatFileSize(media.size)}</p>
        </div>

        {/* 收藏标记 */}
        {media.isFavorite && (
          <div className="absolute top-2 left-2">
            <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 虚拟滚动瀑布流网格
 *
 * 原理：
 * 1. 根据容器宽度计算列数
 * 2. 将文件分配到列中跟踪每列高度（瀑布流布局）
 * 3. 只渲染视口 + 缓冲区的可见项
 * 4. 使用 transform: translateY 定位元素
 */
export function PhotoGrid({ files, onMediaClick, selectedIds, onToggleSelect, layout = 'masonry' }: PhotoGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const [scrollTop, setScrollTop] = useState(0)

  // 根据 view 模式选择列数范围, 响应式计算列数 (百分比列宽)
  const colRange = layout === 'grid' ? GRID_COL_RANGE : MASONRY_COL_RANGE
  const colCount = calcColumnCount(containerWidth, colRange)
  const colWidth = Math.floor((containerWidth - (colCount - 1) * MASONRY.GAP) / colCount)

  // 瀑布流：将每张图分配到当前最矮的列
  const { columnItems, columnHeights, totalHeight } = useMemo(() => {
    const cols: Media[][] = Array.from({ length: colCount }, () => [])
    const heights = new Array(colCount).fill(0)

    for (const file of files) {
      const shortestCol = heights.indexOf(Math.min(...heights))
      cols[shortestCol].push(file)
      const aspectRatio = file.width && file.height ? file.width / file.height : 1
      heights[shortestCol] += Math.round(colWidth / aspectRatio) + MASONRY.GAP
    }

    return {
      columnItems: cols,
      columnHeights: heights,
      totalHeight: Math.max(...heights, 0),
    }
  }, [files, colCount, colWidth])

  // 合并数据为有序位置列表，用于虚拟滚动
  const positionedItems = useMemo(() => {
    const positions: Array<{ file: Media; x: number; y: number; w: number; h: number }> = []
    const tops = new Array(colCount).fill(0)
    const colIdx = new Array(colCount).fill(0)

    for (const file of files) {
      let foundCol = -1
      for (let c = 0; c < colCount; c++) {
        if (colIdx[c] < columnItems[c].length && columnItems[c][colIdx[c]]?.id === file.id) {
          foundCol = c
          colIdx[c]++
          break
        }
      }
      if (foundCol === -1) continue

      const aspectRatio = file.width && file.height ? file.width / file.height : 1
      const itemHeight = Math.round(colWidth / aspectRatio)

      positions.push({
        file,
        x: foundCol * (colWidth + MASONRY.GAP),
        y: tops[foundCol],
        w: colWidth,
        h: itemHeight,
      })

      tops[foundCol] += itemHeight + MASONRY.GAP
    }

    return positions
  }, [files, colCount, colWidth, columnItems])

  // 视口计算
  const viewportHeight = containerRef.current?.clientHeight ?? 800
  const buffer = VIRTUAL_SCROLL.BUFFER_SIZE * colWidth // 缓冲区像素

  const visibleItems = useMemo(() => {
    const startY = Math.max(0, scrollTop - buffer)
    const endY = scrollTop + viewportHeight + buffer

    return positionedItems.filter(item => {
      return item.y + item.h > startY && item.y < endY
    })
  }, [positionedItems, scrollTop, viewportHeight, buffer])

  // ResizeObserver 监听容器宽度变化
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    setContainerWidth(el.clientWidth)

    return () => observer.disconnect()
  }, [])

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto scroll-smooth"
      onScroll={handleScroll}
    >
      <div
        className="relative"
        style={{ height: totalHeight + MASONRY.GAP }}
      >
        {visibleItems.map(({ file, x, y, w, h }) => (
          <div
            key={file.id}
            className="absolute"
            style={{ transform: `translate3d(${x}px, ${y}px, 0)`, width: w, height: h }}
          >
            <Thumbnail
              media={file}
              width={w}
              isSelected={selectedIds?.has(file.id) ?? false}
              onSelect={() => onToggleSelect?.(file.id)}
              onClick={() => onMediaClick(file)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
