import { api } from './api'

export interface Environment {
  id: number
  name: string
  key: string
  description?: string
  base_url?: string
  is_active: boolean
  default_headers?: Record<string, any> | null
  default_params?: Record<string, any> | null
  variables?: Record<string, any> | null
  created_at?: string
  updated_at?: string
}

export interface EnvironmentCreate {
  name: string
  key: string
  description?: string
  base_url?: string
  is_active?: boolean
  default_headers?: Record<string, any> | null
  default_params?: Record<string, any> | null
  variables?: Record<string, any> | null
}

export interface EnvironmentUpdate extends Partial<EnvironmentCreate> {}

export const environmentService = {
  async getEnvironments(onlyActive = false): Promise<Environment[]> {
    const response = await api.get<Environment[]>('/environments', {
      params: onlyActive ? { only_active: true } : undefined,
    })
    return Array.isArray(response.data) ? response.data : []
  },

  async createEnvironment(data: EnvironmentCreate): Promise<Environment> {
    const response = await api.post<Environment>('/environments', data)
    return response.data
  },

  async updateEnvironment(id: number, data: EnvironmentUpdate): Promise<Environment> {
    const response = await api.put<Environment>(`/environments/${id}`, data)
    return response.data
  },

  async deleteEnvironment(id: number): Promise<void> {
    await api.delete(`/environments/${id}`)
  },
}


