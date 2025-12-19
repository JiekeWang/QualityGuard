import { Card, Tabs, Form, Input, Button, Select, Space } from 'antd'
import { ThunderboltOutlined, ApiOutlined, PlayCircleOutlined } from '@ant-design/icons'

const { Option } = Select

const QuickTest: React.FC = () => {
  const [form] = Form.useForm()

  const tabItems = [
    {
      key: 'single',
      label: '单接口测试',
      children: (
        <Card>
          <Form form={form} layout="vertical">
            <Form.Item label="请求方法" name="method" initialValue="GET">
              <Select>
                <Option value="GET">GET</Option>
                <Option value="POST">POST</Option>
                <Option value="PUT">PUT</Option>
                <Option value="DELETE">DELETE</Option>
                <Option value="PATCH">PATCH</Option>
              </Select>
            </Form.Item>
            <Form.Item label="接口地址" name="url" rules={[{ required: true, message: '请输入接口地址' }]}>
              <Input placeholder="https://api.example.com/v1/users" />
            </Form.Item>
            <Form.Item label="请求参数" name="params">
              <Input.TextArea rows={4} placeholder="JSON格式的请求参数" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" icon={<PlayCircleOutlined />}>
                  发送请求
                </Button>
                <Button>保存为用例</Button>
                <Button>清除</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'scene',
      label: '场景快速测试',
      children: (
        <Card>
          <p>选择测试场景并快速执行</p>
          <Button type="primary" icon={<PlayCircleOutlined />}>
            选择场景并执行
          </Button>
        </Card>
      ),
    },
    {
      key: 'batch',
      label: '批量验证',
      children: (
        <Card>
          <p>批量验证接口健康状态</p>
          <Button type="primary" icon={<PlayCircleOutlined />}>
            开始批量验证
          </Button>
        </Card>
      ),
    },
    {
      key: 'tools',
      label: '调试工具',
      children: (
        <Card>
          <p>提供Curl转换、编码解码、时间戳转换等调试工具</p>
        </Card>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>
          <ThunderboltOutlined style={{ marginRight: 8 }} />
          快速测试
        </h2>
        <p style={{ color: '#666' }}>快速测试接口，无需创建用例</p>
      </div>
      <Tabs items={tabItems} />
    </div>
  )
}

export default QuickTest

