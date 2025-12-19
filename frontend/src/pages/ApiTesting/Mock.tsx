import { useState } from 'react'
import { Card, Button, Table, Space, Input, Switch, Tag, message } from 'antd'
import { PlusOutlined, SearchOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'

const Mock: React.FC = () => {
  const [loading] = useState(false)
  const [searchText, setSearchText] = useState('')

  const columns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '请求方法',
      dataIndex: 'method',
      key: 'method',
    },
    {
      title: '请求路径',
      dataIndex: 'path',
      key: 'path',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: boolean) => (
        <Switch checked={status} size="small" disabled />
      ),
    },
    {
      title: '项目',
      dataIndex: 'project',
      key: 'project',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="link">编辑</Button>
          <Button type="link">测试</Button>
          <Button type="link" danger>删除</Button>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Mock服务</h2>
        <Space>
          <Input
            placeholder="搜索Mock规则"
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Button icon={<PlayCircleOutlined />} onClick={() => message.info('功能开发中')}>
            启动服务
          </Button>
          <Button icon={<PauseCircleOutlined />} onClick={() => message.info('功能开发中')}>
            停止服务
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('功能开发中')}>
            新建规则
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

export default Mock
