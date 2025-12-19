import { api } from './api'
import { UserResponse } from './auth'

export interface UserProfileUpdate {
  username?: string
  email?: string
  name?: string
  bio?: string
}

export interface PasswordUpdate {
  current_password: string
  new_password: string
}

export const userService = {
  // 获取当前用户信息
  async getCurrentUser(): Promise<UserResponse> {
    const response = await api.get<UserResponse>('/users/me')
    return response.data
  },

  // 获取用户列表
  async getUsers(skip: number = 0, limit: number = 100): Promise<UserResponse[]> {
    const response = await api.get<UserResponse[]>('/users', { params: { skip, limit } })
    return response.data
  },

  // 更新用户个人信息
  async updateProfile(data: UserProfileUpdate): Promise<UserResponse> {
    const response = await api.put<UserResponse>('/users/me', data)
    return response.data
  },

  // 更新密码
  async updatePassword(data: PasswordUpdate): Promise<void> {
    await api.post('/users/me/password', data)
  },
}

