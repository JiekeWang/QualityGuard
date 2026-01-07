import { api } from './api'

export interface PageObject {
  id: number
  name: string
  url?: string
  description?: string
  project_id: number
  status: 'active' | 'inactive' | 'deprecated'
  module?: string
  tags?: string[]
  page_config?: Record<string, any>
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface PageObjectCreate {
  name: string
  url?: string
  description?: string
  project_id: number
  status?: 'active' | 'inactive' | 'deprecated'
  module?: string
  tags?: string[]
  page_config?: Record<string, any>
}

export interface PageObjectUpdate {
  name?: string
  url?: string
  description?: string
  project_id?: number
  status?: 'active' | 'inactive' | 'deprecated'
  module?: string
  tags?: string[]
  page_config?: Record<string, any>
}

export interface PageObjectListParams {
  project_id?: number
  status?: string
  search?: string
  skip?: number
  limit?: number
}

export const pageObjectService = {
  // 获取页面对象列表
  async getPageObjects(params?: PageObjectListParams): Promise<PageObject[]> {
    const response = await api.get<PageObject[]>('/page-objects', { params })
    return response.data
  },

  // 获取页面对象详情
  async getPageObject(id: number): Promise<PageObject> {
    const response = await api.get<PageObject>(`/page-objects/${id}`)
    return response.data
  },

  // 创建页面对象
  async createPageObject(data: PageObjectCreate): Promise<PageObject> {
    const response = await api.post<PageObject>('/page-objects', data)
    return response.data
  },

  // 更新页面对象
  async updatePageObject(id: number, data: PageObjectUpdate): Promise<PageObject> {
    const response = await api.put<PageObject>(`/page-objects/${id}`, data)
    return response.data
  },

  // 删除页面对象
  async deletePageObject(id: number): Promise<void> {
    await api.delete(`/page-objects/${id}`)
  },
}

