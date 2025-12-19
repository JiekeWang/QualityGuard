import { useState } from 'react'
import { Card, Button, Table, Space, Input, message } from 'antd'
import { PlusOutlined, SearchOutlined, PlayCircleOutlined } from '@ant-design/icons'

const TestScenes: React.FC = () => {
  const [loading] = useState(false)
  const [searchText, setSearchText] = useState('')

  const columns = [
    {
      title: '场景名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '项目',
      dataIndex: 'project',
      key: 'project',
    },
    {
      title: '用例数量',
      dataIndex: 'caseCount',
      key: 'caseCount',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
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
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>测试场景</h2>
        <Space>
          <Input
            placeholder="搜索场景"
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('功能开发中')}>
            新建场景
          </Button>
        </Space>
      </div>
      <Card>
        <Table 
          columns={columns} 
          dataSource={[]} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  )
}

export default TestScenes
