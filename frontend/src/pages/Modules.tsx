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
  EyeOutlined,
} from '@ant-design/icons'
import { moduleService, Module, ModuleCreate, ModuleUpdate } from '../store/services/module'
import { projectService, Project } from '../store/services/project'
import { testCaseService } from '../store/services/testCase'

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
  const [moduleTestCases, setModuleTestCases] = useState<Map<number, number>>(new Map()) // 模块ID -> 测试用例数量
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewModule, setPreviewModule] = useState<Module | null>(null)
  const [previewTestCases, setPreviewTestCases] = useState<any[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

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
      
      // 加载每个模块的测试用例数量
      await loadModuleTestCases(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error('加载模块列表失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  // 加载模块关联的测试用例数量
  const loadModuleTestCases = async (modules: Module[]) => {
    if (!selectedProject || !modules.length) return
    
    try {
      const testCasesMap = new Map<number, number>()
      
      // 获取所有模块（包括子模块）及其名称映射
      const getAllModulesWithNames = (ms: Module[]): Array<{ id: number; name: string }> => {
        const result: Array<{ id: number; name: string }> = []
        const traverse = (m: Module) => {
          result.push({ id: m.id, name: m.name })
          if (m.children && m.children.length > 0) {
            m.children.forEach(traverse)
          }
        }
        ms.forEach(traverse)
        return result
      }
      
      const allModules = getAllModulesWithNames(modules)
      
      // 为每个模块查询测试用例数量
      await Promise.all(
        allModules.map(async ({ id, name }) => {
          try {
            const testCases = await testCaseService.getTestCases({
              project_id: selectedProject,
              module: name,
              limit: 1000
            })
            if (Array.isArray(testCases)) {
              testCasesMap.set(id, testCases.length)
            }
          } catch (error) {
            console.error(`加载模块 ${name} 的测试用例失败:`, error)
          }
        })
      )
      
      setModuleTestCases(testCasesMap)
    } catch (error) {
      console.error('加载模块测试用例数量失败:', error)
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

  const handlePreviewTestCases = async (module: Module) => {
    if (!selectedProject) {
      message.warning('请先选择项目')
      return
    }
    setPreviewModule(module)
    setPreviewVisible(true)
    setPreviewLoading(true)
    try {
      // 获取该模块及其所有子模块的名称
      const getAllModuleNames = (m: Module): string[] => {
        const names = [m.name]
        if (m.children && m.children.length > 0) {
          m.children.forEach(child => {
            names.push(...getAllModuleNames(child))
          })
        }
        return names
      }
      const moduleNames = getAllModuleNames(module)
      
      // 查询所有模块下的测试用例
      const allTestCases: any[] = []
      await Promise.all(
        moduleNames.map(async (moduleName) => {
          try {
            const testCases = await testCaseService.getTestCases({
              project_id: selectedProject,
              module: moduleName,
              limit: 1000
            })
            if (Array.isArray(testCases)) {
              allTestCases.push(...testCases)
            }
          } catch (error) {
            console.error(`加载模块 ${moduleName} 的测试用例失败:`, error)
          }
        })
      )
      
      setPreviewTestCases(allTestCases)
    } catch (error: any) {
      message.error('加载测试用例失败: ' + (error.response?.data?.detail || error.message))
      setPreviewTestCases([])
    } finally {
      setPreviewLoading(false)
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
      title: '关联用例',
      key: 'test_cases',
      width: 120,
      render: (_: any, record: Module) => {
        const count = moduleTestCases.get(record.id) || 0
        return (
          <Tag color={count > 0 ? 'blue' : 'default'}>
            {count} 个用例
          </Tag>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_: any, record: Module) => {
        const testCaseCount = moduleTestCases.get(record.id) || 0
        return (
          <Space>
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handlePreviewTestCases(record)}
              disabled={testCaseCount === 0}
            >
              预览用例 ({testCaseCount})
            </Button>
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
        )
      },
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
            dataSource={modules}
            rowKey="id"
            loading={loading}
            pagination={false}
            defaultExpandAllRows={true}
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

      <Modal
        title={`模块 "${previewModule?.name}" 的测试用例`}
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false)
          setPreviewModule(null)
          setPreviewTestCases([])
        }}
        footer={null}
        width={800}
      >
        <Table
          columns={[
            {
              title: '用例名称',
              dataIndex: 'name',
              key: 'name',
            },
            {
              title: '测试类型',
              dataIndex: 'test_type',
              key: 'test_type',
              render: (type: string) => <Tag>{type}</Tag>,
            },
            {
              title: '状态',
              dataIndex: 'status',
              key: 'status',
              render: (status: string) => (
                <Tag color={status === 'active' ? 'green' : 'default'}>
                  {status === 'active' ? '活跃' : status || '未知'}
                </Tag>
              ),
            },
            {
              title: '创建时间',
              dataIndex: 'created_at',
              key: 'created_at',
              render: (date: string) => date ? new Date(date).toLocaleString() : '-',
            },
          ]}
          dataSource={previewTestCases}
          rowKey="id"
          loading={previewLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个测试用例`,
          }}
        />
      </Modal>
    </div>
  )
}

export default Modules

