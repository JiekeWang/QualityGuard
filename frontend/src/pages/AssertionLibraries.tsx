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
  Descriptions,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import { assertionLibraryService, AssertionLibrary, AssertionLibraryCreate, AssertionLibraryUpdate } from '../store/services/assertionLibrary'
import { projectService, Project } from '../store/services/project'

const { TextArea } = Input
const { Option } = Select

const AssertionLibraries: React.FC = () => {
  const [libraries, setLibraries] = useState<AssertionLibrary[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [editingLibrary, setEditingLibrary] = useState<AssertionLibrary | null>(null)
  const [selectedLibrary, setSelectedLibrary] = useState<AssertionLibrary | null>(null)
  const [selectedProject, setSelectedProject] = useState<number | undefined>()
  const [selectedType, setSelectedType] = useState<string | undefined>()
  const [searchText, setSearchText] = useState('')
  const [form] = Form.useForm()

  const assertionTypes = [
    { value: 'status_code', label: '状态码断言' },
    { value: 'response_body', label: '响应体断言' },
    { value: 'response_headers', label: 'Headers断言' },
    { value: 'response_time', label: '响应时间断言' },
    { value: 'database', label: '数据库断言' },
    { value: 'script', label: '脚本断言' },
    { value: 'combined', label: '组合断言' },
  ]

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    loadLibraries()
  }, [selectedProject, selectedType, searchText])

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects()
      setProjects(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error('加载项目列表失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const loadLibraries = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedProject) {
        params.project_id = selectedProject
      }
      if (selectedType) {
        params.type = selectedType
      }
      if (searchText) {
        params.search = searchText
      }
      const data = await assertionLibraryService.getLibraries(params)
      setLibraries(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error('加载断言库列表失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingLibrary(null)
    form.resetFields()
    form.setFieldsValue({ is_public: false })
    setModalVisible(true)
  }

  const handleEdit = (library: AssertionLibrary) => {
    setEditingLibrary(library)
    form.setFieldsValue({
      name: library.name,
      description: library.description,
      type: library.type,
      project_id: library.project_id,
      config: library.config ? JSON.stringify(library.config, null, 2) : '',
      example: library.example,
      is_public: library.is_public || false,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await assertionLibraryService.deleteLibrary(id)
      message.success('删除成功')
      loadLibraries()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      // 解析config JSON
      let config = null
      if (values.config) {
        try {
          config = JSON.parse(values.config)
        } catch (e) {
          message.error('配置格式不正确，请输入有效的JSON')
          return
        }
      }
      
      const submitData: AssertionLibraryCreate | AssertionLibraryUpdate = {
        ...values,
        config,
      }
      
      if (editingLibrary) {
        await assertionLibraryService.updateLibrary(editingLibrary.id, submitData)
        message.success('更新成功')
      } else {
        await assertionLibraryService.createLibrary(submitData as AssertionLibraryCreate)
        message.success('创建成功')
      }
      
      setModalVisible(false)
      form.resetFields()
      loadLibraries()
    } catch (error: any) {
      if (error.errorFields) {
        return // 表单验证错误
      }
      message.error((editingLibrary ? '更新' : '创建') + '失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleViewDetail = (library: AssertionLibrary) => {
    setSelectedLibrary(library)
    setDetailModalVisible(true)
  }

  const handleUseLibrary = async (library: AssertionLibrary) => {
    try {
      await assertionLibraryService.useLibrary(library.id)
      // 复制配置到剪贴板
      const configStr = JSON.stringify(library.config || {}, null, 2)
      await navigator.clipboard.writeText(configStr)
      message.success('已复制断言配置到剪贴板')
      loadLibraries()
    } catch (error: any) {
      message.error('使用失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const columns = [
    {
      title: '断言名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: AssertionLibrary) => (
        <Button type="link" onClick={() => handleViewDetail(record)}>
          {text}
        </Button>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeObj = assertionTypes.find(t => t.value === type)
        return <Tag color="blue">{typeObj?.label || type}</Tag>
      },
    },
    {
      title: '项目',
      dataIndex: 'project_id',
      key: 'project_id',
      render: (projectId: number | null) => {
        if (!projectId) {
          return <Tag color="green">全局</Tag>
        }
        const project = projects.find(p => p.id === projectId)
        return project ? project.name : '-'
      },
    },
    {
      title: '是否公开',
      dataIndex: 'is_public',
      key: 'is_public',
      render: (isPublic: boolean) => (
        <Tag color={isPublic ? 'green' : 'default'}>
          {isPublic ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '使用次数',
      dataIndex: 'usage_count',
      key: 'usage_count',
      sorter: (a: AssertionLibrary, b: AssertionLibrary) => (a.usage_count || 0) - (b.usage_count || 0),
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_: any, record: AssertionLibrary) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleUseLibrary(record)}
          >
            使用
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个断言库吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
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
            <span>类型：</span>
            <Select
              placeholder="全部类型"
              style={{ width: 150 }}
              allowClear
              value={selectedType}
              onChange={(value) => setSelectedType(value)}
            >
              {assertionTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
            <Input
              placeholder="搜索断言名称或描述"
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
            onClick={handleCreate}
          >
            新建断言库
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={libraries}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* 创建/编辑Modal */}
      <Modal
        title={editingLibrary ? '编辑断言库' : '新建断言库'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="断言名称"
            rules={[{ required: true, message: '请输入断言名称' }]}
          >
            <Input placeholder="请输入断言名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入断言描述" />
          </Form.Item>
          <Form.Item
            name="type"
            label="断言类型"
            rules={[{ required: true, message: '请选择断言类型' }]}
          >
            <Select placeholder="请选择断言类型">
              {assertionTypes.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="project_id" label="所属项目">
            <Select
              placeholder="选择项目（留空表示全局）"
              allowClear
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="config"
            label="断言配置（JSON格式）"
            tooltip='根据断言类型不同，配置格式不同。例如：状态码断言为 {"expected": 200}，响应体断言为 {"path": "$.code", "expected": 0}'
          >
            <TextArea
              rows={8}
              placeholder='{"expected": 200}'
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          <Form.Item name="example" label="使用示例">
            <TextArea rows={3} placeholder="请输入使用示例" />
          </Form.Item>
          <Form.Item name="is_public" label="是否公开">
            <Select>
              <Option value={true}>是（全局可用）</Option>
              <Option value={false}>否（仅项目内可用）</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情Modal */}
      <Modal
        title="断言库详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedLibrary(null)
        }}
        footer={[
          <Button key="use" type="primary" icon={<CopyOutlined />} onClick={() => selectedLibrary && handleUseLibrary(selectedLibrary)}>
            使用此断言
          </Button>,
          <Button key="close" onClick={() => {
            setDetailModalVisible(false)
            setSelectedLibrary(null)
          }}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedLibrary && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="断言名称">{selectedLibrary.name}</Descriptions.Item>
            <Descriptions.Item label="描述">{selectedLibrary.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="类型">
              {assertionTypes.find(t => t.value === selectedLibrary.type)?.label || selectedLibrary.type}
            </Descriptions.Item>
            <Descriptions.Item label="所属项目">
              {selectedLibrary.project_id ? (
                projects.find(p => p.id === selectedLibrary.project_id)?.name || '-'
              ) : (
                <Tag color="green">全局</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="是否公开">
              <Tag color={selectedLibrary.is_public ? 'green' : 'default'}>
                {selectedLibrary.is_public ? '是' : '否'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="使用次数">{selectedLibrary.usage_count || 0}</Descriptions.Item>
            <Descriptions.Item label="断言配置">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(selectedLibrary.config || {}, null, 2)}
              </pre>
            </Descriptions.Item>
            {selectedLibrary.example && (
              <Descriptions.Item label="使用示例">
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{selectedLibrary.example}</pre>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default AssertionLibraries

