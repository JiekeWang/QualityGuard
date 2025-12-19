import { api } from './api'

export interface AssertionLibrary {
  id: number
  name: string
  description?: string
  type: string
  project_id?: number
  config?: Record<string, any>
  example?: string
  is_public?: boolean
  usage_count?: number
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface AssertionLibraryCreate {
  name: string
  description?: string
  type: string
  project_id?: number
  config?: Record<string, any>
  example?: string
  is_public?: boolean
}

export interface AssertionLibraryUpdate {
  name?: string
  description?: string
  type?: string
  project_id?: number
  config?: Record<string, any>
  example?: string
  is_public?: boolean
}

export interface AssertionLibraryListParams {
  project_id?: number
  type?: string
  is_public?: boolean
  search?: string
  skip?: number
  limit?: number
}

export const assertionLibraryService = {
  async getLibraries(params?: AssertionLibraryListParams): Promise<AssertionLibrary[]> {
    const response = await api.get<AssertionLibrary[]>('/assertion-libraries', { params })
    return response.data
  },

  async getLibrary(id: number): Promise<AssertionLibrary> {
    const response = await api.get<AssertionLibrary>(`/assertion-libraries/${id}`)
    return response.data
  },

  async createLibrary(data: AssertionLibraryCreate): Promise<AssertionLibrary> {
    const response = await api.post<AssertionLibrary>('/assertion-libraries', data)
    return response.data
  },

  async updateLibrary(id: number, data: AssertionLibraryUpdate): Promise<AssertionLibrary> {
    const response = await api.put<AssertionLibrary>(`/assertion-libraries/${id}`, data)
    return response.data
  },

  async deleteLibrary(id: number): Promise<void> {
    await api.delete(`/assertion-libraries/${id}`)
  },

  async useLibrary(id: number): Promise<AssertionLibrary> {
    const response = await api.post<AssertionLibrary>(`/assertion-libraries/${id}/use`)
    return response.data
  },
}

