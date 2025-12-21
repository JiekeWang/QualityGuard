/**
 * Token配置服务
 */
import { api } from './api'

export interface TokenConfigExtractor {
  name: string
  type: string
  path: string
}

export interface TokenConfigContent {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: Record<string, any>
  params?: Record<string, string>
  extractors: TokenConfigExtractor[]
  retry_status_codes?: number[]
}

export interface TokenConfig {
  id: number
  name: string
  description?: string
  project_id?: number
  config: TokenConfigContent
  is_active: boolean
  created_by?: number
  created_at: string
  updated_at?: string
}

export interface TokenConfigCreate {
  name: string
  description?: string
  project_id?: number
  config: TokenConfigContent
  is_active?: boolean
}

export interface TokenConfigUpdate {
  name?: string
  description?: string
  project_id?: number
  config?: TokenConfigContent
  is_active?: boolean
}

export const tokenConfigService = {
  /**
   * 获取Token配置列表
   */
  async getTokenConfigs(params?: {
    project_id?: number
    is_active?: boolean
    search?: string
    skip?: number
    limit?: number
  }): Promise<TokenConfig[]> {
    const response = await api.get('/token-configs', { params })
    return response.data
  },

  /**
   * 获取Token配置详情
   */
  async getTokenConfig(id: number): Promise<TokenConfig> {
    const response = await api.get(`/token-configs/${id}`)
    return response.data
  },

  /**
   * 创建Token配置
   */
  async createTokenConfig(data: TokenConfigCreate): Promise<TokenConfig> {
    const response = await api.post('/token-configs', data)
    return response.data
  },

  /**
   * 更新Token配置
   */
  async updateTokenConfig(id: number, data: TokenConfigUpdate): Promise<TokenConfig> {
    const response = await api.put(`/token-configs/${id}`, data)
    return response.data
  },

  /**
   * 删除Token配置
   */
  async deleteTokenConfig(id: number): Promise<void> {
    await api.delete(`/token-configs/${id}`)
  },
}

