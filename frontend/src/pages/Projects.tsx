import { useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchProjects } from '../store/slices/projectSlice'

const Projects: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()
  const dispatch = useAppDispatch()
  // const projects = useAppSelector((state) => state.projects.items)

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
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="link">编辑</Button>
          <Button type="link" danger>删除</Button>
        </Space>
      ),
    },
  ]

  const handleCreate = () => {
    form.validateFields().then((values) => {
      // TODO: 实现创建项目逻辑
      message.success('项目创建成功')
      setIsModalVisible(false)
      form.resetFields()
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>项目管理</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalVisible(true)}
        >
          新建项目
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={[]}
        rowKey="id"
      />
      <Modal
        title="新建项目"
        open={isModalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Projects

