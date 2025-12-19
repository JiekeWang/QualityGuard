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
  Tree,
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
import { moduleService, Module, ModuleCreate, ModuleUpdate } from '../store/services/module'
import { projectService, Project } from '../store/services/project'

const { TextArea } = Input
const { Option } = Select

const Modules: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [selectedProject, setSelectedProject] = useState<number | undefined>()
  const [form] = Form.useForm()

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadModules()
    } else {
      setModules([])
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

  const loadModules = async () => {
    if (!selectedProject) return
    
    try {
      setLoading(true)
      const data = await moduleService.getModules({ project_id: selectedProject })
      setModules(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error('加载模块列表失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingModule(null)
    form.resetFields()
    form.setFieldsValue({ project_id: selectedProject, is_active: true, order: 0 })
    setModalVisible(true)
  }

  const handleEdit = (module: Module) => {
    setEditingModule(module)
    form.setFieldsValue({
      name: module.name,
      description: module.description,
      project_id: module.project_id,
      parent_id: module.parent_id,
      order: module.order || 0,
      is_active: module.is_active !== false,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await moduleService.deleteModule(id)
      message.success('删除成功')
      loadModules()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (editingModule) {
        await moduleService.updateModule(editingModule.id, values)
        message.success('更新成功')
      } else {
        await moduleService.createModule(values)
        message.success('创建成功')
      }
      
      setModalVisible(false)
      form.resetFields()
      loadModules()
    } catch (error: any) {
      if (error.errorFields) {
        return // 表单验证错误
      }
      message.error((editingModule ? '更新' : '创建') + '失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  // 构建树形数据
  const buildTreeData = (modules: Module[]): any[] => {
    const moduleMap = new Map<number, any>()
    const rootModules: any[] = []

    // 第一遍：创建所有节点
    modules.forEach(module => {
      const node = {
        key: module.id,
        title: (
          <Space>
            {module.is_active ? <FolderOpenOutlined /> : <FolderOutlined />}
            <span>{module.name}</span>
            {!module.is_active && <Tag color="default">已归档</Tag>}
          </Space>
        ),
        children: [],
        module: module,
      }
      moduleMap.set(module.id, node)
    })

    // 第二遍：构建树形结构
    modules.forEach(module => {
      const node = moduleMap.get(module.id)!
      if (module.parent_id && moduleMap.has(module.parent_id)) {
        const parent = moduleMap.get(module.parent_id)!
        parent.children.push(node)
      } else {
        rootModules.push(node)
      }
    })

    return rootModules
  }

  const treeData = buildTreeData(modules)

  // 获取所有模块（扁平化）用于父模块选择
  const getAllModules = (modules: Module[]): Module[] => {
    const result: Module[] = []
    const traverse = (ms: Module[]) => {
      ms.forEach(m => {
        result.push(m)
        if (m.children && m.children.length > 0) {
          traverse(m.children)
        }
      })
    }
    traverse(modules)
    return result
  }

  const allModules = getAllModules(modules)

  const columns = [
    {
      title: '模块名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Module) => (
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
      render: (_: any, record: Module) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个模块吗？"
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
            新建模块
          </Button>
        </div>

        {selectedProject ? (
          <Table
            columns={columns}
            dataSource={allModules}
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
        title={editingModule ? '编辑模块' : '新建模块'}
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
            label="模块名称"
            rules={[{ required: true, message: '请输入模块名称' }]}
          >
            <Input placeholder="请输入模块名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="请输入模块描述" />
          </Form.Item>
          <Form.Item
            name="project_id"
            label="项目"
            rules={[{ required: true, message: '请选择项目' }]}
          >
            <Select placeholder="请选择项目" disabled={!!editingModule}>
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="parent_id" label="父模块">
            <Select
              placeholder="请选择父模块（可选）"
              allowClear
              disabled={!!editingModule && editingModule.id !== undefined}
            >
              {allModules
                .filter(m => !editingModule || m.id !== editingModule.id)
                .map(module => (
                  <Option key={module.id} value={module.id}>
                    {module.name}
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

export default Modules

