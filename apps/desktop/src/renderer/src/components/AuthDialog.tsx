/**
 * 登录/注册对话框
 *
 * 未认证时全屏覆盖，提供登录和注册两个 tab。
 * 使用 authStore 处理认证逻辑，成功登录后自动关闭进入主界面。
 */
import { useState, type FormEvent } from 'react'
import { useAuthStore } from '../stores/authStore'
import { Cloud, Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react'

type AuthTab = 'login' | 'register'

export function AuthDialog() {
  const { login, register, loading, error, clearError } = useAuthStore()
  const [tab, setTab] = useState<AuthTab>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const switchTab = (t: AuthTab) => {
    setTab(t)
    setLocalError(null)
    clearError()
  }

  const validate = (): boolean => {
    if (tab === 'register' && username.trim().length < 2) {
      setLocalError('用户名至少 2 个字符')
      return false
    }
    if (!email.trim()) {
      setLocalError('请输入邮箱地址')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLocalError('邮箱格式不正确')
      return false
    }
    if (password.length < 6) {
      setLocalError('密码至少 6 个字符')
      return false
    }
    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()
    if (!validate()) return

    if (tab === 'login') {
      await login(email.trim(), password)
    } else {
      await register(username.trim(), email.trim(), password)
    }
  }

  const displayError = localError || error

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg shadow-blue-500/20">
            <Cloud size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100">云相册</h1>
          <p className="text-sm text-zinc-500 mt-1">登录以同步和管理您的照片</p>
        </div>

        {/* 卡片 */}
        <div className="rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 shadow-2xl overflow-hidden">
          {/* Tab 切换 */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors relative ${
                tab === 'login'
                  ? 'text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              登录
              {tab === 'login' && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors relative ${
                tab === 'register'
                  ? 'text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              注册
              {tab === 'register' && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">用户名</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="你的用户名"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/50 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    autoFocus={tab === 'register'}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">邮箱</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/50 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  autoFocus={tab === 'login'}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">密码</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 位密码"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/50 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {displayError && (
              <div className="px-3 py-2 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 text-xs">
                {displayError}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{tab === 'login' ? '登录中...' : '注册中...'}</span>
                </>
              ) : (
                <span>{tab === 'login' ? '登录' : '创建账号'}</span>
              )}
            </button>
          </form>

          {/* 底部提示 */}
          <div className="px-6 pb-5 text-center">
            <p className="text-[11px] text-zinc-600">
              {tab === 'login' ? (
                <>还没有账号？<button onClick={() => switchTab('register')} className="text-blue-500 hover:text-blue-400 transition-colors">立即注册</button></>
              ) : (
                <>已有账号？<button onClick={() => switchTab('login')} className="text-blue-500 hover:text-blue-400 transition-colors">去登录</button></>
              )}
            </p>
          </div>
        </div>

        {/* 服务状态 */}
        <p className="text-center mt-4 text-[11px] text-zinc-700">
          后端服务运行于 localhost:3001
        </p>
      </div>
    </div>
  )
}
