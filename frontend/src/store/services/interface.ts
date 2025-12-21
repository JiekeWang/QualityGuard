import { api } from './api'

export interface Interface {
  id: number
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  path: string
  description?: string
  project_id: number
  status: 'active' | 'inactive' | 'deprecated'
  module?: string
  tags?: string[]
  headers?: Record<string, any>
  query_params?: Record<string, any>
  path_params?: Record<string, any>
  body_params?: Record<string, any>
  form_params?: Record<string, any>
  response_schema?: Record<string, any>
  response_example?: Record<string, any>
  timeout?: number
  retry_strategy?: Record<string, any>
  pre_script?: string
  post_script?: string
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface InterfaceCreate {
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  path: string
  description?: string
  project_id: number
  status?: 'active' | 'inactive' | 'deprecated'
  module?: string
  tags?: string[]
  headers?: Record<string, any>
  query_params?: Record<string, any>
  path_params?: Record<string, any>
  body_params?: Record<string, any>
  form_params?: Record<string, any>
  response_schema?: Record<string, any>
  response_example?: Record<string, any>
  timeout?: number
  retry_strategy?: Record<string, any>
  pre_script?: string
  post_script?: string
}

export interface InterfaceUpdate {
  name?: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  path?: string
  description?: string
  project_id?: number
  status?: 'active' | 'inactive' | 'deprecated'
  module?: string
  tags?: string[]
  headers?: Record<string, any>
  query_params?: Record<string, any>
  path_params?: Record<string, any>
  body_params?: Record<string, any>
  form_params?: Record<string, any>
  response_schema?: Record<string, any>
  response_example?: Record<string, any>
  timeout?: number
  retry_strategy?: Record<string, any>
  pre_script?: string
  post_script?: string
}

export interface InterfaceListParams {
  project_id?: number
  method?: string
  status?: string
  search?: string
  skip?: number
  limit?: number
}

export const interfaceService = {
  // 获取接口列表
  async getInterfaces(params?: InterfaceListParams): Promise<Interface[]> {
    const response = await api.get<Interface[]>('/interfaces', { params })
    return response.data
  },

  // 获取接口详情
  async getInterface(id: number): Promise<Interface> {
    const response = await api.get<Interface>(`/interfaces/${id}`)
    return response.data
  },

  // 创建接口
  async createInterface(data: InterfaceCreate): Promise<Interface> {
    const response = await api.post<Interface>('/interfaces', data)
    return response.data
  },

  // 更新接口
  async updateInterface(id: number, data: InterfaceUpdate): Promise<Interface> {
    const response = await api.put<Interface>(`/interfaces/${id}`, data)
    return response.data
  },

  // 删除接口
  async deleteInterface(id: number): Promise<void> {
    await api.delete(`/interfaces/${id}`)
  },
}

