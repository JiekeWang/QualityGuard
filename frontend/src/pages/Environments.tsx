import { useEffect, useState } from 'react'
import { Card, Table, Button, Space, Modal, Form, Input, Switch, message, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { environmentService, type Environment, type EnvironmentCreate } from '../store/services/environment'

const { TextArea } = Input

const Environments: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<Environment | null>(null)
  const [form] = Form.useForm()

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await environmentService.getEnvironments(false)
      setEnvironments(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error('加载环境列表失败:', error)
      message.error('加载环境列表失败: ' + (error.response?.data?.detail || error.message))
      setEnvironments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      is_active: true,
    })
    setModalVisible(true)
  }

  const handleEdit = (record: Environment) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      key: record.key,
      description: record.description,
      base_url: record.base_url,
      is_active: record.is_active,
      default_headers: record.default_headers ? JSON.stringify(record.default_headers, null, 2) : '',
      default_params: record.default_params ? JSON.stringify(record.default_params, null, 2) : '',
      variables: record.variables ? JSON.stringify(record.variables, null, 2) : '',
    })
    setModalVisible(true)
  }

  const handleDelete = async (record: Environment) => {
    Modal.confirm({
      title: '确认删除环境？',
      content: `环境「${record.name}」删除后，引用该环境的执行配置将无法再使用该环境，请谨慎操作。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      async onOk() {
        try {
          await environmentService.deleteEnvironment(record.id)
          message.success('删除成功')
          loadData()
        } catch (error: any) {
          console.error('删除环境失败:', error)
          message.error('删除环境失败: ' + (error.response?.data?.detail || error.message))
        }
      },
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      let defaultHeaders: any = undefined
      let defaultParams: any = undefined
      let variables: any = undefined

      const parseJsonField = (value?: string) => {
        if (!value || !value.trim()) return undefined
        try {
          return JSON.parse(value)
        } catch (e) {
          throw new Error('JSON格式错误: ' + value)
        }
      }

      try {
        defaultHeaders = parseJsonField(values.default_headers)
        defaultParams = parseJsonField(values.default_params)
        variables = parseJsonField(values.variables)
      } catch (e: any) {
        message.error(e.message || 'JSON 字段格式错误')
        return
      }

      const payload: EnvironmentCreate = {
        name: values.name,
        key: values.key,
        description: values.description,
        base_url: values.base_url,
        is_active: values.is_active,
        default_headers: defaultHeaders,
        default_params: defaultParams,
        variables,
      }

      if (editing) {
        await environmentService.updateEnvironment(editing.id, payload)
        message.success('环境已更新')
      } else {
        await environmentService.createEnvironment(payload)
        message.success('环境已创建')
      }

      setModalVisible(false)
      loadData()
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      console.error('保存环境失败:', error)
      message.error('保存环境失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const columns = [
    {
      title: '环境名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '标识Key',
      dataIndex: 'key',
      key: 'key',
      width: 140,
      render: (key: string) => <Tag color="blue">{key}</Tag>,
    },
    {
      title: '基础URL',
      dataIndex: 'base_url',
      key: 'base_url',
      width: 260,
      ellipsis: true,
    },
    {
      title: '启用状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (active: boolean) =>
        active ? <Tag color="green">启用</Tag> : <Tag color="default">停用</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: Environment) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>环境管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建环境
        </Button>
      </div>
      <Card>
        <Table
          columns={columns}
          dataSource={Array.isArray(environments) ? environments : []}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={editing ? '编辑环境' : '新建环境'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="环境名称"
            rules={[{ required: true, message: '请输入环境名称' }]}
          >
            <Input placeholder="例如：测试环境 / 预发布环境 / 生产环境" />
          </Form.Item>
          <Form.Item
            name="key"
            label="环境标识Key"
            tooltip="用于引用环境，例如 dev/test/staging/prod"
            rules={[{ required: true, message: '请输入环境标识' }]}
          >
            <Input placeholder="例如：test、staging、prod" />
          </Form.Item>
          <Form.Item name="base_url" label="基础URL">
            <Input placeholder="例如：https://api-test.example.com" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="简单描述该环境的用途，如：内部测试环境" />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="是否启用"
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Form.Item
            name="default_headers"
            label="默认请求头（JSON，可选）"
            tooltip='例如：{"Authorization": "Bearer ${token}"}'
          >
            <TextArea rows={3} placeholder='{"Authorization": "Bearer ${token}"}' />
          </Form.Item>
          <Form.Item
            name="default_params"
            label="默认查询参数（JSON，可选）"
          >
            <TextArea rows={3} placeholder='{"locale": "zh-CN"}' />
          </Form.Item>
          <Form.Item
            name="variables"
            label="环境变量（JSON，可选）"
            tooltip='例如：{"tenantId": "default", "env": "test"}'
          >
            <TextArea rows={3} placeholder='{"tenantId": "default", "env": "test"}' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Environments


