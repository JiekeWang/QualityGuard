import { api } from './api'

export interface Project {
  id: number
  name: string
  description?: string
  owner_id?: number
  created_at?: string
  updated_at?: string
}

export interface ProjectCreate {
  name: string
  description?: string
}

export interface ProjectUpdate {
  name?: string
  description?: string
}

export const projectService = {
  // 获取项目列表
  async getProjects(): Promise<Project[]> {
    const response = await api.get<any>('/projects')
    // 处理可能的响应格式：数组或 {projects: []}
    if (Array.isArray(response.data)) {
      return response.data
    } else if (response.data && Array.isArray(response.data.projects)) {
      return response.data.projects
    }
    return []
  },

  // 获取项目详情
  async getProject(id: number): Promise<Project> {
    const response = await api.get<Project>(`/projects/${id}`)
    return response.data
  },

  // 创建项目
  async createProject(data: ProjectCreate): Promise<Project> {
    const response = await api.post<Project>('/projects', data)
    return response.data
  },

  // 更新项目
  async updateProject(id: number, data: ProjectUpdate): Promise<Project> {
    const response = await api.put<Project>(`/projects/${id}`, data)
    return response.data
  },

  // 删除项目
  async deleteProject(id: number): Promise<void> {
    await api.delete(`/projects/${id}`)
  },
}

