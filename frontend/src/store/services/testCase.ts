import { api } from './api'

export interface TestCase {
  id: number
  name: string
  description?: string
  project_id: number
  test_type: 'ui' | 'api' | 'performance' | 'mobile' | 'security' | 'compatibility'
  steps?: Array<Record<string, any>>
  config?: Record<string, any>
  tags?: string[]
  module?: string
  status?: string
  created_by?: number
  owner_id?: number
  is_favorite?: number[]
  created_at?: string
  updated_at?: string
}

export interface TestCaseCreate {
  name: string
  description?: string
  project_id: number
  test_type: 'ui' | 'api' | 'performance' | 'mobile' | 'security' | 'compatibility'
  steps?: Array<Record<string, any>>
  config?: Record<string, any>
  tags?: string[]
}

export interface TestCaseUpdate {
  name?: string
  description?: string
  test_type?: 'ui' | 'api' | 'performance' | 'mobile' | 'security' | 'compatibility'
  steps?: Array<Record<string, any>>
  config?: Record<string, any>
  tags?: string[]
  module?: string
  status?: string
  workflow?: Record<string, any>
  is_multi_interface?: boolean
  data_driver?: Record<string, any>
  is_data_driven?: boolean
  project_id?: number
}

export interface TestCaseListParams {
  project_id?: number
  test_type?: string
  search?: string
  status?: string
  created_by?: number
  owner_id?: number
  module?: string
  favorite?: boolean
  is_template?: boolean
  is_shared?: boolean
  is_common?: boolean
  start_date?: string
  end_date?: string
  skip?: number
  limit?: number
}

export const testCaseService = {
  // 获取测试用例列表
  async getTestCases(params?: TestCaseListParams): Promise<TestCase[]> {
    const response = await api.get<any>('/test-cases', { params })
    console.log('测试用例API原始响应:', response.data) // 调试日志
    // 处理可能的响应格式：数组或 {test_cases: []} 或其他格式
    if (Array.isArray(response.data)) {
      return response.data
    } else if (response.data && Array.isArray(response.data.test_cases)) {
      return response.data.test_cases
    } else if (response.data && Array.isArray(response.data.items)) {
      return response.data.items
    }
    console.warn('测试用例API响应格式未知:', typeof response.data, response.data)
    return []
  },

  // 获取测试用例详情
  async getTestCase(id: number): Promise<TestCase> {
    const response = await api.get<TestCase>(`/test-cases/${id}`)
    return response.data
  },

  // 创建测试用例
  async createTestCase(data: TestCaseCreate): Promise<TestCase> {
    const response = await api.post<TestCase>('/test-cases', data)
    return response.data
  },

  // 更新测试用例
  async updateTestCase(id: number, data: TestCaseUpdate): Promise<TestCase> {
    const response = await api.put<TestCase>(`/test-cases/${id}`, data)
    return response.data
  },

  // 删除测试用例
  async deleteTestCase(id: number): Promise<void> {
    await api.delete(`/test-cases/${id}`)
  },
}

