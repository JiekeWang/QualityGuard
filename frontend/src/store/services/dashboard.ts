import { api } from './api'

export interface DashboardStats {
  pending_tasks: number
  pending_reviews: number
  today_completed: number
  week_workload: Record<string, any>
  interface_coverage: number
  case_coverage: number
  automation_rate: number
  total_projects: number
  active_projects: number
  overall_pass_rate: number
  total_executions: number
  success_executions: number
  failed_executions: number
  today_executions: number
  today_success: number
  today_failed: number
  avg_response_time: number
}

export const dashboardService = {
  // 获取仪表盘统计数据
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/dashboard/stats')
    return response.data
  },
}

