import { api } from './api'

export interface TestCaseVersion {
  id: number
  test_case_id: number
  version: string
  name?: string
  description?: string
  content?: Record<string, any>
  created_by?: number
  created_at?: string
}

export interface TestCaseVersionCreate {
  test_case_id: number
  version: string
  name?: string
  description?: string
  content?: Record<string, any>
}

export interface TestCaseVersionUpdate {
  name?: string
  description?: string
}

export interface TestCaseVersionListParams {
  test_case_id?: number
  skip?: number
  limit?: number
}

export interface VersionCompareResult {
  version_id: number
  version: string
  compare_with: string | number
  differences: Record<string, {
    version: any
    compare: any
  }>
}

export const testCaseVersionService = {
  async getVersions(params?: TestCaseVersionListParams): Promise<TestCaseVersion[]> {
    const response = await api.get<TestCaseVersion[]>('/test-case-versions', { params })
    return response.data
  },

  async getVersion(id: number): Promise<TestCaseVersion> {
    const response = await api.get<TestCaseVersion>(`/test-case-versions/${id}`)
    return response.data
  },

  async createVersion(data: TestCaseVersionCreate): Promise<TestCaseVersion> {
    const response = await api.post<TestCaseVersion>('/test-case-versions', data)
    return response.data
  },

  async updateVersion(id: number, data: TestCaseVersionUpdate): Promise<TestCaseVersion> {
    const response = await api.put<TestCaseVersion>(`/test-case-versions/${id}`, data)
    return response.data
  },

  async deleteVersion(id: number): Promise<void> {
    await api.delete(`/test-case-versions/${id}`)
  },

  async restoreVersion(id: number): Promise<{ message: string; test_case_id: number }> {
    const response = await api.post<{ message: string; test_case_id: number }>(`/test-case-versions/${id}/restore`)
    return response.data
  },

  async compareVersions(version_id: number, compare_with?: number): Promise<VersionCompareResult> {
    const response = await api.get<VersionCompareResult>(`/test-case-versions/${version_id}/compare`, {
      params: compare_with ? { compare_with } : {}
    })
    return response.data
  },
}

