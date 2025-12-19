import { api } from './api'

export interface TestExecution {
  id: number
  test_case_id: number
  project_id: number
  status: 'pending' | 'running' | 'passed' | 'failed' | 'cancelled' | 'error'
  result?: Record<string, any>
  logs?: string
  config?: Record<string, any>
  environment?: string
  started_at?: string
  finished_at?: string
  created_at?: string
}

export interface TestExecutionCreate {
  test_case_id: number
  project_id: number
  config?: Record<string, any>
  environment?: string
}

export interface TestExecutionListParams {
  project_id?: number
  test_case_id?: number
  status?: string
  skip?: number
  limit?: number
}

export const testExecutionService = {
  // 获取测试执行列表
  async getTestExecutions(params?: TestExecutionListParams): Promise<TestExecution[]> {
    const response = await api.get<any>('/test-executions', { params })
    // 处理可能的响应格式：数组或 {executions: []} 或其他格式
    if (Array.isArray(response.data)) {
      return response.data
    } else if (response.data && Array.isArray(response.data.executions)) {
      return response.data.executions
    } else if (response.data && Array.isArray(response.data.items)) {
      return response.data.items
    }
    return []
  },

  // 获取测试执行详情
  async getTestExecution(id: number): Promise<TestExecution> {
    const response = await api.get<TestExecution>(`/test-executions/${id}`)
    return response.data
  },

  // 创建测试执行
  async createTestExecution(data: TestExecutionCreate): Promise<TestExecution> {
    const response = await api.post<TestExecution>('/test-executions', data)
    return response.data
  },

  // 获取执行日志
  async getExecutionLogs(id: number): Promise<{ execution_id: number; logs: string; status: string }> {
    const response = await api.get(`/test-executions/${id}/logs`)
    return response.data
  },
}

