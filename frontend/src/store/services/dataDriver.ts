import { api } from './api'

// 数据源相关接口
export interface DataSource {
  id: number
  name: string
  description?: string
  type: string
  project_id?: number
  config?: Record<string, any>
  is_active?: boolean
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface DataSourceCreate {
  name: string
  description?: string
  type: string
  project_id?: number
  config?: Record<string, any>
  is_active?: boolean
}

export interface DataSourceUpdate {
  name?: string
  description?: string
  type?: string
  project_id?: number
  config?: Record<string, any>
  is_active?: boolean
}

// 数据模板相关接口
export interface DataTemplate {
  id: number
  name: string
  description?: string
  data_source_id: number
  project_id?: number
  mapping?: Record<string, any>
  filters?: Record<string, any>
  loop_strategy?: string
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface DataTemplateCreate {
  name: string
  description?: string
  data_source_id: number
  project_id?: number
  mapping?: Record<string, any>
  filters?: Record<string, any>
  loop_strategy?: string
}

export interface DataTemplateUpdate {
  name?: string
  description?: string
  data_source_id?: number
  project_id?: number
  mapping?: Record<string, any>
  filters?: Record<string, any>
  loop_strategy?: string
}

// 数据生成器相关接口
export interface DataGenerator {
  id: number
  name: string
  description?: string
  project_id?: number
  type: string
  config?: Record<string, any>
  is_active?: boolean
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface DataGeneratorCreate {
  name: string
  description?: string
  project_id?: number
  type: string
  config?: Record<string, any>
  is_active?: boolean
}

export interface DataGeneratorUpdate {
  name?: string
  description?: string
  project_id?: number
  type?: string
  config?: Record<string, any>
  is_active?: boolean
}

export interface DataDriverListParams {
  project_id?: number
  type?: string
  is_active?: boolean
  search?: string
  skip?: number
  limit?: number
}

export const dataDriverService = {
  // 数据源相关API
  async getDataSources(params?: DataDriverListParams): Promise<DataSource[]> {
    const response = await api.get<DataSource[]>('/data-drivers/data-sources', { params })
    return response.data
  },

  async getDataSource(id: number): Promise<DataSource> {
    const response = await api.get<DataSource>(`/data-drivers/data-sources/${id}`)
    return response.data
  },

  async createDataSource(data: DataSourceCreate): Promise<DataSource> {
    const response = await api.post<DataSource>('/data-drivers/data-sources', data)
    return response.data
  },

  async updateDataSource(id: number, data: DataSourceUpdate): Promise<DataSource> {
    const response = await api.put<DataSource>(`/data-drivers/data-sources/${id}`, data)
    return response.data
  },

  async deleteDataSource(id: number): Promise<void> {
    await api.delete(`/data-drivers/data-sources/${id}`)
  },

  // 数据模板相关API
  async getDataTemplates(params?: { project_id?: number; data_source_id?: number; search?: string }): Promise<DataTemplate[]> {
    const response = await api.get<DataTemplate[]>('/data-drivers/data-templates', { params })
    return response.data
  },

  async getDataTemplate(id: number): Promise<DataTemplate> {
    const response = await api.get<DataTemplate>(`/data-drivers/data-templates/${id}`)
    return response.data
  },

  async createDataTemplate(data: DataTemplateCreate): Promise<DataTemplate> {
    const response = await api.post<DataTemplate>('/data-drivers/data-templates', data)
    return response.data
  },

  async updateDataTemplate(id: number, data: DataTemplateUpdate): Promise<DataTemplate> {
    const response = await api.put<DataTemplate>(`/data-drivers/data-templates/${id}`, data)
    return response.data
  },

  async deleteDataTemplate(id: number): Promise<void> {
    await api.delete(`/data-drivers/data-templates/${id}`)
  },

  // 数据生成器相关API
  async getDataGenerators(params?: DataDriverListParams): Promise<DataGenerator[]> {
    const response = await api.get<DataGenerator[]>('/data-drivers/data-generators', { params })
    return response.data
  },

  async getDataGenerator(id: number): Promise<DataGenerator> {
    const response = await api.get<DataGenerator>(`/data-drivers/data-generators/${id}`)
    return response.data
  },

  async createDataGenerator(data: DataGeneratorCreate): Promise<DataGenerator> {
    const response = await api.post<DataGenerator>('/data-drivers/data-generators', data)
    return response.data
  },

  async updateDataGenerator(id: number, data: DataGeneratorUpdate): Promise<DataGenerator> {
    const response = await api.put<DataGenerator>(`/data-drivers/data-generators/${id}`, data)
    return response.data
  },

  async deleteDataGenerator(id: number): Promise<void> {
    await api.delete(`/data-drivers/data-generators/${id}`)
  },
}

