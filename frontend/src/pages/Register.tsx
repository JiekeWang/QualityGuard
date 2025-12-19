import { Form, Input, Button, Card, message, Alert } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { registerAsync, clearError } from '../store/slices/authSlice'
import { useEffect } from 'react'

const Register: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading, error, isAuthenticated } = useAppSelector((state) => state.auth)

  useEffect(() => {
    // 如果已经登录，重定向到dashboard
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const onFinish = async (values: {
    username: string
    email: string
    password: string
    confirmPassword: string
  }) => {
    dispatch(clearError())
    try {
      await dispatch(
        registerAsync({
          username: values.username,
          email: values.email,
          password: values.password,
        })
      ).unwrap()
      message.success('注册成功！请登录')
      navigate('/login')
    } catch (err: any) {
      message.error(err || '注册失败')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8, color: '#1890ff' }}>
            QualityGuard
          </h1>
          <p style={{ color: '#8c8c8c' }}>创建新账户</p>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => dispatch(clearError())}
            style={{ marginBottom: 24 }}
          />
        )}

        <Form
          name="register"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: '请输入用户名!' },
              { min: 3, message: '用户名至少3个字符!' },
              { max: 50, message: '用户名最多50个字符!' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入用户名（3-50个字符）"
            />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱!' },
              { type: 'email', message: '请输入有效的邮箱地址!' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="请输入邮箱地址"
            />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码!' },
              { min: 6, message: '密码至少6个字符!' },
              { max: 100, message: '密码最多100个字符!' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码（至少6个字符）"
            />
          </Form.Item>

          <Form.Item
            label="确认密码"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致!'))
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请再次输入密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ height: 40 }}
            >
              注册
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <span style={{ color: '#8c8c8c' }}>已有账号？</span>{' '}
            <Link to="/login" style={{ color: '#1890ff' }}>
              立即登录
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default Register
