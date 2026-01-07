import { useState, useEffect } from 'react'
import { Card, Button, Table, Space, Input, Tag, Modal, Form, Select, message, Popconfirm } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { pageObjectService, PageObject, PageObjectCreate, PageObjectUpdate } from '../../store/services/pageObject'
import { projectService } from '../../store/services/project'

const { Option } = Select
const { TextArea } = Input

const PageObjects: React.FC = () => {
  const [pageObjects, setPageObjects] = useState<PageObject[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedProject, setSelectedProject] = useState<number | undefined>()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingPageObject, setEditingPageObject] = useState<PageObject | null>(null)
  const [form] = Form.useForm()
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => {
    loadProjects()
    loadPageObjects()
  }, [])

  useEffect(() => {
    loadPageObjects()
  }, [searchText, selectedProject])

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects()
      setProjects(data)
    } catch (error) {
      console.error('加载项目列表失败:', error)
    }
  }

  const loadPageObjects = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedProject) params.project_id = selectedProject
      if (searchText) params.search = searchText
      const data = await pageObjectService.getPageObjects(params)
      setPageObjects(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error('加载页面对象列表失败:', error)
      message.error('加载页面对象列表失败: ' + (error.response?.data?.detail || error.message))
      setPageObjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingPageObject(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: PageObject) => {
    setEditingPageObject(record)
    form.setFieldsValue({
      name: record.name,
      url: record.url,
      description: record.description,
      project_id: record.project_id,
      status: record.status,
      module: record.module,
      tags: record.tags || [],
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await pageObjectService.deletePageObject(id)
      message.success('删除成功')
      loadPageObjects()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingPageObject) {
        await pageObjectService.updatePageObject(editingPageObject.id, values)
        message.success('更新成功')
      } else {
        await pageObjectService.createPageObject(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      form.resetFields()
      loadPageObjects()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error((editingPageObject ? '更新' : '创建') + '失败: ' + (error.response?.data?.detail || error.message))
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
      title: '页面对象名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'green',
          inactive: 'default',
          deprecated: 'red',
        }
        return <Tag color={colorMap[status]}>{status}</Tag>
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <Space>
          {tags?.map((tag, index) => (
            <Tag key={index}>{tag}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: PageObject) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个页面对象吗？"
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
              placeholder="搜索页面对象"
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建页面对象
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={pageObjects}
          loading={loading}
          rowKey="id"
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingPageObject ? '编辑页面对象' : '新建页面对象'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="页面对象名称"
            rules={[{ required: true, message: '请输入页面对象名称' }]}
          >
            <Input placeholder="请输入页面对象名称" />
          </Form.Item>

          <Form.Item
            name="url"
            label="页面URL"
          >
            <Input placeholder="请输入页面URL或路径" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>

          <Form.Item
            name="project_id"
            label="所属项目"
            rules={[{ required: true, message: '请选择项目' }]}
          >
            <Select placeholder="请选择项目">
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            initialValue="active"
          >
            <Select>
              <Option value="active">激活</Option>
              <Option value="inactive">未激活</Option>
              <Option value="deprecated">已废弃</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="module"
            label="模块"
          >
            <Input placeholder="请输入模块名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default PageObjects

