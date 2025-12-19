import { api } from './api'

export interface Directory {
  id: number
  name: string
  description?: string
  project_id: number
  parent_id?: number
  order?: number
  is_active?: boolean
  created_by?: number
  children?: Directory[]
  created_at?: string
  updated_at?: string
}

export interface DirectoryCreate {
  name: string
  description?: string
  project_id: number
  parent_id?: number
  order?: number
  is_active?: boolean
}

export interface DirectoryUpdate {
  name?: string
  description?: string
  project_id?: number
  parent_id?: number
  order?: number
  is_active?: boolean
}

export interface DirectoryListParams {
  project_id?: number
  parent_id?: number
  is_active?: boolean
  skip?: number
  limit?: number
}

export const directoryService = {
  async getDirectories(params?: DirectoryListParams): Promise<Directory[]> {
    const response = await api.get<Directory[]>('/directories', { params })
    return response.data
  },

  async getDirectory(id: number): Promise<Directory> {
    const response = await api.get<Directory>(`/directories/${id}`)
    return response.data
  },

  async createDirectory(data: DirectoryCreate): Promise<Directory> {
    const response = await api.post<Directory>('/directories', data)
    return response.data
  },

  async updateDirectory(id: number, data: DirectoryUpdate): Promise<Directory> {
    const response = await api.put<Directory>(`/directories/${id}`, data)
    return response.data
  },

  async deleteDirectory(id: number): Promise<void> {
    await api.delete(`/directories/${id}`)
  },
}

