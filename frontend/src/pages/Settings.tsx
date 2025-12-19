import { useState, useEffect } from 'react'
import { Card, Tabs, Form, Input, Button, Switch, Space, Radio, message, Upload } from 'antd'
import { SettingOutlined, MailOutlined, SafetyOutlined, TeamOutlined, MonitorOutlined, DatabaseOutlined, PictureOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'

const Settings: React.FC = () => {
  const [bgForm] = Form.useForm()
  const [bgType, setBgType] = useState<'gradient' | 'image'>('gradient')
  const [bgPreview, setBgPreview] = useState<string>('')

  useEffect(() => {
    // 加载现有配置
    const bgConfig = localStorage.getItem('login_background_config')
    if (bgConfig) {
      try {
        const config = JSON.parse(bgConfig)
        setBgType(config.type || 'gradient')
        bgForm.setFieldsValue({
          type: config.type || 'gradient',
          gradient: config.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          imageUrl: config.url || '',
        })
        if (config.type === 'image' && config.url) {
          setBgPreview(config.url)
        }
      } catch (e) {
        console.warn('加载背景配置失败:', e)
      }
    }
  }, [bgForm])

  const handleBgTypeChange = (e: any) => {
    setBgType(e.target.value)
  }

  const handleBgSave = () => {
    const values = bgForm.getFieldsValue()
    const config: any = {
      type: values.type || 'gradient',
    }
    if (values.type === 'gradient') {
      config.gradient = values.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
    } else if (values.type === 'image') {
      config.url = values.imageUrl || bgPreview
    }
    localStorage.setItem('login_background_config', JSON.stringify(config))
    message.success('登录背景配置已保存')
    // 触发自定义事件，让同标签页也能立即更新
    window.dispatchEvent(new Event('loginBackgroundUpdate'))
    // 触发storage事件，让其他标签页也能立即更新
    window.dispatchEvent(new Event('storage'))
  }

  const handleImageUpload: UploadProps['onChange'] = (info) => {
    // 由于 beforeUpload 返回 false，文件不会实际上传，所以需要直接处理文件
    const file = info.file.originFileObj || info.file as any
    
    if (file) {
      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        message.error('请上传图片文件')
        return
      }
      
      // 检查文件大小（限制为5MB）
      if (file.size > 5 * 1024 * 1024) {
        message.error('图片大小不能超过5MB')
        return
      }
      
      // 使用 FileReader 读取文件为 base64
      const reader = new FileReader()
      reader.onload = (e) => {
        const url = e.target?.result as string
        setBgPreview(url)
        bgForm.setFieldsValue({ imageUrl: url })
        message.success('图片已加载，请点击保存配置')
      }
      reader.onerror = () => {
        message.error('图片读取失败')
      }
      reader.readAsDataURL(file)
    } else if (info.file.status === 'error') {
      message.error('图片上传失败')
    }
  }

  const tabItems = [
    {
      key: 'system',
      label: '系统配置',
      icon: <SettingOutlined />,
      children: (
        <Card>
          <h3>基础配置</h3>
          <Form layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item label="系统名称" name="systemName">
              <Input placeholder="QualityGuard" />
            </Form.Item>
            <Form.Item label="站点URL" name="siteUrl">
              <Input placeholder="https://zhihome.com.cn" />
            </Form.Item>
            <Form.Item>
              <Button type="primary">保存配置</Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'login_bg',
      label: '登录背景',
      icon: <PictureOutlined />,
      children: (
        <Card>
          <h3>登录页面背景配置</h3>
          <Form form={bgForm} layout="vertical" style={{ maxWidth: 600 }} onFinish={handleBgSave}>
            <Form.Item label="背景类型" name="type" initialValue="gradient">
              <Radio.Group onChange={handleBgTypeChange} value={bgType}>
                <Radio value="gradient">渐变背景</Radio>
                <Radio value="image">图片背景</Radio>
              </Radio.Group>
            </Form.Item>
            {bgType === 'gradient' && (
              <Form.Item
                label="渐变CSS"
                name="gradient"
                initialValue="linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)"
                tooltip="输入CSS渐变表达式，例如: linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              >
                <Input.TextArea rows={3} placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" />
              </Form.Item>
            )}
            {bgType === 'image' && (
              <>
                <Form.Item label="图片URL" name="imageUrl">
                  <Input placeholder="输入图片URL或上传图片" />
                </Form.Item>
                <Form.Item label="上传图片">
                  <Upload
                    name="image"
                    listType="picture-card"
                    showUploadList={false}
                    onChange={handleImageUpload}
                    beforeUpload={() => false}
                    accept="image/*"
                    maxCount={1}
                  >
                    {bgPreview ? (
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <img 
                          src={bgPreview} 
                          alt="背景预览" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} 
                        />
                        <div 
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            background: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '0 8px 0 8px',
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setBgPreview('')
                            bgForm.setFieldsValue({ imageUrl: '' })
                          }}
                        >
                          重新上传
                        </div>
                      </div>
                    ) : (
                      <div>
                        <PictureOutlined style={{ fontSize: 24 }} />
                        <div style={{ marginTop: 8 }}>上传</div>
                      </div>
                    )}
                  </Upload>
                  <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                    支持 JPG、PNG、GIF 等图片格式，最大 5MB
                  </div>
                </Form.Item>
              </>
            )}
            <Form.Item>
              <Button type="primary" htmlType="submit">
                保存配置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'mail',
      label: '邮件配置',
      icon: <MailOutlined />,
      children: (
        <Card>
          <h3>SMTP配置</h3>
          <Form layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item label="SMTP服务器" name="smtpHost">
              <Input placeholder="smtp.example.com" />
            </Form.Item>
            <Form.Item label="端口" name="smtpPort">
              <Input placeholder="587" />
            </Form.Item>
            <Form.Item label="用户名" name="smtpUser">
              <Input />
            </Form.Item>
            <Form.Item label="密码" name="smtpPassword">
              <Input.Password />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary">保存配置</Button>
                <Button>发送测试邮件</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'security',
      label: '安全配置',
      icon: <SafetyOutlined />,
      children: (
        <Card>
          <h3>安全设置</h3>
          <Form layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item label="密码策略" name="passwordPolicy">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" defaultChecked />
            </Form.Item>
            <Form.Item label="二次验证" name="twoFactor">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>
            <Form.Item>
              <Button type="primary">保存配置</Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'permission',
      label: '权限管理',
      icon: <TeamOutlined />,
      children: (
        <Card>
          <h3>角色管理</h3>
          <p>管理用户角色和权限</p>
        </Card>
      ),
    },
    {
      key: 'monitor',
      label: '系统监控',
      icon: <MonitorOutlined />,
      children: (
        <Card>
          <h3>服务状态</h3>
          <p>查看系统服务状态和性能指标</p>
        </Card>
      ),
    },
    {
      key: 'data',
      label: '数据管理',
      icon: <DatabaseOutlined />,
      children: (
        <Card>
          <h3>数据备份</h3>
          <p>配置数据备份和恢复策略</p>
        </Card>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>
          <SettingOutlined style={{ marginRight: 8 }} />
          系统设置
        </h2>
      </div>
      <Tabs items={tabItems} />
    </div>
  )
}

export default Settings
