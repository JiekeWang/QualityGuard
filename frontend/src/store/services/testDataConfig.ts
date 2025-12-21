import { api } from './api'

// 测试数据项接口
export interface TestDataItem {
  request: Record<string, any>
  assertions: Array<Record<string, any>>
}

// 测试数据配置接口
export interface TestDataConfig {
  id: number
  name: string
  description?: string
  project_id?: number
  data: TestDataItem[]
  is_active?: boolean
  created_by?: number
  created_at?: string
  updated_at?: string
}

// 测试数据配置列表项接口（包含统计信息）
export interface TestDataConfigListItem {
  id: number
  name: string
  description?: string
  project_id?: number
  is_active: boolean
  data_count: number
  associated_case_count: number
  created_by?: number
  created_at?: string
  updated_at?: string
}

// 创建/更新接口
export interface TestDataConfigCreate {
  name: string
  description?: string
  project_id?: number
  data: TestDataItem[]
  is_active?: boolean
}

export interface TestDataConfigUpdate {
  name?: string
  description?: string
  project_id?: number
  data?: TestDataItem[]
  is_active?: boolean
}

// 关联请求接口
export interface TestCaseAssociationRequest {
  test_data_config_id: number
}

// 使用情况接口
export interface UsageInfo {
  test_case_id: number
  test_case_name: string
  project_id: number
  project_name?: string
  associated_at?: string
}

// 查询参数接口
export interface TestDataConfigListParams {
  project_id?: number
  is_active?: boolean
  search?: string
  skip?: number
  limit?: number
}

class TestDataConfigService {
  /**
   * 获取测试数据配置列表
   */
  async getTestDataConfigs(params?: TestDataConfigListParams): Promise<TestDataConfigListItem[]> {
    const response = await api.get<TestDataConfigListItem[]>('/test-data-configs', { params })
    return response.data
  }

  /**
   * 获取测试数据配置详情
   */
  async getTestDataConfig(id: number): Promise<TestDataConfig> {
    const response = await api.get<TestDataConfig>(`/test-data-configs/${id}`)
    return response.data
  }

  /**
   * 创建测试数据配置
   */
  async createTestDataConfig(config: TestDataConfigCreate): Promise<TestDataConfig> {
    const response = await api.post<TestDataConfig>('/test-data-configs', config)
    return response.data
  }

  /**
   * 更新测试数据配置
   */
  async updateTestDataConfig(id: number, config: TestDataConfigUpdate): Promise<TestDataConfig> {
    const response = await api.put<TestDataConfig>(`/test-data-configs/${id}`, config)
    return response.data
  }

  /**
   * 删除测试数据配置
   */
  async deleteTestDataConfig(id: number): Promise<void> {
    await api.delete(`/test-data-configs/${id}`)
  }

  /**
   * 获取配置使用情况（关联的用例列表）
   */
  async getUsageInfo(id: number): Promise<UsageInfo[]> {
    const response = await api.get<UsageInfo[]>(`/test-data-configs/${id}/usage`)
    return response.data
  }

  /**
   * 关联测试数据配置到测试用例
   */
  async associateTestCase(testCaseId: number, configId: number): Promise<void> {
    await api.post(`/test-cases/${testCaseId}/test-data-configs`, {
      test_data_config_id: configId
    })
  }

  /**
   * 取消测试用例与测试数据配置的关联
   */
  async disassociateTestCase(testCaseId: number, configId: number): Promise<void> {
    await api.delete(`/test-cases/${testCaseId}/test-data-configs/${configId}`)
  }

  /**
   * 获取测试用例关联的所有测试数据配置
   */
  async getTestCaseConfigs(testCaseId: number): Promise<TestDataConfig[]> {
    const response = await api.get<TestDataConfig[]>(`/test-cases/${testCaseId}/test-data-configs`)
    return response.data
  }
}

export const testDataConfigService = new TestDataConfigService()

