import { api } from './api'

export interface Module {
  id: number
  name: string
  description?: string
  project_id: number
  parent_id?: number
  order?: number
  is_active?: boolean
  created_by?: number
  children?: Module[]
  created_at?: string
  updated_at?: string
}

export interface ModuleCreate {
  name: string
  description?: string
  project_id: number
  parent_id?: number
  order?: number
  is_active?: boolean
}

export interface ModuleUpdate {
  name?: string
  description?: string
  project_id?: number
  parent_id?: number
  order?: number
  is_active?: boolean
}

export interface ModuleListParams {
  project_id?: number
  parent_id?: number
  is_active?: boolean
  skip?: number
  limit?: number
}

export const moduleService = {
  async getModules(params?: ModuleListParams): Promise<Module[]> {
    const response = await api.get<Module[]>('/modules', { params })
    return response.data
  },

  async getModule(id: number): Promise<Module> {
    const response = await api.get<Module>(`/modules/${id}`)
    return response.data
  },

  async createModule(data: ModuleCreate): Promise<Module> {
    const response = await api.post<Module>('/modules', data)
    return response.data
  },

  async updateModule(id: number, data: ModuleUpdate): Promise<Module> {
    const response = await api.put<Module>(`/modules/${id}`, data)
    return response.data
  },

  async deleteModule(id: number): Promise<void> {
    await api.delete(`/modules/${id}`)
  },
}

