import { useState, useEffect } from 'react'
import { Table, Tag, Button, Space, Modal, Form, Select, message, Card, Tabs, Statistic, Row, Col, Radio, InputNumber, Input, DatePicker } from 'antd'
import { PlayCircleOutlined, EyeOutlined } from '@ant-design/icons'
import { testExecutionService, TestExecution, TestExecutionCreate } from '../store/services/testExecution'
import { testCaseService } from '../store/services/testCase'
import { projectService } from '../store/services/project'
import { testCaseCollectionService, type TestCaseCollection } from '../store/services/testCaseCollection'
import { environmentService, type Environment } from '../store/services/environment'
import dayjs from 'dayjs'

const { Option } = Select

const TestExecutions: React.FC = () => {
  const [executions, setExecutions] = useState<TestExecution[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [logModalVisible, setLogModalVisible] = useState(false)
  const [selectedExecution, setSelectedExecution] = useState<TestExecution | null>(null)
  const [logs, setLogs] = useState('')
  const [form] = Form.useForm()
  const [projects, setProjects] = useState<any[]>([])
  const [testCases, setTestCases] = useState<any[]>([])
  const [collections, setCollections] = useState<TestCaseCollection[]>([])
  const [caseTags, setCaseTags] = useState<string[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [activeTab, setActiveTab] = useState<'execute' | 'tasks' | 'monitor' | 'config' | 'reports'>('execute')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [projectFilter, setProjectFilter] = useState<number | undefined>(undefined)
  const [targetType, setTargetType] = useState<'single_case' | 'multi_case' | 'collection' | 'tag'>('single_case')
  const [executionMode, setExecutionMode] = useState<'immediate' | 'schedule' | 'conditional'>('immediate')
  const [searchText, setSearchText] = useState<string>('')

  useEffect(() => {
    loadProjects()
    loadExecutions()
    loadEnvironments()
  }, [])

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects()
      if (Array.isArray(data)) {
        setProjects(data)
      } else {
        console.warn('项目列表数据格式错误，期望数组，实际:', typeof data, data)
        setProjects([])
      }
    } catch (error) {
      console.error('加载项目列表失败:', error)
      setProjects([]) // 确保即使出错也有空数组
    }
  }

  const loadTestCases = async (projectId: number) => {
    try {
      const [casesData, collectionsData] = await Promise.all([
        testCaseService.getTestCases({ project_id: projectId }),
        testCaseCollectionService.getCollections({ project_id: projectId }),
      ])

      if (Array.isArray(casesData)) {
        setTestCases(casesData)
        // 提取用例标签
        const tagSet = new Set<string>()
        casesData.forEach((tc: any) => {
          if (tc && Array.isArray(tc.tags)) {
            tc.tags.forEach((tag: string) => tag && tagSet.add(tag))
          }
        })
        setCaseTags(Array.from(tagSet))
      } else {
        console.warn('测试用例列表数据格式错误，期望数组，实际:', typeof casesData, casesData)
        setTestCases([])
        setCaseTags([])
      }

      if (Array.isArray(collectionsData)) {
        setCollections(collectionsData)
      } else {
        console.warn('用例集列表数据格式错误，期望数组，实际:', typeof collectionsData, collectionsData)
        setCollections([])
      }
    } catch (error) {
      console.error('加载测试用例列表失败:', error)
      setTestCases([]) // 确保即使出错也有空数组
      setCollections([])
      setCaseTags([])
    }
  }

  const loadExecutions = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (projectFilter) {
        params.project_id = projectFilter
      }
      if (statusFilter) {
        params.status = statusFilter
      }
      const data = await testExecutionService.getTestExecutions(params)
      console.log('测试执行列表数据:', data) // 调试日志
      if (Array.isArray(data)) {
        setExecutions(data)
      } else {
        console.warn('测试执行列表数据格式错误，期望数组，实际:', typeof data, data)
        setExecutions([])
      }
    } catch (error: any) {
      console.error('加载测试执行列表失败:', error)
      console.error('错误详情:', error.response?.data)
      message.error('加载测试执行列表失败: ' + (error.response?.data?.detail || error.message))
      setExecutions([]) // 确保即使出错也有空数组
    } finally {
      setLoading(false)
    }
  }

  const loadEnvironments = async () => {
    try {
      const data = await environmentService.getEnvironments(true)
      setEnvironments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载环境列表失败:', error)
      setEnvironments([])
    }
  }

  const handleExecute = () => {
    form.resetFields()
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const executionsToCreate: TestExecutionCreate[] = []

      // 执行配置（环境变量 / 全局变量 / 数据源 / 执行参数 / 执行控制 等）统一落到 config 字段
      const baseConfig: Record<string, any> = {
        ...(values.config || {}),
        environment_variables: values.environment_variables || undefined,
        global_variables: values.global_variables || undefined,
        data_source_config: values.data_source_config || undefined,
        execution_params: {
          concurrency: values.concurrency ?? 1,
          timeout_seconds: values.timeout_seconds,
          retry_strategy: {
            enabled: values.retry_max_retries > 0,
            max_retries: values.retry_max_retries,
            backoff_seconds: values.retry_backoff_seconds,
          },
          failure_strategy: values.failure_strategy || 'stop_on_first_failure',
        },
        scheduling: {
          mode: values.execution_mode || executionMode || 'immediate',
          scheduled_at: values.scheduled_at
            ? (values.scheduled_at as any).toISOString?.() ?? values.scheduled_at
            : undefined,
          condition_expression: values.condition_expression || undefined,
        },
      }

      const base: Omit<TestExecutionCreate, 'test_case_id'> = {
        project_id: values.project_id,
        config: baseConfig,
        environment: values.environment,
      }

      const currentTargetType: typeof targetType = values.target_type || targetType || 'single_case'

      if (currentTargetType === 'single_case') {
        executionsToCreate.push({
          ...base,
          test_case_id: values.test_case_id,
        })
      } else if (currentTargetType === 'multi_case') {
        const ids: number[] = Array.isArray(values.test_case_ids) ? values.test_case_ids : []
        ids.forEach(id => {
          executionsToCreate.push({
            ...base,
            test_case_id: id,
          })
        })
      } else if (currentTargetType === 'collection') {
        const collectionId: number | undefined = values.collection_id
        const collection = collections.find(c => c.id === collectionId)
        const ids: number[] = Array.isArray(collection?.test_case_ids) ? collection!.test_case_ids! : []
        ids.forEach(id => {
          executionsToCreate.push({
            ...base,
            config: {
              ...base.config,
              collection_id: collectionId,
            },
            test_case_id: id,
          })
        })
      } else if (currentTargetType === 'tag') {
        const tag: string | undefined = values.tag
        const matchedCases = Array.isArray(testCases)
          ? testCases.filter(
              (tc: any) => tc && Array.isArray(tc.tags) && tag && tc.tags.includes(tag),
            )
          : []
        matchedCases.forEach((tc: any) => {
          executionsToCreate.push({
            ...base,
            config: {
              ...base.config,
              tag,
            },
            test_case_id: tc.id,
          })
        })
      }

      if (!executionsToCreate.length) {
        message.warning('没有可执行的用例，请检查选择条件')
        return
      }

      await Promise.all(
        executionsToCreate.map(data => testExecutionService.createTestExecution(data)),
      )

      message.success(`已启动 ${executionsToCreate.length} 条测试执行`)
      setModalVisible(false)
      loadExecutions()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error('启动测试执行失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleViewLogs = async (execution: TestExecution) => {
    try {
      setSelectedExecution(execution)
      const logData = await testExecutionService.getExecutionLogs(execution.id)
      setLogs(logData.logs || '暂无日志')
      setLogModalVisible(true)
    } catch (error: any) {
      message.error('加载日志失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleRetry = async (execution: TestExecution) => {
    try {
      const baseConfig: Record<string, any> = {
        ...(execution.config || {}),
        retry_of: execution.id,
      }
      const data: TestExecutionCreate = {
        test_case_id: execution.test_case_id,
        project_id: execution.project_id,
        environment: execution.environment,
        config: baseConfig,
      }
      await testExecutionService.createTestExecution(data)
      message.success(`已触发重试（原执行ID: ${execution.id}）`)
      loadExecutions()
    } catch (error: any) {
      message.error('触发重试失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const columns = [
    {
      title: '执行ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '测试用例ID',
      dataIndex: 'test_case_id',
      key: 'test_case_id',
      width: 120,
    },
    {
      title: '项目',
      dataIndex: 'project_id',
      key: 'project',
      render: (projectId: number) => {
        if (!Array.isArray(projects)) {
          return projectId
        }
        const project = projects.find(p => p.id === projectId)
        return project?.name || projectId
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          pending: 'default',
          running: 'processing',
          passed: 'success',
          failed: 'error',
          cancelled: 'warning',
          error: 'error',
        }
        const labelMap: Record<string, string> = {
          pending: '待执行',
          running: '执行中',
          passed: '通过',
          failed: '失败',
          cancelled: '已取消',
          error: '错误',
        }
        return <Tag color={colorMap[status] || 'default'}>{labelMap[status] || status}</Tag>
      },
    },
    {
      title: '环境',
      dataIndex: 'environment',
      key: 'environment',
    },
    {
      title: '开始时间',
      dataIndex: 'started_at',
      key: 'started_at',
      render: (time: string) =>
        time ? dayjs(time).add(8, 'hour').format('YYYY/MM/DD HH:mm:ss') : '-',
    },
    {
      title: '完成时间',
      dataIndex: 'finished_at',
      key: 'finished_at',
      render: (time: string) =>
        time ? dayjs(time).add(8, 'hour').format('YYYY/MM/DD HH:mm:ss') : '-',
    },
    {
      title: '计划执行时间',
      dataIndex: ['config', 'scheduling', 'scheduled_at'] as any,
      key: 'scheduled_at',
      render: (_: any, record: any) => {
        const scheduledAt = (record as any)?.config?.scheduling?.scheduled_at
        if (!scheduledAt) return '-'
        try {
          return dayjs(scheduledAt).add(8, 'hour').format('YYYY/MM/DD HH:mm:ss')
        } catch {
          return String(scheduledAt)
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      render: (_: any, record: TestExecution) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewLogs(record)}
          >
            查看日志
          </Button>
          {(record.status === 'failed' || record.status === 'error') && (
            <Button type="link" onClick={() => handleRetry(record)}>
              重试
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const totalCount = Array.isArray(executions) ? executions.length : 0
  const statusCount = (status: string) =>
    Array.isArray(executions) ? executions.filter(e => e.status === status).length : 0
  const finishedExecutions = Array.isArray(executions)
    ? executions.filter(e => e.started_at && e.finished_at)
    : []
  const avgDurationMs =
    finishedExecutions.length > 0
      ? finishedExecutions.reduce((sum, e) => {
          const start = e.started_at ? new Date(e.started_at).getTime() : 0
          const end = e.finished_at ? new Date(e.finished_at).getTime() : 0
          const diff = end > start ? end - start : 0
          return sum + diff
        }, 0) / finishedExecutions.length
      : 0
  const successRate =
    totalCount > 0 ? ((statusCount('passed') / totalCount) * 100).toFixed(1) : '0.0'
  const errorRate =
    totalCount > 0
      ? (
          ((statusCount('failed') + statusCount('error')) / totalCount) *
          100
        ).toFixed(1)
      : '0.0'

  const executionTable = (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Space size="middle" style={{ flexWrap: 'wrap' }}>
          <Select
            allowClear
            placeholder="按项目筛选"
            style={{ width: 200 }}
            value={projectFilter}
            onChange={(value) => {
              setProjectFilter(value)
            }}
          >
            {Array.isArray(projects) && projects.map(project => (
              <Option key={project.id} value={project.id}>
                {project.name}
              </Option>
            ))}
          </Select>
          <Select
            allowClear
            placeholder="按状态筛选"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value)
            }}
          >
            <Option value="pending">待执行</Option>
            <Option value="running">执行中</Option>
            <Option value="passed">通过</Option>
            <Option value="failed">失败</Option>
            <Option value="cancelled">已取消</Option>
            <Option value="error">错误</Option>
          </Select>
          <Input
            allowClear
            placeholder="按执行ID / 用例ID / 环境搜索"
            style={{ width: 260 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button onClick={loadExecutions}>刷新</Button>
        </Space>
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleExecute}>
          立即执行
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={Array.isArray(executions)
          ? executions.filter(e => {
              if (!searchText) return true
              const keyword = searchText.trim().toLowerCase()
              const idStr = String(e.id ?? '').toLowerCase()
              const caseIdStr = String((e as any).test_case_id ?? '').toLowerCase()
              const envStr = String((e as any).environment ?? '').toLowerCase()
              return (
                idStr.includes(keyword) ||
                caseIdStr.includes(keyword) ||
                envStr.includes(keyword)
              )
            })
          : []}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
    </>
  )

  const monitorPanel = (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic title="总执行次数" value={totalCount} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="执行中" value={statusCount('running')} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="已通过" value={statusCount('passed')} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="失败/错误" value={statusCount('failed') + statusCount('error')} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="平均响应时间（秒）"
            value={avgDurationMs ? (avgDurationMs / 1000).toFixed(2) : '0.00'}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="成功率 / 错误率" value={`${successRate}% / ${errorRate}%`} />
        </Card>
      </Col>
    </Row>
  )

  return (
    <div style={{ padding: '16px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <h2 style={{ marginBottom: 16 }}>测试执行</h2>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as any)}
        items={[
          {
            key: 'execute',
            label: '立即执行',
            children: executionTable,
          },
          {
            key: 'tasks',
            label: '任务管理',
            children: executionTable,
          },
          {
            key: 'monitor',
            label: '执行监控',
            children: (
              <>
                {monitorPanel}
                <div style={{ marginTop: 24 }}>
                  {executionTable}
                </div>
              </>
            ),
          },
          {
            key: 'config',
            label: '执行配置',
            children: (
              <Card>
                <p>执行配置（环境变量、全局变量、前后置脚本等）当前由测试用例与数据驱动配置页面统一管理。</p>
              </Card>
            ),
          },
          {
            key: 'reports',
            label: '执行报告',
            children: (
              <Card>
                <p>执行报告功能已通过「测试报告」菜单提供，当前测试执行列表中的每条记录都会生成对应报告。</p>
              </Card>
            ),
          },
        ]}
      />
      <Modal
        title="执行测试"
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="project_id"
            label="项目"
            rules={[{ required: true, message: '请选择项目' }]}
          >
            <Select
              placeholder="请选择项目"
              onChange={(value) => {
                loadTestCases(value)
                form.setFieldValue('test_case_id', undefined)
              form.setFieldValue('test_case_ids', undefined)
              form.setFieldValue('collection_id', undefined)
              form.setFieldValue('tag', undefined)
              }}
            >
              {Array.isArray(projects) && projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="target_type"
            label="执行对象类型"
            initialValue="single_case"
          >
            <Radio.Group
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
            >
              <Space direction="vertical">
                <Radio value="single_case">单用例执行</Radio>
                <Radio value="multi_case">多用例选择</Radio>
                <Radio value="collection">用例集选择</Radio>
                <Radio value="tag">按标签选择</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
          {targetType === 'single_case' && (
            <Form.Item
              name="test_case_id"
              label="测试用例"
              rules={[{ required: true, message: '请选择测试用例' }]}
            >
              <Select placeholder="请先选择项目">
                {Array.isArray(testCases) && testCases.map(testCase => (
                  <Option key={testCase.id} value={testCase.id}>
                    {testCase.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {targetType === 'multi_case' && (
            <Form.Item
              name="test_case_ids"
              label="测试用例（多选）"
              rules={[{ required: true, message: '请选择至少一个测试用例' }]}
            >
              <Select
                mode="multiple"
                placeholder="请选择一个或多个测试用例"
                allowClear
              >
                {Array.isArray(testCases) && testCases.map(testCase => (
                  <Option key={testCase.id} value={testCase.id}>
                    {testCase.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {targetType === 'collection' && (
            <Form.Item
              name="collection_id"
              label="用例集"
              rules={[{ required: true, message: '请选择用例集' }]}
            >
              <Select placeholder="请选择用例集">
                {Array.isArray(collections) && collections.map(collection => (
                  <Option key={collection.id} value={collection.id}>
                    {collection.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {targetType === 'tag' && (
            <Form.Item
              name="tag"
              label="用例标签"
              rules={[{ required: true, message: '请选择标签' }]}
            >
              <Select placeholder="请选择标签">
                {Array.isArray(caseTags) && caseTags.map(tag => (
                  <Option key={tag} value={tag}>
                    {tag}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="environment" label="执行环境">
            <Select placeholder="请选择环境">
              {Array.isArray(environments) && environments.length > 0 ? (
                environments.map(env => (
                  <Option key={env.id} value={env.key}>
                    {env.name} ({env.key})
                  </Option>
                ))
              ) : (
                <>
                  <Option value="default">默认环境</Option>
                </>
              )}
            </Select>
          </Form.Item>

          {/* 执行控制：立即执行 / 定时执行 / 条件触发（当前为配置占位，调度引擎可据此实现） */}
          <Form.Item
            name="execution_mode"
            label="执行方式"
            initialValue="immediate"
          >
            <Radio.Group
              value={executionMode}
              onChange={(e) => setExecutionMode(e.target.value)}
            >
              <Space direction="vertical">
                <Radio value="immediate">立即执行</Radio>
                <Radio value="schedule">定时执行（按时间触发）</Radio>
                <Radio value="conditional">条件触发（按条件脚本触发）</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          {executionMode === 'schedule' && (
            <Form.Item
              name="scheduled_at"
              label="计划执行时间"
              rules={[{ required: true, message: '请选择计划执行时间' }]}
            >
              <DatePicker
                showTime
                style={{ width: '100%' }}
                placeholder="选择计划执行时间"
              />
            </Form.Item>
          )}

          {executionMode === 'conditional' && (
            <Form.Item
              name="condition_expression"
              label="触发条件脚本"
              tooltip="例如：当某个 CI 变量满足条件时触发，可由外部调度器解析执行"
              rules={[{ required: true, message: '请输入触发条件脚本' }]}
            >
              <Input.TextArea
                placeholder='例如：branch == "main" && last_build_status == "success"'
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
            </Form.Item>
          )}

          {/* 环境配置 - 环境变量 / 全局变量 / 数据源配置（当前作为 JSON 文本占位，实现基础配置能力） */}
          <Form.Item
            name="environment_variables"
            label="环境变量（JSON，可选）"
          >
            <Input.TextArea
              placeholder='例如：{"BASE_URL": "https://api.example.com"}'
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>
          <Form.Item
            name="global_variables"
            label="全局变量（JSON，可选）"
          >
            <Input.TextArea
              placeholder='例如：{"token": "xxx", "tenant": "default"}'
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>
          <Form.Item
            name="data_source_config"
            label="数据源配置（JSON，可选）"
          >
            <Input.TextArea
              placeholder='例如：{"datasource": "mysql://...", "template": "user_login"}'
              autoSize={{ minRows: 2, maxRows: 4 }}
            />
          </Form.Item>

          {/* 执行参数 */}
          <Form.Item
            name="concurrency"
            label="并发数"
            initialValue={1}
          >
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="timeout_seconds"
            label="超时时间（秒）"
          >
            <InputNumber min={1} max={3600} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="retry_max_retries"
            label="最大重试次数"
            initialValue={0}
          >
            <InputNumber min={0} max={10} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="retry_backoff_seconds"
            label="重试间隔（秒）"
            initialValue={0}
          >
            <InputNumber min={0} max={600} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="failure_strategy"
            label="失败处理策略"
            initialValue="stop_on_first_failure"
          >
            <Select>
              <Option value="stop_on_first_failure">遇到第一个失败即停止</Option>
              <Option value="continue_on_failure">忽略失败，继续执行后续步骤</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="执行日志"
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
        footer={null}
        width={900}
      >
        <Card>
          <Space style={{ marginBottom: 12 }}>
            <Select
              allowClear
              placeholder="按级别筛选（INFO/WARN/ERROR）"
              style={{ width: 220 }}
              onChange={(level) => {
                if (!level) {
                  setLogs(selectedExecution?.logs || logs)
                  return
                }
                const raw = selectedExecution?.logs || logs || ''
                const filtered = raw
                  .split('\n')
                  .filter(line => line.toUpperCase().includes(String(level).toUpperCase()))
                  .join('\n')
                setLogs(filtered || raw)
              }}
            >
              <Option value="INFO">INFO</Option>
              <Option value="WARN">WARN</Option>
              <Option value="ERROR">ERROR</Option>
            </Select>
            <Input.Search
              allowClear
              placeholder="搜索日志关键字"
              style={{ width: 260 }}
              onSearch={(keyword) => {
                const raw = selectedExecution?.logs || logs || ''
                if (!keyword) {
                  setLogs(raw)
                  return
                }
                const lower = keyword.toLowerCase()
                const filtered = raw
                  .split('\n')
                  .filter(line => line.toLowerCase().includes(lower))
                  .join('\n')
                setLogs(filtered || raw)
              }}
            />
            <Button
              onClick={() => {
                const content = logs || selectedExecution?.logs || ''
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.setAttribute('download', `execution-${selectedExecution?.id ?? 'logs'}.log`)
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
              }}
            >
              导出日志
            </Button>
          </Space>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '500px', overflow: 'auto' }}>
            {logs}
          </pre>
        </Card>
      </Modal>
    </div>
  )
}

export default TestExecutions
