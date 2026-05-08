import { useState, useCallback, useEffect } from 'react'
import { AlertTriangle, Check, Download, Upload, X } from 'lucide-react'
import type { SyncConflictItem } from '@cloud-photo/shared'

const SERVER_BASE = 'http://localhost:3001'

interface ConflictDialogProps {
  onClose: () => void
}

export function ConflictDialog({ onClose }: ConflictDialogProps) {
  const [conflicts, setConflicts] = useState<SyncConflictItem[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resultMsg, setResultMsg] = useState<string | null>(null)

  // 获取冲突列表
  const fetchConflicts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${SERVER_BASE}/api/sync/conflicts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setConflicts(data.items ?? [])
    } catch (err) {
      setError(`无法获取冲突列表: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConflicts()
  }, [fetchConflicts])

  // 解决单个冲突
  const handleResolve = useCallback(async (mediaId: string, resolution: 'keep_local' | 'keep_cloud') => {
    setResolving(mediaId)
    setResultMsg(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${SERVER_BASE}/api/sync/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mediaId, resolution }),
      })
      const data = await res.json()
      if (data.success) {
        setResultMsg(data.message)
        // 从列表移除已解决项
        setConflicts(prev => prev.filter(c => c.media.id !== mediaId))
      } else {
        setResultMsg(`失败: ${data.message}`)
      }
    } catch (err) {
      setResultMsg(`请求失败: ${(err as Error).message}`)
    } finally {
      setResolving(null)
    }
  }, [])

  // 全部保留本地
  const handleResolveAllLocal = useCallback(async () => {
    for (const c of conflicts) {
      await handleResolve(c.media.id, 'keep_local')
    }
  }, [conflicts, handleResolve])

  // 全部保留云端
  const handleResolveAllCloud = useCallback(async () => {
    for (const c of conflicts) {
      await handleResolve(c.media.id, 'keep_cloud')
    }
  }, [conflicts, handleResolve])

  const hasConflicts = conflicts.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            <h2 className="text-base font-medium text-zinc-100">
              同步冲突
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-zinc-500">
              <span className="animate-spin w-5 h-5 border-2 border-zinc-500 border-t-transparent rounded-full mr-2" />
              加载中...
            </div>
          ) : error ? (
            <div className="py-4 text-center text-red-400 text-sm">{error}</div>
          ) : !hasConflicts ? (
            <div className="py-8 text-center text-zinc-500">
              <Check size={32} className="mx-auto mb-2 text-green-400" />
              <p>当前没有冲突</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-zinc-400 mb-4">
                以下文件在本地和云端同时存在，请选择保留哪个版本：
              </p>

              {/* 全部操作按钮 */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleResolveAllLocal}
                  disabled={!!resolving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs text-blue-300 transition-colors disabled:opacity-50"
                >
                  <Upload size={12} />
                  全部保留本地
                </button>
                <button
                  onClick={handleResolveAllCloud}
                  disabled={!!resolving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs text-emerald-300 transition-colors disabled:opacity-50"
                >
                  <Download size={12} />
                  全部保留云端
                </button>
              </div>

              {/* 冲突列表 */}
              <div className="space-y-2">
                {conflicts.map(c => (
                  <div key={c.media.id} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-200 truncate flex-1 mr-2">
                        {c.media.filename}
                      </span>
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 text-xs">
                        冲突
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mb-2 space-y-0.5">
                      <span>本地: {c.localExists ? '✅ 存在' : '❌ 不存在'}</span>
                      <span className="ml-3">云端: {c.cloudExists ? '✅ 存在' : '❌ 不存在'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleResolve(c.media.id, 'keep_local')}
                        disabled={resolving === c.media.id || !c.localExists}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs transition-colors disabled:opacity-40"
                      >
                        <Upload size={11} />
                        保留本地
                      </button>
                      <button
                        onClick={() => handleResolve(c.media.id, 'keep_cloud')}
                        disabled={resolving === c.media.id || !c.cloudExists}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs transition-colors disabled:opacity-40"
                      >
                        <Download size={11} />
                        保留云端
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {resultMsg && (
                <div className="mt-3 p-2 rounded bg-zinc-800 text-zinc-400 text-xs">
                  {resultMsg}
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="flex justify-end px-5 py-3 border-t border-zinc-800 bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
