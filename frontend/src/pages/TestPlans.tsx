import { Table, Button, Space } from 'antd'
import { PlusOutlined, PlayCircleOutlined } from '@ant-design/icons'

const TestPlans: React.FC = () => {
  const columns = [
    {
      title: '计划名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="link" icon={<PlayCircleOutlined />}>执行</Button>
          <Button type="link">编辑</Button>
          <Button type="link" danger>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>测试计划</h2>
        <Button type="primary" icon={<PlusOutlined />}>
          新建计划
        </Button>
      </div>
      <Table columns={columns} dataSource={[]} rowKey="id" />
    </div>
  )
}

export default TestPlans

