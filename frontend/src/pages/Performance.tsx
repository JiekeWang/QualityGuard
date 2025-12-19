import { Card, Empty, Button } from 'antd'
import { LineChartOutlined, InfoCircleOutlined } from '@ant-design/icons'

const Performance: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>
          <LineChartOutlined style={{ marginRight: 8 }} />
          性能测试
        </h2>
      </div>
      <Card>
        <Empty
          image={<LineChartOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
          description={
            <div>
              <p style={{ fontSize: 16, marginBottom: 8 }}>功能开发中</p>
              <p style={{ color: '#666', marginBottom: 16 }}>
                预计上线时间: Q2 2024
              </p>
              <div style={{ textAlign: 'left', maxWidth: 500, margin: '0 auto' }}>
                <p><strong>主要功能规划：</strong></p>
                <ul>
                  <li>性能场景设计</li>
                  <li>压力测试</li>
                  <li>负载测试</li>
                  <li>稳定性测试</li>
                  <li>性能监控</li>
                </ul>
              </div>
            </div>
          }
        >
          <Button type="primary" icon={<InfoCircleOutlined />}>
            了解更多详情
          </Button>
        </Empty>
      </Card>
    </div>
  )
}

export default Performance

