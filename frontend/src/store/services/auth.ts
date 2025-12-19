import { api } from './api'

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserResponse {
  id: number
  username: string
  email: string
  is_active: boolean
  is_superuser: boolean
  created_at?: string
}

export const authService = {
  // 登录
  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/auth/login/json', data)
    return response.data
  },

  // 注册
  async register(data: RegisterRequest): Promise<UserResponse> {
    const response = await api.post<UserResponse>('/auth/register', data)
    return response.data
  },

  // 获取当前用户信息
  async getCurrentUser(): Promise<UserResponse> {
    const response = await api.get<UserResponse>('/auth/me')
    return response.data
  },

  // 刷新token
  async refreshToken(refresh_token: string): Promise<TokenResponse> {
    const response = await api.post<TokenResponse>('/auth/refresh', {
      refresh_token,
    })
    return response.data
  },

  // 登出
  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },
}
