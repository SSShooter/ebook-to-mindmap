import connect from '@/lib/connect'

export interface User {
  image: string
  email: string
  from: string
  id: string
  name: string
  _id: string
}

export interface UserResponse {
  data: User
  success: boolean
  message?: string
}

/**
 * 用户相关 API 服务
 */
export const userApi = {
  /**
   * 获取当前用户信息
   */
  getCurrentUser: async (): Promise<UserResponse> => {
    return await connect.get<never, UserResponse>('/api/user')
  },

  /**
   * 用户登出
   */
  logout: async (): Promise<void> => {
    return await connect.post('/logout')
  },
}

export const api = {
  user: userApi,
}

export default api
