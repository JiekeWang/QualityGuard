import { useState, useEffect } from 'react'
import { Table, Tag, Button, Space, Modal, Card, Input, Image, message } from 'antd'
import { EyeOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import { reportService } from '../../store/services/report'
import { projectService } from '../../store/services/project'
import dayjs from 'dayjs'

const { Search } = Input

interface UIReport {
  id: number
  name: string
  execution_id: number
  project_id: number
  status: string
  created_at: string
  result?: any
}

const UIReports: React.FC = () => {
  const [reports, setReports] = useState<UIReport[]>([])
  const [loading, setLoading] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedReport, setSelectedReport] = useState<UIReport | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    loadProjects()
    loadReports()
  }, [])

  useEffect(() => {
    loadReports()
  }, [searchText])

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects()
      setProjects(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载项目列表失败:', error)
      setProjects([])
    }
  }

  const loadReports = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (searchText) {
        params.search = searchText
      }
      const data = await reportService.getReports(params)
      // 过滤UI类型的报告（通过execution关联的test_case的test_type判断）
      // 这里简化处理，实际应该通过execution_id关联查询
      const allReports = Array.isArray(data) ? data : []
      // 暂时显示所有报告，后续可以通过execution关联过滤
      setReports(allReports)
    } catch (error: any) {
      console.error('加载报告列表失败:', error)
      message.error('加载报告列表失败: ' + (error.response?.data?.detail || error.message))
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = async (report: UIReport) => {
    try {
      const detail = await reportService.getReport(report.id)
      setSelectedReport(detail)
      setDetailModalVisible(true)
    } catch (error: any) {
      message.error('加载报告详情失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleExport = async (reportId: number) => {
    try {
      const result = await reportService.exportReport(reportId, 'html')
      // 创建Blob并下载
      const blob = new Blob([result.content], { type: 'text/html' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ui-report-${reportId}.html`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      message.success('报告导出成功')
    } catch (error: any) {
      message.error('报告导出失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      passed: 'green',
      failed: 'red',
      error: 'red',
    }
    return colorMap[status] || 'default'
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '报告名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '执行ID',
      dataIndex: 'execution_id',
      key: 'execution_id',
    },
    {
      title: '项目',
      dataIndex: 'project_id',
      key: 'project_id',
      render: (projectId: number) => {
        const project = projects.find(p => p.id === projectId)
        return project ? project.name : projectId
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: UIReport) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleExport(record.id)}
          >
            导出
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Search
            placeholder="搜索报告"
            allowClear
            style={{ width: 300 }}
            onSearch={setSearchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>

        <Table
          columns={columns}
          dataSource={reports}
          loading={loading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 报告详情Modal */}
      <Modal
        title="UI测试报告详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedReport(null)
        }}
        width={1200}
        footer={null}
      >
        {selectedReport && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <p><strong>报告ID:</strong> {selectedReport.id}</p>
              <p><strong>报告名称:</strong> {selectedReport.name}</p>
              <p><strong>执行ID:</strong> {selectedReport.execution_id}</p>
              <p><strong>状态:</strong> <Tag color={getStatusColor(selectedReport.status)}>{selectedReport.status}</Tag></p>
              <p><strong>创建时间:</strong> {selectedReport.created_at ? dayjs(selectedReport.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</p>
            </div>

            {/* 执行结果统计 */}
            {selectedReport.result && (
              <div style={{ marginTop: 16 }}>
                <h4>执行统计:</h4>
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <Tag color="green">通过: {selectedReport.result.passed || 0}</Tag>
                  <Tag color="red">失败: {selectedReport.result.failed || 0}</Tag>
                  <Tag color="blue">总计: {selectedReport.result.total || 0}</Tag>
                </div>
              </div>
            )}

            {/* 步骤详情 */}
            {selectedReport.result?.results && (
              <div style={{ marginTop: 16 }}>
                <h4>步骤详情:</h4>
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  {selectedReport.result.results.map((step: any, index: number) => (
                    <Card key={index} size="small" style={{ marginBottom: 8 }}>
                      <p><strong>步骤 {index + 1}:</strong> {step.name || step.action}</p>
                      <p><strong>状态:</strong> <Tag color={step.status === 'passed' ? 'green' : 'red'}>{step.status}</Tag></p>
                      {step.error && (
                        <p style={{ color: 'red' }}><strong>错误:</strong> {step.error}</p>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 截图展示 */}
            {selectedReport.result?.screenshots && selectedReport.result.screenshots.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>执行截图:</h4>
                <Space wrap>
                  {selectedReport.result.screenshots.map((screenshot: any, index: number) => (
                    <div key={index} style={{ marginBottom: 16 }}>
                      <p><strong>{screenshot.step_name || `步骤 ${screenshot.step_index + 1}`}</strong></p>
                      {screenshot.data && (
                        <Image
                          width={300}
                          src={`data:image/png;base64,${screenshot.data}`}
                          alt={`Screenshot ${index + 1}`}
                        />
                      )}
                    </div>
                  ))}
                </Space>
              </div>
            )}

            {/* 完整结果JSON */}
            <div style={{ marginTop: 16 }}>
              <h4>完整结果:</h4>
              <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 400, overflow: 'auto' }}>
                {JSON.stringify(selectedReport.result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default UIReports

