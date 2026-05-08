import { useEffect, useState, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, RotateCw, Download, Star, Info } from 'lucide-react'
import { formatFileSize, isImageFile } from '@cloud-photo/shared'
import type { Media } from '@cloud-photo/shared'

interface LightboxProps {
  media: Media
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export function Lightbox({ media, onClose, onPrev, onNext }: LightboxProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!media.localPath || !window.electronAPI) return
    setLoading(true)

    window.electronAPI.readFileDataUrl(media.localPath).then((url) => {
      setDataUrl(url)
      setLoading(false)
      setRotation(0)
    })
  }, [media.localPath, media.id])

  // 键盘快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          onPrev()
          break
        case 'ArrowRight':
          onNext()
          break
        case 'r':
          setRotation(r => (r + 90) % 360)
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onPrev, onNext])

  // 阻止背景滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex bg-black/90 backdrop-blur-sm">
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
      >
        <X size={20} />
      </button>

      {/* 上一张 */}
      <button
        onClick={onPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
      >
        <ChevronLeft size={24} />
      </button>

      {/* 下一张 */}
      <button
        onClick={onNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
      >
        <ChevronRight size={24} />
      </button>

      {/* 底部工具栏 */}
      <div className="absolute bottom-0 inset-x-0 z-10 flex items-center justify-center gap-2 p-4 bg-gradient-to-t from-black/60 to-transparent">
        <button
          onClick={() => setRotation(r => (r + 90) % 360)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="旋转 (R)"
        >
          <RotateCw size={18} />
        </button>
        <button
          onClick={() => setShowInfo(s => !s)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="信息"
        >
          <Info size={18} />
        </button>
        <span className="text-sm text-zinc-400 ml-4 tabular-nums">
          {media.filename}
        </span>
      </div>

      {/* 信息面板 */}
      {showInfo && (
        <div className="absolute bottom-16 left-4 z-10 p-4 rounded-xl bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/50 text-sm text-zinc-300 max-w-xs">
          <h3 className="text-white font-medium mb-2">{media.filename}</h3>
          <div className="space-y-1">
            <p>大小：{formatFileSize(media.size)}</p>
            {media.width && media.height && (
              <p>尺寸：{media.width} × {media.height}</p>
            )}
            <p>类型：{media.mimeType}</p>
            <p>状态：{media.status}</p>
          </div>
        </div>
      )}

      {/* 图片主体 */}
      <div className="flex-1 flex items-center justify-center p-16">
        {loading ? (
          <div className="w-16 h-16 border-2 border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
        ) : dataUrl ? (
          <img
            src={dataUrl}
            alt={media.filename}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `rotate(${rotation}deg)` }}
            decoding="async"
          />
        ) : (
          <div className="text-zinc-500 text-center">
            <p className="text-lg mb-2">无法加载图片</p>
            <p className="text-sm">{media.localPath}</p>
          </div>
        )}
      </div>
    </div>
  )
}
