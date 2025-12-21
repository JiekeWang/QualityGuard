import { api } from './api'

export interface ReportSummary {
  id: number
  execution_id: number
  project_id: number
  test_case_id?: number
  status: string
  created_at?: string
  summary?: {
    total: number
    passed: number
    failed: number
    skipped: number
  }
}

export interface ReportDetail extends ReportSummary {
  test_case_name?: string | null
  started_at?: string | null
  finished_at?: string | null
  environment?: string | null
  // 详细结果结构，包含请求/响应/断言等
  result?: any
}

export interface ReportListParams {
  project_id?: number
  skip?: number
  limit?: number
}

export const reportService = {
  // 获取报告列表
  async getReports(params?: ReportListParams): Promise<ReportSummary[]> {
    const response = await api.get<any>('/reports', { params })
    const data = response.data
    if (Array.isArray(data)) {
      return data as ReportSummary[]
    }
    if (data && Array.isArray(data.reports)) {
      return data.reports as ReportSummary[]
    }
    if (data && Array.isArray(data.items)) {
      return data.items as ReportSummary[]
    }
    return []
  },

  // 获取报告详情
  async getReport(id: number): Promise<ReportDetail> {
    const response = await api.get<ReportDetail>(`/reports/${id}`)
    return response.data
  },

  // 导出报告
  async exportReport(id: number, format: 'html' | 'json' | 'doc' = 'html'): Promise<{ content: string }> {
    const response = await api.get<{ report_id: number; format: string; content: string }>(
      `/reports/${id}/export`,
      { params: { format } },
    )
    return { content: response.data.content }
  },

  // 删除单个报告
  async deleteReport(id: number): Promise<void> {
    await api.delete(`/reports/${id}`)
  },

  // 批量删除报告
  async batchDeleteReports(ids: number[]): Promise<void> {
    await api.delete('/reports/batch', { data: { report_ids: ids } })
  },
}
