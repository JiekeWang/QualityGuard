import { Table, Button } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'

const Reports: React.FC = () => {
  const columns = [
    {
      title: '报告ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '执行ID',
      dataIndex: 'execution_id',
      key: 'execution_id',
    },
    {
      title: '生成时间',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button type="link" icon={<DownloadOutlined />}>
          下载
        </Button>
      ),
    },
  ]

  return (
    <div>
      <h2>测试报告</h2>
      <Table columns={columns} dataSource={[]} rowKey="id" />
    </div>
  )
}

export default Reports

