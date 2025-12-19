import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { projectService, Project, ProjectCreate, ProjectUpdate } from '../store/services/project'

const { TextArea } = Input

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await projectService.getProjects()
      console.log('项目列表数据:', data) // 调试日志
      if (Array.isArray(data)) {
        setProjects(data)
      } else {
        console.warn('项目列表数据格式错误，期望数组，实际:', typeof data, data)
        setProjects([])
      }
    } catch (error: any) {
      console.error('加载项目列表失败:', error)
      console.error('错误详情:', error.response?.data)
      message.error('加载项目列表失败: ' + (error.response?.data?.detail || error.message))
      setProjects([]) // 确保即使出错也有空数组
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingProject(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Project) => {
    setEditingProject(record)
    form.setFieldsValue({
      name: record.name,
      description: record.description,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await projectService.deleteProject(id)
      message.success('删除成功')
      loadProjects()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingProject) {
        const updateData: ProjectUpdate = { ...values }
        await projectService.updateProject(editingProject.id, updateData)
        message.success('更新成功')
      } else {
        const createData: ProjectCreate = { ...values }
        await projectService.createProject(createData)
        message.success('创建成功')
      }
      setModalVisible(false)
      form.resetFields()
      // 确保刷新列表
      await loadProjects()
    } catch (error: any) {
      if (error.errorFields) {
        return // 表单验证错误
      }
      console.error('项目操作失败:', error)
      message.error((editingProject ? '更新' : '创建') + '失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const columns = [
    {
      title: '项目名称',
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
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => time ? new Date(time).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Project) => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个项目吗？"
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
    <div style={{ padding: '16px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>项目管理</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          新建项目
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={projects || []}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
      <Modal
        title={editingProject ? '编辑项目' : '新建项目'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={4} placeholder="请输入项目描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Projects
