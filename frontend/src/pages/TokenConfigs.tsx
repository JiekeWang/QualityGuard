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
  Switch,
  Card,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  tokenConfigService,
  TokenConfig,
  TokenConfigCreate,
  TokenConfigUpdate,
  TokenConfigContent,
  TokenConfigExtractor,
} from '../store/services/tokenConfig'
import { projectService, Project } from '../store/services/project'
import { parseCurl, generateTokenConfig } from '../utils/curlParser'

const { TextArea } = Input
const { Option } = Select

const TokenConfigs: React.FC = () => {
  const [tokenConfigs, setTokenConfigs] = useState<TokenConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingConfig, setEditingConfig] = useState<TokenConfig | null>(null)
  const [form] = Form.useForm()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<number | undefined>()
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    loadProjects()
    loadTokenConfigs()
  }, [selectedProject, searchText])

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects()
      setProjects(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载项目列表失败:', error)
      setProjects([])
    }
  }

  const loadTokenConfigs = async () => {
    try {
      setLoading(true)
      const params: any = {
        project_id: selectedProject,
        search: searchText || undefined,
      }
      const data = await tokenConfigService.getTokenConfigs(params)
      setTokenConfigs(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error('加载Token配置列表失败:', error)
      message.error('加载Token配置列表失败: ' + (error.response?.data?.detail || error.message))
      setTokenConfigs([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingConfig(null)
    // 先打开Modal，再重置表单并设置初始值
    setModalVisible(true)
    // 使用setTimeout确保Modal完全打开后再重置表单
    setTimeout(() => {
      form.resetFields()
      form.setFieldsValue({
        name: '',
        description: '',
        project_id: undefined,
        is_active: true,
        config_json: JSON.stringify({
          url: 'https://api.example.com/login',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            username: 'admin',
            password: '123456'
          },
          extractors: [
            {
              name: 'token',
              type: 'json',
              path: '$.data.token'
            }
          ],
          retry_status_codes: [401, 403]
        }, null, 2),
      })
    }, 100)
  }

  const handleEdit = (record: TokenConfig) => {
    setEditingConfig(record)
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      project_id: record.project_id,
      is_active: record.is_active,
      config_json: JSON.stringify(record.config, null, 2),
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await tokenConfigService.deleteTokenConfig(id)
      message.success('删除成功')
      loadTokenConfigs()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      // 解析JSON配置
      let configData: TokenConfigContent
      try {
        configData = JSON.parse(values.config_json)
      } catch (e: any) {
        message.error('Token配置JSON格式错误: ' + (e.message || '未知错误'))
        return
      }
      
      // 验证必填字段
      if (!configData.url) {
        message.error('Token配置中缺少url字段')
        return
      }
      if (!configData.extractors || !Array.isArray(configData.extractors)) {
        message.error('Token配置中缺少extractors字段或格式错误')
        return
      }

      if (editingConfig) {
        const updateData: TokenConfigUpdate = {
          name: values.name,
          description: values.description,
          project_id: values.project_id,
          config: configData,
          is_active: values.is_active,
        }
        await tokenConfigService.updateTokenConfig(editingConfig.id, updateData)
        message.success('更新成功')
      } else {
        const createData: TokenConfigCreate = {
          name: values.name,
          description: values.description,
          project_id: values.project_id,
          config: configData,
          is_active: values.is_active !== false,
        }
        await tokenConfigService.createTokenConfig(createData)
        message.success('创建成功')
      }
      
      setModalVisible(false)
      loadTokenConfigs()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error((editingConfig ? '更新' : '创建') + '失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleImportFromCurl = async () => {
    const curlCommand = prompt(
      '请粘贴 Token 获取接口的 cURL 命令：\n\n提示：\n1. 从浏览器开发者工具 Network 面板复制\n2. 或从 Postman/Apipost 导出\n3. 系统会自动解析并生成配置'
    )
    if (curlCommand) {
      try {
        const parsed = parseCurl(curlCommand)
        if (parsed) {
          const tokenPath = prompt(
            '请输入 Token 在响应中的 JSONPath 路径：\n\n常见示例：\n- $.data.token\n- $.token\n- $.access_token\n- $.result.accessToken',
            '$.data.token'
          )
          if (tokenPath) {
            const tokenConfig = generateTokenConfig(parsed, tokenPath)
            form.setFieldsValue({
              config_json: JSON.stringify(tokenConfig, null, 2),
            })
            message.success('Token 配置已生成！请检查配置字段')
          }
        } else {
          message.error('无法解析 cURL 命令，请检查格式是否正确')
        }
      } catch (error: any) {
        message.error('解析失败：' + (error.message || '未知错误'))
        console.error('cURL 解析错误:', error)
      }
    }
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
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
      width: 150,
      render: (projectId: number | undefined) => {
        if (!projectId) return <Tag>全局</Tag>
        const project = projects.find(p => p.id === projectId)
        return project ? project.name : `项目${projectId}`
      },
    },
    {
      title: 'URL',
      dataIndex: ['config', 'url'],
      key: 'url',
      ellipsis: true,
    },
    {
      title: '方法',
      dataIndex: ['config', 'method'],
      key: 'method',
      width: 100,
      render: (method: string) => <Tag color="blue">{method || 'POST'}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: TokenConfig) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个Token配置吗？"
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
          <h2 style={{ margin: 0 }}>Token管理</h2>
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
              placeholder="搜索Token配置"
              prefix={<SearchOutlined />}
              style={{ width: 200 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新建Token配置
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={tokenConfigs}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editingConfig ? '编辑Token配置' : '新建Token配置'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          // 关闭Modal时重置表单
          setTimeout(() => {
            form.resetFields()
          }, 300)
        }}
        width={800}
        okText="确定"
        cancelText="取消"
        destroyOnClose={true}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            is_active: true,
            config_json: JSON.stringify({
              url: 'https://api.example.com/login',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: {
                username: 'admin',
                password: '123456'
              },
              extractors: [
                {
                  name: 'token',
                  type: 'json',
                  path: '$.data.token'
                }
              ],
              retry_status_codes: [401, 403]
            }, null, 2),
          }}
        >
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入Token配置名称' }]}
          >
            <Input placeholder="请输入Token配置名称" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="请输入描述" />
          </Form.Item>

          <Form.Item name="project_id" label="所属项目">
            <Select placeholder="选择项目（留空表示全局配置）" allowClear>
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="is_active" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <div style={{ marginTop: 16, marginBottom: 16, borderTop: '1px solid #d9d9d9', paddingTop: 16 }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Token配置（JSON格式）</h4>
              <Button type="link" onClick={handleImportFromCurl}>
                从 cURL 导入
              </Button>
            </div>
            
            <Form.Item
              name="config_json"
              label="配置内容"
              rules={[{ required: true, message: '请输入Token配置' }]}
              tooltip='包含url、method、headers、body、extractors、retry_status_codes等字段的JSON配置'
            >
              <TextArea
                rows={20}
                placeholder={`{
  "url": "https://api.example.com/login",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "username": "admin",
    "password": "123456"
  },
  "extractors": [
    {
      "name": "token",
      "type": "json",
      "path": "$.data.token"
    }
  ],
  "retry_status_codes": [401, 403]
}`}
                style={{ fontFamily: 'monospace', fontSize: '12px', minHeight: '400px' }}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default TokenConfigs

