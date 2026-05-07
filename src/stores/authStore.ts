import { create } from 'zustand'
import { api } from '../services/api'
import type { User } from '../services/api'

interface AuthState {
  user: User | null
  isLoading: boolean
  isInitialized: boolean
  fetchUser: (force?: boolean) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  fetchUser: async (force = false) => {
    const { isLoading, isInitialized } = get()
    // 如果已经在加载，或者非强制刷新且已经初始化过，则不重复请求
    if (isLoading || (!force && isInitialized)) {
      return
    }

    set({ isLoading: true })
    try {
      const response = await api.user.getCurrentUser()
      // API 结构参考 mind-elixir-cloud，应该是 { data: user }
      set({ user: response.data, isLoading: false, isInitialized: true })
    } catch (error) {
      console.error('Failed to fetch user:', error)
      set({ user: null, isLoading: false, isInitialized: true })
    }
  },
  logout: async () => {
    try {
      await api.user.logout()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      set({ user: null })
      // 如果使用了 auth_token，可能也需要清除
      localStorage.removeItem('auth_token')
    }
  },
}))
