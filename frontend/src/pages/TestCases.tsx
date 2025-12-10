import { Table, Button, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

const TestCases: React.FC = () => {
  const columns = [
    {
      title: '用例名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
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
          <Button type="link">编辑</Button>
          <Button type="link">执行</Button>
          <Button type="link" danger>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>测试用例</h2>
        <Button type="primary" icon={<PlusOutlined />}>
          新建用例
        </Button>
      </div>
      <Table columns={columns} dataSource={[]} rowKey="id" />
    </div>
  )
}

export default TestCases

