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
  search?: string
  skip?: number
  limit?: number
}

export interface TestExecutionListResponse {
  items: TestExecution[]
  total: number
  skip: number
  limit: number
}

export const testExecutionService = {
  // 获取测试执行列表（支持分页）
  async getTestExecutions(params?: TestExecutionListParams): Promise<TestExecutionListResponse> {
    const response = await api.get<any>('/test-executions', { params })
    // 处理分页响应格式
    if (response.data && response.data.items && typeof response.data.total === 'number') {
      return {
        items: response.data.items,
        total: response.data.total,
        skip: response.data.skip || 0,
        limit: response.data.limit || 100,
      }
    }
    // 兼容旧格式：数组
    if (Array.isArray(response.data)) {
      return {
        items: response.data,
        total: response.data.length,
        skip: 0,
        limit: response.data.length,
      }
    }
    // 其他格式
    if (response.data && Array.isArray(response.data.executions)) {
      return {
        items: response.data.executions,
        total: response.data.executions.length,
        skip: 0,
        limit: response.data.executions.length,
      }
    }
    return {
      items: [],
      total: 0,
      skip: 0,
      limit: 0,
    }
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

  // 删除单个测试执行
  async deleteTestExecution(id: number): Promise<void> {
    await api.delete(`/test-executions/${id}`)
  },

  // 批量删除测试执行
  async batchDeleteTestExecutions(ids: number[]): Promise<void> {
    await api.delete('/test-executions/batch', { data: { execution_ids: ids } })
  },
}

