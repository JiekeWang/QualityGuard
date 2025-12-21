import { useState, useEffect, useRef } from 'react'
import { Table, Tag, Button, Space, Modal, Form, Select, message, Card, Tabs, Statistic, Row, Col, Radio, InputNumber, Input, DatePicker, Popconfirm } from 'antd'
import { PlayCircleOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import { testExecutionService, TestExecution, TestExecutionCreate } from '../store/services/testExecution'
import { testCaseService } from '../store/services/testCase'
import { projectService } from '../store/services/project'
import { testCaseCollectionService, type TestCaseCollection } from '../store/services/testCaseCollection'
import { environmentService, type Environment } from '../store/services/environment'
import { tokenConfigService, type TokenConfig } from '../store/services/tokenConfig'
import dayjs from 'dayjs'

const { Option } = Select

const TestExecutions: React.FC = () => {
  const [executions, setExecutions] = useState<TestExecution[]>([])
  const [total, setTotal] = useState(0)
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
  const [tokenConfigs, setTokenConfigs] = useState<TokenConfig[]>([])
  const [activeTab, setActiveTab] = useState<'execute' | 'tasks' | 'monitor' | 'config' | 'reports'>('execute')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [projectFilter, setProjectFilter] = useState<number | undefined>(undefined)
  const [targetType, setTargetType] = useState<'single_case' | 'multi_case' | 'collection' | 'tag'>('single_case')
  const [executionMode, setExecutionMode] = useState<'immediate' | 'schedule'>('immediate')
  const [scheduleType, setScheduleType] = useState<'once' | 'daily' | 'weekly' | 'time_range'>('once')
  const [searchText, setSearchText] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadProjects()
    loadEnvironments()
    loadTokenConfigs()
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
      const params: any = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      }
      if (projectFilter) {
        params.project_id = projectFilter
      }
      // 如果是任务管理tab，只显示定时执行的任务（pending状态且scheduling.mode为schedule）
      if (activeTab === 'tasks') {
        params.status = 'pending'
        params.schedule_mode = 'schedule'
      } else {
        // 立即执行和执行监控tab：过滤掉pending状态的数据
        // 如果有状态筛选，使用筛选条件；否则排除pending状态
        if (statusFilter) {
          params.status = statusFilter
        } else {
          // 排除pending状态，可以传多个状态用逗号分隔，或者在前端过滤
          // 这里我们在前端过滤
        }
      }
      // 如果有搜索关键词，传递给后端进行搜索
      if (searchText && searchText.trim()) {
        params.search = searchText.trim()
      }
      const data = await testExecutionService.getTestExecutions(params)
      console.log('测试执行列表数据:', data) // 调试日志
      console.log('分页参数:', { page, pageSize, total }) // 调试日志
      if (data && data.items && Array.isArray(data.items)) {
        let filteredExecutions = data.items
        
        // 如果是任务管理tab，前端再次过滤确保只显示定时执行的任务
        if (activeTab === 'tasks') {
          filteredExecutions = filteredExecutions.filter((exec: any) => {
            const scheduling = exec.config?.scheduling
            return scheduling?.mode === 'schedule' && exec.status === 'pending'
          })
        } else {
          // 立即执行和执行监控tab：过滤掉pending状态的数据
          filteredExecutions = filteredExecutions.filter((exec: any) => {
            return exec.status !== 'pending'
          })
        }
        
        setExecutions(filteredExecutions)
        const newTotal = activeTab === 'tasks' ? filteredExecutions.length : (data.total !== undefined ? data.total : 0)
        console.log('设置total为:', newTotal) // 调试日志
        setTotal(newTotal)
      } else if (Array.isArray(data)) {
        // 兼容旧格式
        let filteredData = data
        // 如果不是任务管理tab，过滤掉pending状态
        if (activeTab !== 'tasks') {
          filteredData = data.filter((exec: any) => exec.status !== 'pending')
        }
        setExecutions(filteredData)
        const newTotal = filteredData.length
        console.log('设置total为（数组长度）:', newTotal) // 调试日志
        setTotal(newTotal)
      } else {
        console.warn('测试执行列表数据格式错误，期望数组，实际:', typeof data, data)
        setExecutions([])
        setTotal(0)
      }
    } catch (error: any) {
      console.error('加载测试执行列表失败:', error)
      console.error('错误详情:', error.response?.data)
      message.error('加载测试执行列表失败: ' + (error.response?.data?.detail || error.message))
      setExecutions([]) // 确保即使出错也有空数组
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  // 当分页参数、筛选条件变化时立即加载
  useEffect(() => {
    // 清除搜索防抖定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    loadExecutions()
  }, [page, pageSize, projectFilter, statusFilter])
  
  // 搜索关键词变化时触发加载（带防抖，并重置到第一页）
  useEffect(() => {
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // 设置新的定时器，500ms后执行
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1) // 搜索时重置到第一页
      // 延迟执行loadExecutions，确保page已经更新
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

  const loadEnvironments = async () => {
    try {
      const data = await environmentService.getEnvironments(true)
      setEnvironments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载环境列表失败:', error)
      setEnvironments([])
    }
  }

  const loadTokenConfigs = async () => {
    try {
      const data = await tokenConfigService.getTokenConfigs({ is_active: true })
      setTokenConfigs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载Token配置列表失败:', error)
      setTokenConfigs([])
    }
  }

  const handleExecute = () => {
    form.resetFields()
    setExecutionMode('immediate')
    setScheduleType('once')
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const executionsToCreate: TestExecutionCreate[] = []

      // 执行配置（Token配置和执行方式）统一落到 config 字段
      const currentMode = values.execution_mode || executionMode || 'immediate'
      
      // 处理定时执行配置
      let schedulingConfig: any = {
        mode: currentMode,
      }
      
      if (currentMode === 'schedule') {
        const currentScheduleType = values.schedule_type || scheduleType || 'once'
        schedulingConfig.schedule_type = currentScheduleType
        
        if (currentScheduleType === 'once') {
          // 保存完整的日期时间字符串，保持用户输入的时区（本地时间）
          // 必须从表单获取 dayjs 对象，因为 validateFields 可能将 dayjs 转换为字符串
          const formValue = form.getFieldValue('scheduled_at')
          
          if (!formValue) {
            message.error('请选择计划执行时间')
            return
          }
          
          let dt: dayjs.Dayjs
          
          // 优先使用表单中的 dayjs 对象（保留完整时间信息）
          if (dayjs.isDayjs(formValue)) {
            dt = formValue
            console.log('使用表单中的 dayjs 对象')
          } else if (dayjs.isDayjs(values.scheduled_at)) {
            dt = values.scheduled_at
            console.log('使用 values 中的 dayjs 对象')
          } else {
            // 如果是字符串，尝试解析
            const strValue = formValue || values.scheduled_at
            dt = dayjs(strValue)
            
            if (!dt.isValid()) {
              console.error('Invalid scheduled_at:', strValue)
              message.error('计划执行时间格式错误，请重新选择')
              return
            }
            console.log('从字符串解析 dayjs 对象，原始值:', strValue)
          }
          
          // 检查时分秒信息
          const hour = dt.hour()
          const minute = dt.minute()
          const second = dt.second()
          console.log('保存计划执行时间 - formValue:', formValue, '类型:', typeof formValue, '是否为dayjs:', dayjs.isDayjs(formValue))
          console.log('保存计划执行时间 - values.scheduled_at:', values.scheduled_at, '类型:', typeof values.scheduled_at)
          console.log('保存计划执行时间 - dayjs对象时分秒:', `${hour}:${minute}:${second}`)
          
          // 格式化保存，确保包含时分秒
          // 如果时分秒都是 0，可能是用户没有选择时间，使用默认时间 00:00:00
          // 但为了确保保存完整的时间格式，仍然使用 HH:mm:ss 格式
          const formattedTime = dt.format('YYYY-MM-DD HH:mm:ss')
          schedulingConfig.scheduled_at = formattedTime
          console.log('保存的计划执行时间（格式化后）:', formattedTime)
          console.log('保存的计划执行时间（验证）:', dayjs(formattedTime).format('YYYY-MM-DD HH:mm:ss'))
        } else if (currentScheduleType === 'daily') {
          if (values.scheduled_at) {
            // 保存日期部分（不带时间）
            schedulingConfig.scheduled_at = dayjs(values.scheduled_at).format('YYYY-MM-DD')
          }
          if (values.schedule_config?.time) {
            schedulingConfig.schedule_config = {
              time: dayjs(values.schedule_config.time).format('HH:mm:ss'),
            }
          }
        } else if (currentScheduleType === 'weekly') {
          if (values.schedule_config?.time) {
            schedulingConfig.schedule_config = {
              time: dayjs(values.schedule_config.time).format('HH:mm:ss'),
              weekdays: values.schedule_config.weekdays || [],
            }
          }
        } else if (currentScheduleType === 'time_range') {
          if (values.schedule_config?.range && Array.isArray(values.schedule_config.range)) {
            schedulingConfig.schedule_config = {
              start: dayjs(values.schedule_config.range[0]).format('YYYY-MM-DD HH:mm:ss'),
              end: dayjs(values.schedule_config.range[1]).format('YYYY-MM-DD HH:mm:ss'),
            }
          }
        }
      }
      
      const baseConfig: Record<string, any> = {
        ...(values.config || {}),
        token_config_id: values.token_config_id || undefined,
        scheduling: schedulingConfig,
      }
      
      // 调试：打印完整的配置对象
      if (currentMode === 'schedule') {
        console.log('保存的完整 scheduling 配置:', JSON.stringify(schedulingConfig, null, 2))
        console.log('保存的完整 baseConfig:', JSON.stringify(baseConfig, null, 2))
      }

      const base: Omit<TestExecutionCreate, 'test_case_id'> = {
        project_id: values.project_id,
        config: baseConfig,
        environment: values.environment,
      }
      
      const currentTargetType: typeof targetType = values.target_type || targetType || 'single_case'
      
      // 调试：打印最终发送到后端的数据
      if (currentMode === 'schedule') {
        console.log('发送到后端的执行数据（第一个）:', JSON.stringify({
          ...base,
          test_case_id: currentTargetType === 'single_case' ? values.test_case_id : 'multiple'
        }, null, 2))
      }

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
      form.resetFields()
      setExecutionMode('immediate')
      setScheduleType('once')
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

  const handleDelete = async (id: number) => {
    try {
      await testExecutionService.deleteTestExecution(id)
      message.success('删除成功')
      loadExecutions()
      setSelectedRowKeys([])
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的测试执行')
      return
    }
    try {
      await testExecutionService.batchDeleteTestExecutions(selectedRowKeys as number[])
      message.success(`成功删除 ${selectedRowKeys.length} 条测试执行`)
      loadExecutions()
      setSelectedRowKeys([])
    } catch (error: any) {
      message.error('批量删除失败: ' + (error.response?.data?.detail || error.message))
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
      title: '任务类型',
      dataIndex: ['config', 'scheduling', 'schedule_type'] as any,
      key: 'schedule_type',
      width: 100,
      render: (_: any, record: any) => {
        const scheduling = (record as any)?.config?.scheduling
        if (!scheduling || scheduling.mode !== 'schedule') {
          return '-'
        }
        const scheduleType = scheduling.schedule_type || 'once'
        const typeMap: Record<string, string> = {
          once: '单次执行',
          daily: '每天执行',
          weekly: '每周执行',
          time_range: '时间段执行',
        }
        return typeMap[scheduleType] || scheduleType
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
        const scheduling = (record as any)?.config?.scheduling
        if (!scheduling) return '-'
        
        const scheduleType = scheduling.schedule_type || 'once'
        const scheduledAt = scheduling.scheduled_at
        const scheduleConfig = scheduling.schedule_config
        
        try {
          let displayTime = ''
          
          if (scheduleType === 'once') {
            // 单次执行：scheduled_at 包含完整的日期时间
            if (!scheduledAt) return '-'
            let dt = dayjs(scheduledAt)
            if (!dt.isValid()) {
              dt = dayjs(scheduledAt, 'YYYY-MM-DD')
              if (!dt.isValid()) {
                return String(scheduledAt)
              }
            }
            displayTime = dt.format('YYYY/MM/DD HH:mm:ss')
          } else if (scheduleType === 'daily') {
            // 每天执行：scheduled_at 是日期，schedule_config.time 是时间
            if (!scheduledAt) return '-'
            const date = dayjs(scheduledAt, 'YYYY-MM-DD')
            if (!date.isValid()) {
              return String(scheduledAt)
            }
            const time = scheduleConfig?.time || '00:00:00'
            displayTime = date.format('YYYY/MM/DD') + ' ' + time
          } else if (scheduleType === 'weekly') {
            // 每周执行：schedule_config.time 是时间，schedule_config.weekdays 是星期
            // 选项值：1=周一, 2=周二, ..., 7=周日
            // 映射到：0=日, 1=一, 2=二, ..., 6=六
            if (!scheduleConfig?.time) return '-'
            const weekdays = scheduleConfig.weekdays || []
            const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']
            const weekdaysStr = weekdays.length > 0 
              ? `每周${weekdays.map((d: string) => {
                  const num = parseInt(d)
                  // 如果是7（周日），映射到索引0；如果是1-6，映射到索引1-6
                  const index = num === 7 ? 0 : num
                  return weekdayNames[index] || d
                }).join('、')}`
              : ''
            displayTime = `${weekdaysStr} ${scheduleConfig.time}`
          } else if (scheduleType === 'time_range') {
            // 时间段执行：schedule_config.start 和 end
            if (!scheduleConfig?.start || !scheduleConfig?.end) return '-'
            const start = dayjs(scheduleConfig.start).format('YYYY/MM/DD HH:mm:ss')
            const end = dayjs(scheduleConfig.end).format('YYYY/MM/DD HH:mm:ss')
            displayTime = `${start} ~ ${end}`
          } else {
            // 默认情况
            if (scheduledAt) {
              const dt = dayjs(scheduledAt)
              displayTime = dt.isValid() ? dt.format('YYYY/MM/DD HH:mm:ss') : String(scheduledAt)
            } else {
              return '-'
            }
          }
          
          console.log('显示计划执行时间 - scheduleType:', scheduleType, 'scheduledAt:', scheduledAt, 'scheduleConfig:', scheduleConfig, '显示:', displayTime)
          return displayTime
        } catch (e) {
          console.error('格式化计划执行时间失败:', e, scheduling)
          return String(scheduledAt || '-')
        }
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
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
          <Popconfirm
            title="确定要删除这条测试执行吗？"
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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: '500px' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', flexShrink: 0 }}>
        <Space size="middle" style={{ flexWrap: 'wrap' }}>
          <Select
            allowClear
            placeholder="按项目筛选"
            style={{ width: 200 }}
            value={projectFilter}
            onChange={(value) => {
              setProjectFilter(value)
              setPage(1) // 重置到第一页
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
              setPage(1) // 重置到第一页
            }}
          >
            <Option value="running">执行中</Option>
            <Option value="passed">通过</Option>
            <Option value="failed">失败</Option>
            <Option value="cancelled">已取消</Option>
            <Option value="error">错误</Option>
          </Select>
          <Input.Search
            allowClear
            placeholder="按执行ID / 用例ID / 环境搜索"
            style={{ width: 260 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(value) => {
              setSearchText(value)
              // 搜索时重置到第一页（useEffect会自动触发加载）
            }}
            onPressEnter={(e) => {
              const value = (e.target as HTMLInputElement).value
              setSearchText(value)
              // 搜索时重置到第一页（useEffect会自动触发加载）
            }}
          />
          <Button onClick={() => {
            setPage(1)
            loadExecutions()
          }}>刷新</Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`确定要删除选中的 ${selectedRowKeys.length} 条测试执行吗？`}
              onConfirm={handleBatchDelete}
              okText="确定"
              cancelText="取消"
            >
              <Button type="primary" danger icon={<DeleteOutlined />}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleExecute}>
          立即执行
        </Button>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Table
          columns={columns}
          dataSource={executions || []}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          loading={loading}
          scroll={{ y: 'calc(100vh - 380px)', x: 'max-content' }}
          pagination={{
            current: page,
            pageSize,
            total: total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => {
              if (total === 0) {
                return '暂无数据'
              }
              if (range && range.length === 2) {
                return `第 ${range[0]}-${range[1]} 条 / 共 ${total} 条记录`
              }
              return `共 ${total} 条记录`
            },
            onChange: (p, size) => {
              setPage(p)
              setPageSize(size || 20)
            },
            onShowSizeChange: (current, size) => {
              setPage(1) // 改变每页条数时重置到第一页
              setPageSize(size)
            },
            hideOnSinglePage: false, // 即使只有一页也显示分页
            showLessItems: false,
            size: 'default',
            position: ['bottomCenter'], // 确保分页在底部居中显示
          }}
        />
      </div>
    </div>
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
          <Form.Item 
            name="environment" 
            label="执行环境"
            rules={[{ required: true, message: '请选择执行环境' }]}
          >
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

          <Form.Item 
            name="token_config_id" 
            label="Token配置"
            rules={[{ required: true, message: '请选择Token配置' }]}
            tooltip="选择已配置的Token，执行时会自动使用该Token配置获取和刷新Token"
          >
            <Select placeholder="请选择Token配置" allowClear>
              {Array.isArray(tokenConfigs) && tokenConfigs.map(config => (
                <Option key={config.id} value={config.id}>
                  {config.name} {config.project_id ? `(项目${config.project_id})` : '(全局)'}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* 执行控制：立即执行 / 定时执行 */}
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
                <Radio value="schedule">定时执行</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          {executionMode === 'schedule' && (
            <>
              <Form.Item
                name="schedule_type"
                label="定时类型"
                initialValue="once"
                rules={[{ required: true, message: '请选择定时类型' }]}
              >
                <Radio.Group
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value)}
                >
                  <Space direction="vertical">
                    <Radio value="once">单次执行</Radio>
                    <Radio value="daily">每天</Radio>
                    <Radio value="weekly">每周</Radio>
                    <Radio value="time_range">时间段</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              {scheduleType === 'once' && (
                <Form.Item
                  name="scheduled_at"
                  label="计划执行时间"
                  rules={[{ required: true, message: '请选择计划执行时间' }]}
                >
                  <DatePicker
                    showTime={{
                      format: 'HH:mm:ss',
                      defaultValue: dayjs('00:00:00', 'HH:mm:ss'),
                      hideDisabledOptions: false,
                      showNow: false,
                    }}
                    format="YYYY-MM-DD HH:mm:ss"
                    style={{ width: '100%' }}
                    placeholder="选择计划执行时间（请选择日期和时间）"
                    allowClear
                    onChange={(date, dateString) => {
                      // 确保时分秒被正确传递
                      if (date) {
                        const hour = date.hour()
                        const minute = date.minute()
                        const second = date.second()
                        console.log('DatePicker onChange - dayjs对象:', date.format('YYYY-MM-DD HH:mm:ss'), '字符串:', dateString, '时分秒:', `${hour}:${minute}:${second}`)
                        // 确保表单值设置为 dayjs 对象，保留完整的时间信息
                        // 即使 dateString 只有日期，dayjs 对象也包含时间信息
                        form.setFieldValue('scheduled_at', date)
                        console.log('已更新表单值，dayjs对象时分秒:', `${date.hour()}:${date.minute()}:${date.second()}`)
                      } else {
                        // 清空时也更新表单
                        form.setFieldValue('scheduled_at', null)
                      }
                    }}
                  />
                </Form.Item>
              )}

              {scheduleType === 'daily' && (
                <>
                  <Form.Item
                    name={['schedule_config', 'time']}
                    label="执行时间"
                    rules={[{ required: true, message: '请选择执行时间' }]}
                    tooltip="每天在指定时间执行"
                  >
                    <DatePicker
                      picker="time"
                      style={{ width: '100%' }}
                      placeholder="选择执行时间"
                      format="HH:mm:ss"
                    />
                  </Form.Item>
                  <Form.Item
                    name="scheduled_at"
                    label="开始日期"
                    rules={[{ required: true, message: '请选择开始日期' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      placeholder="选择开始日期"
                    />
                  </Form.Item>
                </>
              )}

              {scheduleType === 'weekly' && (
                <>
                  <Form.Item
                    name={['schedule_config', 'time']}
                    label="执行时间"
                    rules={[{ required: true, message: '请选择执行时间' }]}
                    tooltip="每周在指定时间执行"
                  >
                    <DatePicker
                      picker="time"
                      style={{ width: '100%' }}
                      placeholder="选择执行时间"
                      format="HH:mm:ss"
                    />
                  </Form.Item>
                  <Form.Item
                    name={['schedule_config', 'weekdays']}
                    label="执行星期"
                    rules={[{ required: true, message: '请选择执行星期' }]}
                  >
                    <Select mode="multiple" placeholder="选择执行星期">
                      <Option value="1">周一</Option>
                      <Option value="2">周二</Option>
                      <Option value="3">周三</Option>
                      <Option value="4">周四</Option>
                      <Option value="5">周五</Option>
                      <Option value="6">周六</Option>
                      <Option value="7">周日</Option>
                    </Select>
                  </Form.Item>
                </>
              )}

              {scheduleType === 'time_range' && (
                <Form.Item
                  name={['schedule_config', 'range']}
                  label="执行时间段"
                  rules={[{ required: true, message: '请选择执行时间段' }]}
                  tooltip="在指定时间段内执行"
                >
                  <DatePicker.RangePicker
                    showTime
                    style={{ width: '100%' }}
                    placeholder={['开始时间', '结束时间']}
                  />
                </Form.Item>
              )}
            </>
          )}
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
