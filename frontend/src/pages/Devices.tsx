import { Table, Tag, Button, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

const Devices: React.FC = () => {
  const columns = [
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          available: 'success',
          busy: 'warning',
          offline: 'error',
        }
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>
      },
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

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2>设备管理</h2>
        <Button type="primary" icon={<PlusOutlined />}>
          添加设备
        </Button>
      </div>
      <Table columns={columns} dataSource={[]} rowKey="id" />
    </div>
  )
}

export default Devices

