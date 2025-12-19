import { useState, useEffect } from 'react'
import { Card, Tabs, Form, Input, Button, Avatar, Space, Upload, message } from 'antd'
import { UserOutlined, SettingOutlined, BellOutlined, MessageOutlined, UploadOutlined, LockOutlined } from '@ant-design/icons'
import { userService, UserProfileUpdate, PasswordUpdate } from '../store/services/user'
import { useAppSelector } from '../store/hooks'

const { TextArea } = Input

const PersonalCenter: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth)
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({
        username: user.username,
        email: user.email,
      })
    }
  }, [user, profileForm])

  const handleProfileUpdate = async () => {
    try {
      setLoading(true)
      const values = await profileForm.validateFields()
      const updateData: UserProfileUpdate = {
        username: values.username,
        email: values.email,
      }
      await userService.updateProfile(updateData)
      message.success('个人信息更新成功')
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error('更新失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async () => {
    try {
      setLoading(true)
      const values = await passwordForm.validateFields()
      if (values.new_password !== values.confirm_password) {
        message.error('两次输入的密码不一致')
        return
      }
      const updateData: PasswordUpdate = {
        current_password: values.current_password,
        new_password: values.new_password,
      }
      await userService.updatePassword(updateData)
      message.success('密码更新成功')
      passwordForm.resetFields()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error('更新失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const tabItems = [
    {
      key: 'profile',
      label: '个人信息',
      icon: <UserOutlined />,
      children: (
        <Card>
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <Avatar size={100} icon={<UserOutlined />} />
            <div style={{ marginTop: 16 }}>
              <Upload>
                <Button icon={<UploadOutlined />}>更换头像</Button>
              </Upload>
            </div>
          </div>
          <Form form={profileForm} layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item>
              <Button type="primary" onClick={handleProfileUpdate} loading={loading}>
                保存
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'password',
      label: '修改密码',
      icon: <LockOutlined />,
      children: (
        <Card>
          <Form form={passwordForm} layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item
              name="current_password"
              label="当前密码"
              rules={[{ required: true, message: '请输入当前密码' }]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item
              name="new_password"
              label="新密码"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码长度至少6位' },
              ]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item
              name="confirm_password"
              label="确认新密码"
              rules={[
                { required: true, message: '请确认新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'))
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item>
              <Button type="primary" onClick={handlePasswordUpdate} loading={loading}>
                更新密码
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'work',
      label: '我的工作',
      icon: <UserOutlined />,
      children: (
        <Card>
          <h3>我的任务</h3>
          <p>待执行任务、执行中任务、已完成任务</p>
        </Card>
      ),
    },
    {
      key: 'settings',
      label: '我的设置',
      icon: <SettingOutlined />,
      children: (
        <Card>
          <h3>偏好设置</h3>
          <p>功能开发中...</p>
        </Card>
      ),
    },
    {
      key: 'notifications',
      label: '通知设置',
      icon: <BellOutlined />,
      children: (
        <Card>
          <h3>通知偏好</h3>
          <p>配置接收通知的方式和类型</p>
        </Card>
      ),
    },
    {
      key: 'messages',
      label: '消息中心',
      icon: <MessageOutlined />,
      children: (
        <Card>
          <h3>系统通知</h3>
          <p>查看系统通知和协作消息</p>
        </Card>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2>
          <UserOutlined style={{ marginRight: 8 }} />
          个人中心
        </h2>
      </div>
      <Tabs items={tabItems} />
    </div>
  )
}

export default PersonalCenter
