import { useState, useEffect, useRef } from 'react'
import { Table, Tag, Button, Space, Modal, Form, Select, message, Card, Tabs, Statistic, Row, Col, Input, Popconfirm, Image } from 'antd'
import { PlayCircleOutlined, EyeOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { testExecutionService, TestExecution, TestExecutionCreate } from '../../store/services/testExecution'
import { testCaseService } from '../../store/services/testCase'
import { projectService } from '../../store/services/project'
import dayjs from 'dayjs'

const { Option } = Select

const UIExecutions: React.FC = () => {
  const [executions, setExecutions] = useState<TestExecution[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedExecution, setSelectedExecution] = useState<TestExecution | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [testCases, setTestCases] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [projectFilter, setProjectFilter] = useState<number | undefined>(undefined)
  const [searchText, setSearchText] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (projectFilter) {
      loadTestCases()
    }
  }, [projectFilter])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    loadExecutions()
  }, [page, pageSize, projectFilter, statusFilter])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1)
      setTimeout(() => {
        loadExecutions()
      }, 0)
    }, 500)
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
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

  const loadTestCases = async () => {
    if (!projectFilter) return
    try {
      const data = await testCaseService.getTestCases({
        project_id: projectFilter,
        test_type: 'ui',
        limit: 1000
      })
      setTestCases(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载测试用例列表失败:', error)
      setTestCases([])
    }
  }

  const loadExecutions = async () => {
    try {
      setLoading(true)
      const params: any = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
        test_type: 'ui' // 只加载UI类型的执行
      }
      if (projectFilter) {
        params.project_id = projectFilter
      }
      if (statusFilter) {
        params.status = statusFilter
      }
      if (searchText && searchText.trim()) {
        params.search = searchText.trim()
      }
      const data = await testExecutionService.getTestExecutions(params)
      if (data && data.items && Array.isArray(data.items)) {
        setExecutions(data.items)
        setTotal(data.total !== undefined ? data.total : data.items.length)
      } else if (Array.isArray(data)) {
        setExecutions(data)
        setTotal(data.length)
      } else {
        setExecutions([])
        setTotal(0)
      }
    } catch (error: any) {
      console.error('加载执行列表失败:', error)
      message.error('加载执行列表失败: ' + (error.response?.data?.detail || error.message))
      setExecutions([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = async (execution: TestExecution) => {
    setSelectedExecution(execution)
    setDetailModalVisible(true)
  }

  const handleRetry = async (execution: TestExecution) => {
    try {
      const executionData: TestExecutionCreate = {
        test_case_ids: execution.test_case_ids || [],
        test_type: 'ui',
        config: execution.config || {}
      }
      await testExecutionService.createTestExecution(executionData)
      message.success('重试任务已创建')
      loadExecutions()
    } catch (error: any) {
      message.error('创建重试任务失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await testExecutionService.deleteTestExecution(id)
      message.success('删除成功')
      loadExecutions()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      passed: 'green',
      failed: 'red',
      error: 'red',
      running: 'blue',
      pending: 'orange',
      cancelled: 'default',
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
      title: '执行时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
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
      title: '用例数',
      dataIndex: 'test_case_ids',
      key: 'test_case_ids',
      render: (ids: number[]) => ids?.length || 0,
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
      title: '操作',
      key: 'action',
      width: 250,
      render: (_: any, record: TestExecution) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          {(record.status === 'failed' || record.status === 'error') && (
            <Button
              type="link"
              icon={<ReloadOutlined />}
              onClick={() => handleRetry(record)}
            >
              重试
            </Button>
          )}
          <Popconfirm
            title="确定要删除这个执行记录吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // 统计信息
  const stats = {
    total: executions.length,
    passed: executions.filter(e => e.status === 'passed').length,
    failed: executions.filter(e => e.status === 'failed' || e.status === 'error').length,
    running: executions.filter(e => e.status === 'running').length,
  }

  return (
    <div>
      <Card>
        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title="总执行数" value={stats.total} />
          </Col>
          <Col span={6}>
            <Statistic title="通过" value={stats.passed} valueStyle={{ color: '#3f8600' }} />
          </Col>
          <Col span={6}>
            <Statistic title="失败" value={stats.failed} valueStyle={{ color: '#cf1322' }} />
          </Col>
          <Col span={6}>
            <Statistic title="执行中" value={stats.running} valueStyle={{ color: '#1890ff' }} />
          </Col>
        </Row>

        {/* 筛选条件 */}
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="选择项目"
            allowClear
            style={{ width: 200 }}
            value={projectFilter}
            onChange={setProjectFilter}
          >
            {projects.map(project => (
              <Option key={project.id} value={project.id}>
                {project.name}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="选择状态"
            allowClear
            style={{ width: 150 }}
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Option value="passed">通过</Option>
            <Option value="failed">失败</Option>
            <Option value="error">错误</Option>
            <Option value="running">执行中</Option>
            <Option value="pending">等待中</Option>
            <Option value="cancelled">已取消</Option>
          </Select>
          <Input
            placeholder="搜索执行记录"
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={executions}
          loading={loading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPage(page)
              setPageSize(pageSize)
            },
          }}
        />
      </Card>

      {/* 执行详情Modal */}
      <Modal
        title="执行详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedExecution(null)
        }}
        width={1000}
        footer={null}
      >
        {selectedExecution && (
          <div>
            <p><strong>执行ID:</strong> {selectedExecution.id}</p>
            <p><strong>状态:</strong> <Tag color={getStatusColor(selectedExecution.status)}>{selectedExecution.status}</Tag></p>
            <p><strong>创建时间:</strong> {selectedExecution.created_at ? dayjs(selectedExecution.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</p>
            <p><strong>用例数:</strong> {selectedExecution.test_case_ids?.length || 0}</p>
            
            {/* 执行结果 */}
            {selectedExecution.result && (
              <div style={{ marginTop: 16 }}>
                <h4>执行结果:</h4>
                <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 400, overflow: 'auto' }}>
                  {JSON.stringify(selectedExecution.result, null, 2)}
                </pre>
              </div>
            )}

            {/* 截图展示 */}
            {selectedExecution.result?.screenshots && selectedExecution.result.screenshots.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>截图:</h4>
                <Space wrap>
                  {selectedExecution.result.screenshots.map((screenshot: any, index: number) => (
                    <div key={index} style={{ marginBottom: 16 }}>
                      <p>{screenshot.step_name || `步骤 ${screenshot.step_index + 1}`}</p>
                      {screenshot.data && (
                        <Image
                          width={200}
                          src={`data:image/png;base64,${screenshot.data}`}
                          alt={`Screenshot ${index + 1}`}
                        />
                      )}
                    </div>
                  ))}
                </Space>
              </div>
            )}

            {/* 执行日志 */}
            {selectedExecution.logs && (
              <div style={{ marginTop: 16 }}>
                <h4>执行日志:</h4>
                <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, maxHeight: 300, overflow: 'auto' }}>
                  {selectedExecution.logs}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default UIExecutions

