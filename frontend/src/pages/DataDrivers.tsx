import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Card,
  Tabs,
  Switch,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  dataDriverService,
  DataSource,
  DataSourceCreate,
  DataSourceUpdate,
  DataTemplate,
  DataTemplateCreate,
  DataTemplateUpdate,
  DataGenerator,
  DataGeneratorCreate,
  DataGeneratorUpdate,
} from '../store/services/dataDriver'
import { 
  testDataConfigService,
  TestDataConfig,
  TestDataConfigCreate,
  TestDataConfigUpdate,
  TestDataConfigListItem,
  TestDataItem
} from '../store/services/testDataConfig'
import { projectService, Project } from '../store/services/project'
import TestDataTable from '../components/TestDataTable'

const { TextArea } = Input
const { Option } = Select

const DataDrivers: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sources')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<number | undefined>()
  const [searchText, setSearchText] = useState('')

  // 数据源相关状态
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [sourceLoading, setSourceLoading] = useState(false)
  const [sourceModalVisible, setSourceModalVisible] = useState(false)
  const [editingSource, setEditingSource] = useState<DataSource | null>(null)
  const [sourceForm] = Form.useForm()

  // 数据模板相关状态
  const [dataTemplates, setDataTemplates] = useState<DataTemplate[]>([])
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateModalVisible, setTemplateModalVisible] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<DataTemplate | null>(null)
  const [templateForm] = Form.useForm()

  // 数据生成器相关状态
  const [dataGenerators, setDataGenerators] = useState<DataGenerator[]>([])
  const [generatorLoading, setGeneratorLoading] = useState(false)
  const [generatorModalVisible, setGeneratorModalVisible] = useState(false)
  const [editingGenerator, setEditingGenerator] = useState<DataGenerator | null>(null)
  const [generatorForm] = Form.useForm()

  // 测试数据配置相关状态
  const [testDataConfigs, setTestDataConfigs] = useState<TestDataConfigListItem[]>([])
  const [testDataLoading, setTestDataLoading] = useState(false)
  const [testDataModalVisible, setTestDataModalVisible] = useState(false)
  const [editingTestDataConfig, setEditingTestDataConfig] = useState<TestDataConfig | null>(null)
  const [testDataForm] = Form.useForm()
  const [testDataTableData, setTestDataTableData] = useState<TestDataItem[]>([])

  const sourceTypes = [
    { value: 'csv', label: 'CSV' },
    { value: 'excel', label: 'Excel' },
    { value: 'json', label: 'JSON' },
    { value: 'database', label: '数据库' },
    { value: 'api', label: 'API' },
    { value: 'custom', label: '自定义' },
  ]

  const generatorTypes = [
    { value: 'random', label: '随机数据生成' },
    { value: 'sequence', label: '序列数据生成' },
    { value: 'faker', label: 'Faker数据生成' },
    { value: 'custom', label: '自定义生成器' },
  ]

  const loopStrategies = [
    { value: 'all', label: '全部循环' },
    { value: 'random', label: '随机选择' },
    { value: 'once', label: '单次执行' },
  ]

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (activeTab === 'sources') {
      loadDataSources()
    } else if (activeTab === 'templates') {
      loadDataTemplates()
    } else if (activeTab === 'generators') {
      loadDataGenerators()
    } else if (activeTab === 'test-data') {
      loadTestDataConfigs()
    }
  }, [activeTab, selectedProject, searchText])

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects()
      setProjects(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error('加载项目列表失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const loadDataSources = async () => {
    try {
      setSourceLoading(true)
      const params: any = {}
      if (selectedProject) params.project_id = selectedProject
      if (searchText) params.search = searchText
      const data = await dataDriverService.getDataSources(params)
      setDataSources(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error('加载数据源列表失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setSourceLoading(false)
    }
  }

  const loadDataTemplates = async () => {
    try {
      setTemplateLoading(true)
      const params: any = {}
      if (selectedProject) params.project_id = selectedProject
      if (searchText) params.search = searchText
      const data = await dataDriverService.getDataTemplates(params)
      setDataTemplates(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error('加载数据模板列表失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setTemplateLoading(false)
    }
  }

  const loadDataGenerators = async () => {
    try {
      setGeneratorLoading(true)
      const params: any = {}
      if (selectedProject) params.project_id = selectedProject
      if (searchText) params.search = searchText
      const data = await dataDriverService.getDataGenerators(params)
      setDataGenerators(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error('加载数据生成器列表失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setGeneratorLoading(false)
    }
  }

  const loadTestDataConfigs = async () => {
    try {
      setTestDataLoading(true)
      const params: any = {}
      if (selectedProject) params.project_id = selectedProject
      if (searchText) params.search = searchText
      const data = await testDataConfigService.getTestDataConfigs(params)
      setTestDataConfigs(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error('加载测试数据配置列表失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setTestDataLoading(false)
    }
  }

  // 数据源相关处理函数
  const handleCreateSource = () => {
    setEditingSource(null)
    sourceForm.resetFields()
    sourceForm.setFieldsValue({ is_active: true })
    setSourceModalVisible(true)
  }

  const handleEditSource = (source: DataSource) => {
    setEditingSource(source)
    sourceForm.setFieldsValue({
      name: source.name,
      description: source.description,
      type: source.type,
      project_id: source.project_id,
      config: source.config ? JSON.stringify(source.config, null, 2) : '',
      is_active: source.is_active !== false,
    })
    setSourceModalVisible(true)
  }

  const handleDeleteSource = async (id: number) => {
    try {
      await dataDriverService.deleteDataSource(id)
      message.success('删除成功')
      loadDataSources()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSubmitSource = async () => {
    try {
      const values = await sourceForm.validateFields()
      let config = null
      if (values.config) {
        try {
          config = JSON.parse(values.config)
        } catch (e) {
          message.error('配置格式不正确，请输入有效的JSON')
          return
        }
      }
      const submitData: DataSourceCreate | DataSourceUpdate = {
        ...values,
        config,
      }
      if (editingSource) {
        await dataDriverService.updateDataSource(editingSource.id, submitData)
        message.success('更新成功')
      } else {
        await dataDriverService.createDataSource(submitData as DataSourceCreate)
        message.success('创建成功')
      }
      setSourceModalVisible(false)
      sourceForm.resetFields()
      loadDataSources()
    } catch (error: any) {
      if (error.errorFields) return
      message.error((editingSource ? '更新' : '创建') + '失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  // 数据模板相关处理函数
  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    templateForm.resetFields()
    templateForm.setFieldsValue({ loop_strategy: 'all' })
    setTemplateModalVisible(true)
  }

  const handleEditTemplate = (template: DataTemplate) => {
    setEditingTemplate(template)
    templateForm.setFieldsValue({
      name: template.name,
      description: template.description,
      data_source_id: template.data_source_id,
      project_id: template.project_id,
      mapping: template.mapping ? JSON.stringify(template.mapping, null, 2) : '',
      filters: template.filters ? JSON.stringify(template.filters, null, 2) : '',
      loop_strategy: template.loop_strategy || 'all',
    })
    setTemplateModalVisible(true)
  }

  const handleDeleteTemplate = async (id: number) => {
    try {
      await dataDriverService.deleteDataTemplate(id)
      message.success('删除成功')
      loadDataTemplates()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSubmitTemplate = async () => {
    try {
      const values = await templateForm.validateFields()
      let mapping = null
      let filters = null
      if (values.mapping) {
        try {
          mapping = JSON.parse(values.mapping)
        } catch (e) {
          message.error('映射配置格式不正确，请输入有效的JSON')
          return
        }
      }
      if (values.filters) {
        try {
          filters = JSON.parse(values.filters)
        } catch (e) {
          message.error('过滤配置格式不正确，请输入有效的JSON')
          return
        }
      }
      const submitData: DataTemplateCreate | DataTemplateUpdate = {
        ...values,
        mapping,
        filters,
      }
      if (editingTemplate) {
        await dataDriverService.updateDataTemplate(editingTemplate.id, submitData)
        message.success('更新成功')
      } else {
        await dataDriverService.createDataTemplate(submitData as DataTemplateCreate)
        message.success('创建成功')
      }
      setTemplateModalVisible(false)
      templateForm.resetFields()
      loadDataTemplates()
    } catch (error: any) {
      if (error.errorFields) return
      message.error((editingTemplate ? '更新' : '创建') + '失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  // 数据生成器相关处理函数
  const handleCreateGenerator = () => {
    setEditingGenerator(null)
    generatorForm.resetFields()
    generatorForm.setFieldsValue({ is_active: true })
    setGeneratorModalVisible(true)
  }

  const handleEditGenerator = (generator: DataGenerator) => {
    setEditingGenerator(generator)
    generatorForm.setFieldsValue({
      name: generator.name,
      description: generator.description,
      type: generator.type,
      project_id: generator.project_id,
      config: generator.config ? JSON.stringify(generator.config, null, 2) : '',
      is_active: generator.is_active !== false,
    })
    setGeneratorModalVisible(true)
  }

  const handleDeleteGenerator = async (id: number) => {
    try {
      await dataDriverService.deleteDataGenerator(id)
      message.success('删除成功')
      loadDataGenerators()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSubmitGenerator = async () => {
    try {
      const values = await generatorForm.validateFields()
      let config = null
      if (values.config) {
        try {
          config = JSON.parse(values.config)
        } catch (e) {
          message.error('配置格式不正确，请输入有效的JSON')
          return
        }
      }
      const submitData: DataGeneratorCreate | DataGeneratorUpdate = {
        ...values,
        config,
      }
      if (editingGenerator) {
        await dataDriverService.updateDataGenerator(editingGenerator.id, submitData)
        message.success('更新成功')
      } else {
        await dataDriverService.createDataGenerator(submitData as DataGeneratorCreate)
        message.success('创建成功')
      }
      setGeneratorModalVisible(false)
      generatorForm.resetFields()
      loadDataGenerators()
    } catch (error: any) {
      if (error.errorFields) return
      message.error((editingGenerator ? '更新' : '创建') + '失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  // 测试数据配置相关处理函数
  const handleCreateTestDataConfig = () => {
    setEditingTestDataConfig(null)
    testDataForm.resetFields()
    testDataForm.setFieldsValue({ is_active: true })
    setTestDataTableData([])
    setTestDataModalVisible(true)
  }

  const handleEditTestDataConfig = async (config: TestDataConfigListItem) => {
    try {
      const fullConfig = await testDataConfigService.getTestDataConfig(config.id)
      setEditingTestDataConfig(fullConfig)
      testDataForm.setFieldsValue({
        name: fullConfig.name,
        description: fullConfig.description,
        project_id: fullConfig.project_id,
        is_active: fullConfig.is_active !== false,
      })
      setTestDataTableData(fullConfig.data || [])
      setTestDataModalVisible(true)
    } catch (error: any) {
      message.error('加载配置详情失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDeleteTestDataConfig = async (id: number) => {
    try {
      await testDataConfigService.deleteTestDataConfig(id)
      message.success('删除成功')
      loadTestDataConfigs()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSubmitTestDataConfig = async () => {
    try {
      const values = await testDataForm.validateFields()
      const submitData: TestDataConfigCreate | TestDataConfigUpdate = {
        ...values,
        data: testDataTableData,
      }
      if (editingTestDataConfig) {
        await testDataConfigService.updateTestDataConfig(editingTestDataConfig.id, submitData)
        message.success('更新成功')
      } else {
        await testDataConfigService.createTestDataConfig(submitData as TestDataConfigCreate)
        message.success('创建成功')
      }
      setTestDataModalVisible(false)
      testDataForm.resetFields()
      setTestDataTableData([])
      loadTestDataConfigs()
    } catch (error: any) {
      if (error.errorFields) return
      message.error((editingTestDataConfig ? '更新' : '创建') + '失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const sourceColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeObj = sourceTypes.find(t => t.value === type)
        return <Tag color="blue">{typeObj?.label || type}</Tag>
      },
    },
    {
      title: '项目',
      dataIndex: 'project_id',
      key: 'project_id',
      render: (projectId: number | null) => {
        if (!projectId) return <Tag color="green">全局</Tag>
        const project = projects.find(p => p.id === projectId)
        return project ? project.name : '-'
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? '激活' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DataSource) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditSource(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除吗？" onConfirm={() => handleDeleteSource(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const templateColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '数据源',
      dataIndex: 'data_source_id',
      key: 'data_source_id',
      render: (dataSourceId: number) => {
        const source = dataSources.find(s => s.id === dataSourceId)
        return source ? source.name : '-'
      },
    },
    {
      title: '循环策略',
      dataIndex: 'loop_strategy',
      key: 'loop_strategy',
      render: (strategy: string) => {
        const strategyObj = loopStrategies.find(s => s.value === strategy)
        return <Tag color="purple">{strategyObj?.label || strategy}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DataTemplate) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditTemplate(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除吗？" onConfirm={() => handleDeleteTemplate(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const generatorColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeObj = generatorTypes.find(t => t.value === type)
        return <Tag color="orange">{typeObj?.label || type}</Tag>
      },
    },
    {
      title: '项目',
      dataIndex: 'project_id',
      key: 'project_id',
      render: (projectId: number | null) => {
        if (!projectId) return <Tag color="green">全局</Tag>
        const project = projects.find(p => p.id === projectId)
        return project ? project.name : '-'
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? '激活' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: DataGenerator) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditGenerator(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除吗？" onConfirm={() => handleDeleteGenerator(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const testDataConfigColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '项目',
      dataIndex: 'project_id',
      key: 'project_id',
      render: (projectId: number | null) => {
        if (!projectId) return <Tag color="green">全局</Tag>
        const project = projects.find(p => p.id === projectId)
        return project ? project.name : '-'
      },
    },
    {
      title: '数据行数',
      dataIndex: 'data_count',
      key: 'data_count',
      width: 100,
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: '关联用例数',
      dataIndex: 'associated_case_count',
      key: 'associated_case_count',
      width: 120,
      render: (count: number) => <Tag color="purple">{count}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>{isActive ? '激活' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: TestDataConfigListItem) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditTestDataConfig(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除吗？" onConfirm={() => handleDeleteTestDataConfig(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <span>项目：</span>
            <Select
              placeholder="全部项目"
              style={{ width: 200 }}
              allowClear
              value={selectedProject}
              onChange={(value) => setSelectedProject(value)}
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
            <Input
              placeholder="搜索"
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              if (activeTab === 'sources') handleCreateSource()
              else if (activeTab === 'templates') handleCreateTemplate()
              else if (activeTab === 'generators') handleCreateGenerator()
              else if (activeTab === 'test-data') handleCreateTestDataConfig()
            }}
          >
            新建
          </Button>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'sources',
              label: '数据源管理',
              children: (
                <Table
                  columns={sourceColumns}
                  dataSource={dataSources}
                  rowKey="id"
                  loading={sourceLoading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
            {
              key: 'templates',
              label: '数据模板',
              children: (
                <Table
                  columns={templateColumns}
                  dataSource={dataTemplates}
                  rowKey="id"
                  loading={templateLoading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
            {
              key: 'generators',
              label: '数据生成器',
              children: (
                <Table
                  columns={generatorColumns}
                  dataSource={dataGenerators}
                  rowKey="id"
                  loading={generatorLoading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
            {
              key: 'test-data',
              label: '测试数据配置',
              children: (
                <Table
                  columns={testDataConfigColumns}
                  dataSource={testDataConfigs}
                  rowKey="id"
                  loading={testDataLoading}
                  pagination={{ pageSize: 20 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 数据源Modal */}
      <Modal
        title={editingSource ? '编辑数据源' : '新建数据源'}
        open={sourceModalVisible}
        onOk={handleSubmitSource}
        onCancel={() => {
          setSourceModalVisible(false)
          sourceForm.resetFields()
        }}
        width={700}
      >
        <Form form={sourceForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入数据源名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select placeholder="请选择数据源类型">
              {sourceTypes.map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="project_id" label="所属项目">
            <Select placeholder="选择项目（留空表示全局）" allowClear>
              {projects.map(project => (
                <Option key={project.id} value={project.id}>{project.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="config"
            label="配置（JSON格式）"
            tooltip='根据数据源类型不同，配置格式不同。例如：CSV为 {"path": "data.csv", "encoding": "utf-8"}'
          >
            <TextArea rows={6} placeholder='{"path": "data.csv"}' style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="is_active" label="状态" valuePropName="checked">
            <Switch checkedChildren="激活" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 数据模板Modal */}
      <Modal
        title={editingTemplate ? '编辑数据模板' : '新建数据模板'}
        open={templateModalVisible}
        onOk={handleSubmitTemplate}
        onCancel={() => {
          setTemplateModalVisible(false)
          templateForm.resetFields()
        }}
        width={700}
      >
        <Form form={templateForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入模板名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item name="data_source_id" label="数据源" rules={[{ required: true, message: '请选择数据源' }]}>
            <Select placeholder="请选择数据源">
              {dataSources.map(source => (
                <Option key={source.id} value={source.id}>{source.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="project_id" label="所属项目">
            <Select placeholder="选择项目（留空表示全局）" allowClear>
              {projects.map(project => (
                <Option key={project.id} value={project.id}>{project.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="mapping"
            label="数据映射（JSON格式）"
            tooltip='定义数据源字段到用例参数的映射，例如：{"username": "$.csv.username", "password": "$.csv.password"}'
          >
            <TextArea rows={6} placeholder='{"username": "$.csv.username"}' style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item
            name="filters"
            label="数据过滤（JSON格式）"
            tooltip='定义数据过滤条件，例如：{"status": "active"}'
          >
            <TextArea rows={4} placeholder='{"status": "active"}' style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="loop_strategy" label="循环策略">
            <Select>
              {loopStrategies.map(strategy => (
                <Option key={strategy.value} value={strategy.value}>{strategy.label}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 数据生成器Modal */}
      <Modal
        title={editingGenerator ? '编辑数据生成器' : '新建数据生成器'}
        open={generatorModalVisible}
        onOk={handleSubmitGenerator}
        onCancel={() => {
          setGeneratorModalVisible(false)
          generatorForm.resetFields()
        }}
        width={700}
      >
        <Form form={generatorForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入生成器名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select placeholder="请选择生成器类型">
              {generatorTypes.map(type => (
                <Option key={type.value} value={type.value}>{type.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="project_id" label="所属项目">
            <Select placeholder="选择项目（留空表示全局）" allowClear>
              {projects.map(project => (
                <Option key={project.id} value={project.id}>{project.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="config"
            label="配置（JSON格式）"
            tooltip='根据生成器类型不同，配置格式不同。例如：随机生成为 {"min": 1, "max": 100}'
          >
            <TextArea rows={6} placeholder='{"min": 1, "max": 100}' style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="is_active" label="状态" valuePropName="checked">
            <Switch checkedChildren="激活" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 测试数据配置Modal */}
      <Modal
        title={editingTestDataConfig ? '编辑测试数据配置' : '新建测试数据配置'}
        open={testDataModalVisible}
        onOk={handleSubmitTestDataConfig}
        onCancel={() => {
          setTestDataModalVisible(false)
          testDataForm.resetFields()
          setTestDataTableData([])
        }}
        width={1200}
        okText="保存"
        cancelText="取消"
      >
        <Form form={testDataForm} layout="vertical">
          <Form.Item name="name" label="配置名称" rules={[{ required: true, message: '请输入配置名称' }]}>
            <Input placeholder="请输入配置名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item name="project_id" label="所属项目">
            <Select placeholder="选择项目（留空表示全局）" allowClear>
              {projects.map(project => (
                <Option key={project.id} value={project.id}>{project.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="is_active" label="状态" valuePropName="checked">
            <Switch checkedChildren="激活" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item label="测试数据列表" required>
            <TestDataTable
              value={testDataTableData}
              onChange={(data) => setTestDataTableData(data)}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DataDrivers

