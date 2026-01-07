import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Tag, Card, Tabs, Switch } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons'
import { testCaseService, TestCase, TestCaseCreate, TestCaseUpdate } from '../../store/services/testCase'
import { projectService } from '../../store/services/project'
import { pageObjectService, PageObject } from '../../store/services/pageObject'
import { testExecutionService } from '../../store/services/testExecution'
import { testDataConfigService, TestDataConfigListItem } from '../../store/services/testDataConfig'
import UIStepEditor, { UIStep } from '../../components/UIStepEditor/UIStepEditor'

const { Option } = Select
const { TextArea } = Input

const UITestCases: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedProject, setSelectedProject] = useState<number | undefined>()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)
  const [form] = Form.useForm()
  const [projects, setProjects] = useState<any[]>([])
  const [pageObjects, setPageObjects] = useState<PageObject[]>([])
  const [executeModalVisible, setExecuteModalVisible] = useState(false)
  const [executeForm] = Form.useForm()
  const [isDataDriven, setIsDataDriven] = useState(false)
  const [testDataConfigs, setTestDataConfigs] = useState<TestDataConfigListItem[]>([])
  const [currentProjectId, setCurrentProjectId] = useState<number | undefined>()

  useEffect(() => {
    loadProjects()
    loadTestCases()
  }, [])

  useEffect(() => {
    loadTestCases()
    if (selectedProject) {
      loadPageObjects()
    }
  }, [selectedProject, searchText])

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects()
      setProjects(data)
    } catch (error) {
      console.error('加载项目列表失败:', error)
    }
  }

  const loadPageObjects = async () => {
    if (!selectedProject) return
    try {
      const data = await pageObjectService.getPageObjects({ project_id: selectedProject })
      setPageObjects(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载页面对象列表失败:', error)
      setPageObjects([])
    }
  }

  const loadTestDataConfigs = async () => {
    if (!currentProjectId) return
    try {
      const data = await testDataConfigService.getTestDataConfigs({ project_id: currentProjectId })
      setTestDataConfigs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载测试数据配置列表失败:', error)
      setTestDataConfigs([])
    }
  }

  const loadTestCases = async () => {
    try {
      setLoading(true)
      const params: any = {
        test_type: 'ui' // 只加载UI类型的测试用例
      }
      if (selectedProject) params.project_id = selectedProject
      if (searchText) params.search = searchText
      const data = await testCaseService.getTestCases(params)
      setTestCases(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error('加载测试用例列表失败:', error)
      message.error('加载测试用例列表失败: ' + (error.response?.data?.detail || error.message))
      setTestCases([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingCase(null)
    setIsDataDriven(false)
    form.resetFields()
    form.setFieldsValue({
      test_type: 'ui',
      steps: [],
      is_data_driven: false,
      data_driver: JSON.stringify({ data: [] }, null, 2),
      config: {
        browser_config: {
          browser: 'chromium',
          headless: true,
          viewport: { width: 1280, height: 720 }
        }
      }
    })
    setModalVisible(true)
  }

  const handleEdit = (record: TestCase) => {
    setEditingCase(record)
    setCurrentProjectId(record.project_id)
    const isDataDrivenValue = record.is_data_driven === true || record.is_data_driven === 1 || record.is_data_driven === 'true'
    setIsDataDriven(isDataDrivenValue)
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      project_id: record.project_id,
      steps: record.steps || [],
      is_data_driven: isDataDrivenValue,
      data_driver: record.data_driver 
        ? (typeof record.data_driver === 'string' 
            ? record.data_driver 
            : JSON.stringify(record.data_driver, null, 2))
        : JSON.stringify({ data: [] }, null, 2),
      config: record.config || {
        browser_config: {
          browser: 'chromium',
          headless: true,
          viewport: { width: 1280, height: 720 }
        }
      },
      tags: record.tags || [],
      status: record.status,
    })
    if (record.project_id) {
      loadTestDataConfigs()
    }
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await testCaseService.deleteTestCase(id)
      message.success('删除成功')
      loadTestCases()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      // 解析steps（从UIStepEditor组件获取）
      let steps: any[] = []
      if (values.steps) {
        if (Array.isArray(values.steps)) {
          steps = values.steps
        } else if (typeof values.steps === 'string') {
          try {
            steps = JSON.parse(values.steps)
          } catch (e) {
            message.error('步骤JSON格式错误，请检查格式')
            return
          }
        }
      }
      
      // 解析数据驱动配置
      let data_driver = null
      const is_data_driven = values.is_data_driven === true || values.is_data_driven === 'true' || values.is_data_driven === 1
      
      if (is_data_driven) {
        if (values.data_driver) {
          if (typeof values.data_driver === 'string') {
            try {
              data_driver = JSON.parse(values.data_driver)
            } catch (e) {
              message.error('数据驱动配置JSON格式错误')
              return
            }
          } else {
            data_driver = values.data_driver
          }
        } else if (values.data_config_id) {
          // 如果选择了测试数据配置，使用配置ID
          data_driver = {
            type: 'config',
            config_id: values.data_config_id
          }
        }
      }
      
      const testCaseData: TestCaseCreate | TestCaseUpdate = {
        ...values,
        test_type: 'ui', // 确保是UI类型
        steps: steps,
        is_data_driven: is_data_driven,
        data_driver: data_driver,
        config: values.config || {
          browser_config: {
            browser: 'chromium',
            headless: true,
            viewport: { width: 1280, height: 720 }
          }
        }
      }
      
      if (editingCase) {
        await testCaseService.updateTestCase(editingCase.id, testCaseData as TestCaseUpdate)
        message.success('更新成功')
      } else {
        await testCaseService.createTestCase(testCaseData as TestCaseCreate)
        message.success('创建成功')
      }
      setModalVisible(false)
      form.resetFields()
      setIsDataDriven(false)
      loadTestCases()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error((editingCase ? '更新' : '创建') + '失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleExecute = (record: TestCase) => {
    setEditingCase(record)
    executeForm.resetFields()
    executeForm.setFieldsValue({
      test_case_ids: [record.id]
    })
    setExecuteModalVisible(true)
  }

  const handleExecuteSubmit = async () => {
    try {
      const values = await executeForm.validateFields()
      const testCaseIds = values.test_case_ids || []
      
      // 为每个用例创建执行任务
      const executionPromises = testCaseIds.map(async (testCaseId: number) => {
        const testCase = testCases.find(tc => tc.id === testCaseId)
        if (!testCase) return null
        
        const executionData = {
          test_case_id: testCaseId,
          project_id: testCase.project_id,
          config: {
            execution_params: values.execution_params || {},
            browser_config: values.browser_config || {
              browser: 'chromium',
              headless: true
            }
          }
        }
        return testExecutionService.createTestExecution(executionData)
      })
      
      await Promise.all(executionPromises.filter(p => p !== null))
      message.success(`已创建 ${testCaseIds.length} 个执行任务`)
      setExecuteModalVisible(false)
      executeForm.resetFields()
    } catch (error: any) {
      message.error('创建执行任务失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用例名称',
      dataIndex: 'name',
      key: 'name',
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
      title: '步骤数',
      dataIndex: 'steps',
      key: 'steps',
      render: (steps: any[]) => steps?.length || 0,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'green',
          inactive: 'default',
          archived: 'red',
        }
        return <Tag color={colorMap[status]}>{status}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: TestCase) => (
        <Space>
          <Button
            type="link"
            icon={<PlayCircleOutlined />}
            onClick={() => handleExecute(record)}
          >
            执行
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个测试用例吗？"
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

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Select
              placeholder="选择项目"
              allowClear
              style={{ width: 200 }}
              value={selectedProject}
              onChange={setSelectedProject}
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
            <Input
              placeholder="搜索测试用例"
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建UI测试用例
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={testCases}
          loading={loading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 创建/编辑用例Modal */}
      <Modal
        title={editingCase ? '编辑UI测试用例' : '新建UI测试用例'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        width={1000}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="用例名称"
            rules={[{ required: true, message: '请输入用例名称' }]}
          >
            <Input placeholder="请输入用例名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="用例描述"
          >
            <TextArea rows={3} placeholder="请输入用例描述" />
          </Form.Item>

          <Form.Item
            name="project_id"
            label="所属项目"
            rules={[{ required: true, message: '请选择项目' }]}
          >
            <Select placeholder="请选择项目" onChange={(value) => {
              setCurrentProjectId(value)
              setSelectedProject(value)
              loadPageObjects()
              loadTestDataConfigs()
            }}>
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="steps"
            label="测试步骤"
            rules={[{ required: true, message: '请添加测试步骤' }]}
            getValueFromEvent={(steps) => steps}
            getValueProps={(value) => ({ value: value || [] })}
          >
            <UIStepEditor
              projectId={form.getFieldValue('project_id')}
              onChange={(steps) => {
                form.setFieldValue('steps', steps)
              }}
            />
          </Form.Item>

          <Form.Item
            name="is_data_driven"
            label="启用数据驱动"
            valuePropName="checked"
          >
            <Switch 
              checked={isDataDriven}
              onChange={(checked) => {
                setIsDataDriven(checked)
                form.setFieldValue('is_data_driven', checked)
                if (!checked) {
                  form.setFieldValue('data_driver', JSON.stringify({ data: [] }, null, 2))
                  form.setFieldValue('data_config_id', undefined)
                }
              }}
            />
          </Form.Item>

          {isDataDriven && (
            <>
              <Form.Item
                name="data_config_id"
                label="测试数据配置（可选）"
                tooltip="选择已创建的测试数据配置，或手动输入数据"
              >
                <Select 
                  placeholder="选择测试数据配置"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {testDataConfigs.map(config => (
                    <Option key={config.id} value={config.id}>
                      {config.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="data_driver"
                label="数据驱动配置"
                tooltip='JSON格式，例如：{"data": [{"username": "user1", "password": "pass1"}, {"username": "user2", "password": "pass2"}]}'
                rules={[
                  {
                    validator: (_, value) => {
                      if (!isDataDriven) return Promise.resolve()
                      if (!value || value.trim() === '') {
                        return Promise.reject(new Error('启用数据驱动时，请填写数据驱动配置'))
                      }
                      try {
                        const parsed = typeof value === 'string' ? JSON.parse(value) : value
                        if (!parsed.data || !Array.isArray(parsed.data)) {
                          return Promise.reject(new Error('数据驱动配置必须包含data数组'))
                        }
                        return Promise.resolve()
                      } catch (e) {
                        return Promise.reject(new Error('数据驱动配置JSON格式错误'))
                      }
                    }
                  }
                ]}
              >
                <TextArea 
                  rows={8} 
                  placeholder='{"data": [{"username": "user1", "password": "pass1"}, {"username": "user2", "password": "pass2"}]}'
                />
              </Form.Item>
            </>
          )}

          <Form.Item
            name="status"
            label="状态"
            initialValue="active"
          >
            <Select>
              <Option value="active">激活</Option>
              <Option value="inactive">未激活</Option>
              <Option value="archived">已归档</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 执行Modal */}
      <Modal
        title="执行UI测试用例"
        open={executeModalVisible}
        onOk={handleExecuteSubmit}
        onCancel={() => {
          setExecuteModalVisible(false)
          executeForm.resetFields()
        }}
        width={600}
      >
        <Form form={executeForm} layout="vertical">
          <Form.Item
            name="test_case_ids"
            label="测试用例"
            rules={[{ required: true, message: '请选择测试用例' }]}
          >
            <Select mode="multiple" placeholder="请选择测试用例">
              {testCases.map(tc => (
                <Option key={tc.id} value={tc.id}>
                  {tc.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name={['browser_config', 'browser']}
            label="浏览器类型"
            initialValue="chromium"
          >
            <Select>
              <Option value="chromium">Chromium</Option>
              <Option value="firefox">Firefox</Option>
              <Option value="webkit">WebKit</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name={['browser_config', 'headless']}
            label="无头模式"
            initialValue={true}
            valuePropName="checked"
          >
            <Select>
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UITestCases

