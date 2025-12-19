import { Card, Empty, Button } from 'antd'
import { RobotOutlined, InfoCircleOutlined } from '@ant-design/icons'

const UIAutomation: React.FC = () => {
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>
          <RobotOutlined style={{ marginRight: 8 }} />
          UI自动化
        </h2>
      </div>
      <Card>
        <Empty
          image={<RobotOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
          description={
            <div>
              <p style={{ fontSize: 16, marginBottom: 8 }}>功能开发中</p>
              <p style={{ color: '#666', marginBottom: 16 }}>
                预计上线时间: Q3 2024
              </p>
              <div style={{ textAlign: 'left', maxWidth: 500, margin: '0 auto' }}>
                <p><strong>主要功能规划：</strong></p>
                <ul>
                  <li>Web自动化测试</li>
                  <li>移动端自动化</li>
                  <li>桌面应用自动化</li>
                  <li>录制回放功能</li>
                  <li>元素管理</li>
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

export default UIAutomation

