import { Table, Tag } from 'antd'

const TestExecutions: React.FC = () => {
  const columns = [
    {
      title: '执行ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '计划名称',
      dataIndex: 'plan_name',
      key: 'plan_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          running: 'processing',
          passed: 'success',
          failed: 'error',
        }
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>
      },
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
    },
  ]

  return (
    <div>
      <h2>测试执行</h2>
      <Table columns={columns} dataSource={[]} rowKey="id" />
    </div>
  )
}

export default TestExecutions

