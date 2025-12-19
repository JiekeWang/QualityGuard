import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Select,
  Card,
  Tag,
  Switch,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons'
import { directoryService, Directory, DirectoryCreate, DirectoryUpdate } from '../store/services/directory'
import { projectService, Project } from '../store/services/project'

const { TextArea } = Input
const { Option } = Select

const Directories: React.FC = () => {
  const [directories, setDirectories] = useState<Directory[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingDirectory, setEditingDirectory] = useState<Directory | null>(null)
  const [selectedProject, setSelectedProject] = useState<number | undefined>()
  const [form] = Form.useForm()

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadDirectories()
    } else {
      setDirectories([])
    }
  }, [selectedProject])

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects()
      setProjects(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error('加载项目列表失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const loadDirectories = async () => {
    if (!selectedProject) return
    
    try {
      setLoading(true)
      const data = await directoryService.getDirectories({ project_id: selectedProject })
      setDirectories(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error('加载目录列表失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingDirectory(null)
    form.resetFields()
    form.setFieldsValue({ project_id: selectedProject, is_active: true, order: 0 })
    setModalVisible(true)
  }

  const handleEdit = (directory: Directory) => {
    setEditingDirectory(directory)
    form.setFieldsValue({
      name: directory.name,
      description: directory.description,
      project_id: directory.project_id,
      parent_id: directory.parent_id,
      order: directory.order || 0,
      is_active: directory.is_active !== false,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await directoryService.deleteDirectory(id)
      message.success('删除成功')
      loadDirectories()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (editingDirectory) {
        await directoryService.updateDirectory(editingDirectory.id, values)
        message.success('更新成功')
      } else {
        await directoryService.createDirectory(values)
        message.success('创建成功')
      }
      
      setModalVisible(false)
      form.resetFields()
      loadDirectories()
    } catch (error: any) {
      if (error.errorFields) {
        return // 表单验证错误
      }
      message.error((editingDirectory ? '更新' : '创建') + '失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  // 获取所有目录（扁平化）用于父目录选择和表格显示
  const getAllDirectories = (directories: Directory[]): Directory[] => {
    const result: Directory[] = []
    const traverse = (dirs: Directory[]) => {
      dirs.forEach(d => {
        result.push(d)
        if (d.children && d.children.length > 0) {
          traverse(d.children)
        }
      })
    }
    traverse(directories)
    return result
  }

  const allDirectories = getAllDirectories(directories)

  const columns = [
    {
      title: '目录名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Directory) => (
        <Space>
          {record.is_active ? <FolderOpenOutlined /> : <FolderOutlined />}
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '排序',
      dataIndex: 'order',
      key: 'order',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? '激活' : '已归档'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Directory) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个目录吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
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
            <span>选择项目：</span>
            <Select
              placeholder="请选择项目"
              style={{ width: 200 }}
              value={selectedProject}
              onChange={(value) => {
                setSelectedProject(value)
              }}
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            disabled={!selectedProject}
          >
            新建目录
          </Button>
        </div>

        {selectedProject ? (
          <Table
            columns={columns}
            dataSource={allDirectories}
            rowKey="id"
            loading={loading}
            pagination={false}
            expandable={{
              defaultExpandAllRows: true,
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#999' }}>
            请先选择项目
          </div>
        )}
      </Card>

      <Modal
        title={editingDirectory ? '编辑目录' : '新建目录'}
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
            label="目录名称"
            rules={[{ required: true, message: '请输入目录名称' }]}
          >
            <Input placeholder="请输入目录名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入目录描述" />
          </Form.Item>
          <Form.Item
            name="project_id"
            label="项目"
            rules={[{ required: true, message: '请选择项目' }]}
          >
            <Select placeholder="请选择项目" disabled={!!editingDirectory}>
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="parent_id" label="父目录">
            <Select
              placeholder="请选择父目录（可选）"
              allowClear
              disabled={!!editingDirectory && editingDirectory.id !== undefined}
            >
              {allDirectories
                .filter(d => !editingDirectory || d.id !== editingDirectory.id)
                .map(directory => (
                  <Option key={directory.id} value={directory.id}>
                    {directory.name}
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="order" label="排序" initialValue={0}>
            <Input type="number" placeholder="排序值，数字越小越靠前" />
          </Form.Item>
          <Form.Item name="is_active" label="状态" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="激活" unCheckedChildren="已归档" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Directories

