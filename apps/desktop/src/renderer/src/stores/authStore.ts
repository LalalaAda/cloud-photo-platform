/**
 * 认证状态管理
 *
 * 管理 JWT token 持久化、用户登录/注册/登出。
 * token 存储在 localStorage，页面刷新后自动恢复。
 */
import { create } from 'zustand'

const SERVER_BASE = 'http://localhost:3001'
const TOKEN_KEY = 'cloud-photo-auth-token'
const USER_KEY = 'cloud-photo-auth-user'

export interface AuthUser {
  id: string
  username: string
  email: string
  avatar: string | null
  createdAt: string
}

interface AuthState {
  /** JWT token */
  token: string | null
  /** 当前登录用户 */
  user: AuthUser | null
  /** 是否正在请求 */
  loading: boolean
  /** 错误信息 */
  error: string | null

  /** 登录 */
  login: (email: string, password: string) => Promise<void>
  /** 注册 */
  register: (username: string, email: string, password: string) => Promise<void>
  /** 登出 */
  logout: () => void
  /** 清除错误 */
  clearError: () => void
  /** 从 localStorage 恢复 session */
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  loading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${SERVER_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        set({ loading: false, error: data.error || '登录失败' })
        return
      }
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      set({ token: data.token, user: data.user, loading: false, error: null })
    } catch {
      set({ loading: false, error: '无法连接到服务器，请确保后端已启动' })
    }
  },

  register: async (username: string, email: string, password: string) => {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${SERVER_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        set({ loading: false, error: data.error || '注册失败' })
        return
      }
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      set({ token: data.token, user: data.user, loading: false, error: null })
    } catch {
      set({ loading: false, error: '无法连接到服务器，请确保后端已启动' })
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ token: null, user: null, error: null })
  },

  clearError: () => set({ error: null }),

  hydrate: () => {
    const token = localStorage.getItem(TOKEN_KEY)
    const userStr = localStorage.getItem(USER_KEY)
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as AuthUser
        set({ token, user })
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
    }
  },
}))

/** 获取 Authorization header，用于 API 调用 */
export function authHeader(): Record<string, string> {
  const token = useAuthStore.getState().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}
