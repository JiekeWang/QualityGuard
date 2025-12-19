import { useState, useEffect } from 'react'
import { Form, Input, Button, Card, message, Alert } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loginAsync, clearError } from '../store/slices/authSlice'
import './Login.css'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { loading, error, isAuthenticated } = useAppSelector((state) => state.auth)
  const [loginForm] = Form.useForm()

  useEffect(() => {
    // 如果已经登录，重定向到dashboard
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const onLoginFinish = async (values: { username: string; password: string }) => {
    dispatch(clearError())
    try {
      await dispatch(loginAsync(values)).unwrap()
      message.success('登录成功')
      navigate('/dashboard')
    } catch (err: any) {
      // 显示详细的错误信息
      const errorMessage = err || '登录失败，请检查用户名和密码'
      message.error(errorMessage)
      console.error('登录错误:', err)
    }
  }


  // 从localStorage读取背景配置，支持gradient和image两种类型
  const [backgroundStyle, setBackgroundStyle] = useState(() => {
    const bgConfig = localStorage.getItem('login_background_config')
    if (bgConfig) {
      try {
        const config = JSON.parse(bgConfig)
        if (config.type === 'image' && config.url) {
          return {
            backgroundImage: `url(${config.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            width: '100vw',
            height: '100vh',
            minWidth: '100vw',
            minHeight: '100vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
          }
        } else if (config.type === 'gradient' && config.gradient) {
          return {
            background: config.gradient,
          }
        }
      } catch (e) {
        console.warn('背景配置解析失败:', e)
      }
    }
    // 默认使用未来感深色背景（模拟图片风格）
    return {
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 25%, #2d1b3d 50%, #1a1f3a 75%, #0a0e27 100%)',
      position: 'relative',
    }
  })

  useEffect(() => {
    // 处理浏览器自动填充后的颜色问题
    const fixAutofillStyles = () => {
      const inputs = document.querySelectorAll('.login-container input')
      inputs.forEach((input) => {
        const htmlInput = input as HTMLInputElement
        if (htmlInput.matches(':-webkit-autofill')) {
          htmlInput.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
          htmlInput.style.setProperty('-webkit-box-shadow', '0 0 0px 1000px rgba(30, 35, 50, 0.7) inset', 'important')
          htmlInput.style.setProperty('box-shadow', '0 0 0px 1000px rgba(30, 35, 50, 0.7) inset', 'important')
          htmlInput.style.setProperty('background-color', 'rgba(30, 35, 50, 0.7)', 'important')
          htmlInput.style.setProperty('background', 'rgba(30, 35, 50, 0.7)', 'important')
          htmlInput.style.setProperty('color', '#ffffff', 'important')
          htmlInput.style.setProperty('caret-color', '#ffffff', 'important')
        }
      })
    }

    // 监听自动填充事件
    const handleAnimationStart = (e: AnimationEvent) => {
      if (e.animationName === 'onAutoFillStart' || e.type === 'animationstart') {
        fixAutofillStyles()
      }
    }

    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver(() => {
      fixAutofillStyles()
    })

    // 开始观察
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    })

    // 定期检查并修复
    const intervalId = setInterval(fixAutofillStyles, 100)

    // 在输入框获得焦点时也检查
    document.addEventListener('focusin', (e) => {
      if (e.target instanceof HTMLInputElement) {
        setTimeout(fixAutofillStyles, 50)
      }
    })

    // 强制设置 body 和 html 为全屏，无滚动
    const setFullScreen = () => {
      // 设置 html
      document.documentElement.style.setProperty('height', '100%', 'important')
      document.documentElement.style.setProperty('width', '100%', 'important')
      document.documentElement.style.setProperty('overflow', 'hidden', 'important')
      document.documentElement.style.setProperty('margin', '0', 'important')
      document.documentElement.style.setProperty('padding', '0', 'important')
      document.documentElement.style.setProperty('position', 'fixed', 'important')
      document.documentElement.style.setProperty('top', '0', 'important')
      document.documentElement.style.setProperty('left', '0', 'important')
      document.documentElement.style.setProperty('right', '0', 'important')
      document.documentElement.style.setProperty('bottom', '0', 'important')
      document.documentElement.style.setProperty('max-height', '100vh', 'important')
      document.documentElement.style.setProperty('max-width', '100vw', 'important')
      
      // 设置 body
      document.body.style.setProperty('height', '100%', 'important')
      document.body.style.setProperty('width', '100%', 'important')
      document.body.style.setProperty('overflow', 'hidden', 'important')
      document.body.style.setProperty('margin', '0', 'important')
      document.body.style.setProperty('padding', '0', 'important')
      document.body.style.setProperty('position', 'fixed', 'important')
      document.body.style.setProperty('top', '0', 'important')
      document.body.style.setProperty('left', '0', 'important')
      document.body.style.setProperty('right', '0', 'important')
      document.body.style.setProperty('bottom', '0', 'important')
      document.body.style.setProperty('max-height', '100vh', 'important')
      document.body.style.setProperty('max-width', '100vw', 'important')
      
      // 设置 #root
      const rootElement = document.getElementById('root')
      if (rootElement) {
        rootElement.style.setProperty('height', '100%', 'important')
        rootElement.style.setProperty('width', '100%', 'important')
        rootElement.style.setProperty('overflow', 'hidden', 'important')
        rootElement.style.setProperty('margin', '0', 'important')
        rootElement.style.setProperty('padding', '0', 'important')
        rootElement.style.setProperty('position', 'fixed', 'important')
        rootElement.style.setProperty('top', '0', 'important')
        rootElement.style.setProperty('left', '0', 'important')
        rootElement.style.setProperty('right', '0', 'important')
        rootElement.style.setProperty('bottom', '0', 'important')
        rootElement.style.setProperty('max-height', '100vh', 'important')
        rootElement.style.setProperty('max-width', '100vw', 'important')
      }
      
      // 添加类名
      document.body.classList.add('login-page')
      document.documentElement.classList.add('login-page')
    }
    
    // 立即执行
    setFullScreen()
    
    // 使用 setTimeout 确保 DOM 完全加载后再设置
    setTimeout(setFullScreen, 0)
    setTimeout(setFullScreen, 100)

    // 监听storage事件，当配置更新时立即刷新背景
    const handleStorageChange = () => {
      const bgConfig = localStorage.getItem('login_background_config')
      if (bgConfig) {
        try {
          const config = JSON.parse(bgConfig)
          if (config.type === 'image' && config.url) {
            setBackgroundStyle({
              backgroundImage: `url(${config.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            })
          } else if (config.type === 'gradient' && config.gradient) {
            setBackgroundStyle({
              background: config.gradient,
            })
          }
        } catch (e) {
          console.warn('背景配置解析失败:', e)
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    // 也监听自定义事件（同标签页内更新）
    window.addEventListener('loginBackgroundUpdate', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('loginBackgroundUpdate', handleStorageChange)
    }
  }, [])

  return (
    <div
      className="login-container"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        minWidth: '100vw',
        minHeight: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        zIndex: 0,
        ...backgroundStyle,
      }}
    >
      {/* 雨滴动画效果 */}
      <style>{`
        @keyframes rain {
          0% { transform: translateY(-100vh) translateX(0); opacity: 0; }
          10% { opacity: 0.6; }
          100% { transform: translateY(100vh) translateX(20px); opacity: 0.3; }
        }
        .rain-drop {
          position: absolute;
          width: 2px;
          height: 20px;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.2));
          animation: rain linear infinite;
          pointer-events: none;
        }
        @keyframes circuitPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .circuit-line {
          animation: circuitPulse 3s ease-in-out infinite;
        }
      `}</style>
      
      {/* 生成雨滴 */}
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="rain-drop"
          style={{
            left: `${(i * 3.7) % 100}%`,
            animationDelay: `${(i * 0.1) % 2}s`,
            animationDuration: `${1 + (i % 3)}s`,
          }}
        />
      ))}

      {/* 电路板风格的装饰线条 */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.4,
        }}
      >
        {/* 连接登录框的电路线 */}
        <path
          d="M 50% 50% L 30% 20% M 50% 50% L 70% 30% M 50% 50% L 20% 80% M 50% 50% L 80% 70%"
          stroke="#00d9ff"
          strokeWidth="2"
          fill="none"
          className="circuit-line"
          style={{ filter: 'drop-shadow(0 0 4px #00d9ff)' }}
        />
        {/* 电路节点 */}
        {[
          { x: '30%', y: '20%' },
          { x: '70%', y: '30%' },
          { x: '20%', y: '80%' },
          { x: '80%', y: '70%' },
        ].map((node, i) => (
          <circle
            key={i}
            cx={node.x}
            cy={node.y}
            r="4"
            fill="#00d9ff"
            className="circuit-line"
            style={{ filter: 'drop-shadow(0 0 6px #00d9ff)' }}
          />
        ))}
      </svg>

      {/* 几何形状装饰 */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '150px',
          height: '150px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))',
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          filter: 'blur(20px)',
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '15%',
          right: '15%',
          width: '120px',
          height: '120px',
          background: 'linear-gradient(135deg, rgba(118, 75, 162, 0.3), rgba(102, 126, 234, 0.3))',
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          filter: 'blur(15px)',
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          left: '15%',
          width: '100px',
          height: '100px',
          background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(102, 126, 234, 0.2))',
          borderRadius: '50%',
          filter: 'blur(30px)',
          opacity: 0.4,
        }}
      />
      <Card 
        style={{ 
          width: 440,
          position: 'relative',
          zIndex: 1,
          background: 'rgba(15, 20, 35, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '2px solid',
          borderImage: 'linear-gradient(135deg, #a855f7, #ec4899, #00d9ff) 1',
          boxShadow: `
            0 0 40px rgba(168, 85, 247, 0.4),
            0 0 80px rgba(236, 72, 153, 0.3),
            inset 0 0 20px rgba(0, 217, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `,
          borderRadius: 16,
          overflow: 'visible',
          animation: 'slideUp 0.6s ease-out',
        }}
        bodyStyle={{ padding: '28px 24px', background: 'transparent' }}
      >
        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          .login-logo {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>
        
        {/* 霓虹灯边框效果 */}
        <div
          style={{
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            background: 'linear-gradient(135deg, #a855f7, #ec4899, #00d9ff, #a855f7)',
            borderRadius: 18,
            zIndex: -1,
            opacity: 0.6,
            filter: 'blur(8px)',
            animation: 'borderGlow 3s ease-in-out infinite',
          }}
        />
        <style>{`
          @keyframes borderGlow {
            0%, 100% { opacity: 0.6; filter: blur(8px); }
            50% { opacity: 0.9; filter: blur(12px); }
          }
        `}</style>
        
        {/* 标题 - 未来感样式 */}
        <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative', zIndex: 1 }}>
          <h1 style={{ 
            fontSize: 20, 
            marginBottom: 0,
            marginTop: 0,
            color: '#ffffff',
            fontWeight: 700,
            letterSpacing: '1.5px',
            textShadow: '0 0 20px rgba(168, 85, 247, 0.8), 0 0 40px rgba(236, 72, 153, 0.6)',
            lineHeight: 1.3,
          }}>
            自动化测试平台
          </h1>
        </div>
        

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => dispatch(clearError())}
            style={{ 
              marginBottom: 24, 
              fontSize: 13,
              borderRadius: 12,
              border: '1px solid rgba(239, 68, 68, 0.2)',
              background: 'rgba(254, 242, 242, 0.8)',
            }}
          />
        )}

        <Form
          form={loginForm}
          name="login"
          onFinish={onLoginFinish}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item
            label={<span style={{ fontWeight: 600, color: '#ffffff', fontSize: 12, letterSpacing: '0.5px' }}>用户名或邮箱</span>}
            name="username"
            rules={[{ required: true, message: '请输入用户名或邮箱!' }]}
            style={{ marginBottom: 16 }}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#a855f7' }} />}
              placeholder="请输入用户名或邮箱"
              autoComplete="username"
              style={{
                height: 44,
                borderRadius: 8,
                border: '2px solid rgba(168, 85, 247, 0.4)',
                fontSize: 14,
                paddingLeft: 14,
                backgroundColor: 'rgba(30, 35, 50, 0.7)',
                color: '#ffffff',
                transition: 'all 0.3s ease',
              }}
              styles={{
                input: {
                  backgroundColor: 'rgba(30, 35, 50, 0.7) !important',
                  color: '#ffffff !important',
                  WebkitTextFillColor: '#ffffff !important',
                  caretColor: '#ffffff !important',
                },
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#a855f7'
                e.target.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.4), inset 0 0 10px rgba(168, 85, 247, 0.15)'
                e.target.style.backgroundColor = 'rgba(30, 35, 50, 0.85)'
                const input = e.target as HTMLInputElement
                if (input) {
                  input.style.color = '#ffffff'
                  input.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
                  input.style.setProperty('-webkit-box-shadow', '0 0 0px 1000px rgba(30, 35, 50, 0.85) inset', 'important')
                  input.style.setProperty('box-shadow', '0 0 0px 1000px rgba(30, 35, 50, 0.85) inset', 'important')
                }
                // 查找内部input
                setTimeout(() => {
                  const innerInput = e.target.querySelector('input') as HTMLInputElement
                  if (innerInput) {
                    innerInput.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
                    innerInput.style.setProperty('-webkit-box-shadow', '0 0 0px 1000px rgba(30, 35, 50, 0.85) inset', 'important')
                    innerInput.style.setProperty('box-shadow', '0 0 0px 1000px rgba(30, 35, 50, 0.85) inset', 'important')
                  }
                }, 0)
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(168, 85, 247, 0.4)'
                e.target.style.boxShadow = 'none'
                e.target.style.backgroundColor = 'rgba(30, 35, 50, 0.7)'
                const input = e.target as HTMLInputElement
                if (input) {
                  input.style.color = '#ffffff'
                  input.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
                  input.style.setProperty('-webkit-box-shadow', '0 0 0px 1000px rgba(30, 35, 50, 0.7) inset', 'important')
                  input.style.setProperty('box-shadow', '0 0 0px 1000px rgba(30, 35, 50, 0.7) inset', 'important')
                }
                // 查找内部input
                setTimeout(() => {
                  const innerInput = e.target.querySelector('input') as HTMLInputElement
                  if (innerInput) {
                    innerInput.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
                    innerInput.style.setProperty('-webkit-box-shadow', '0 0 0px 1000px rgba(30, 35, 50, 0.7) inset', 'important')
                    innerInput.style.setProperty('box-shadow', '0 0 0px 1000px rgba(30, 35, 50, 0.7) inset', 'important')
                  }
                }, 0)
              }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontWeight: 600, color: '#ffffff', fontSize: 12, letterSpacing: '0.5px' }}>密码</span>}
            name="password"
            rules={[{ required: true, message: '请输入密码!' }]}
            style={{ marginBottom: 20 }}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#a855f7' }} />}
              placeholder="请输入密码"
              autoComplete="current-password"
              style={{
                height: 44,
                borderRadius: 8,
                border: '2px solid rgba(168, 85, 247, 0.4)',
                fontSize: 14,
                paddingLeft: 14,
                backgroundColor: 'rgba(30, 35, 50, 0.7)',
                color: '#ffffff',
                transition: 'all 0.3s ease',
              }}
              styles={{
                input: {
                  backgroundColor: 'rgba(30, 35, 50, 0.7) !important',
                  color: '#ffffff !important',
                  WebkitTextFillColor: '#ffffff !important',
                  caretColor: '#ffffff !important',
                },
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#a855f7'
                e.target.style.boxShadow = '0 0 20px rgba(168, 85, 247, 0.4), inset 0 0 10px rgba(168, 85, 247, 0.15)'
                e.target.style.backgroundColor = 'rgba(30, 35, 50, 0.85)'
                const input = e.target as HTMLInputElement
                if (input) {
                  input.style.color = '#ffffff'
                  input.style.setProperty('color', '#ffffff', 'important')
                  input.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
                }
                // 确保内部input元素也设置颜色
                setTimeout(() => {
                  const allInputs = e.target.querySelectorAll('input')
                  allInputs.forEach((innerInput) => {
                    innerInput.style.color = '#ffffff'
                    innerInput.style.setProperty('color', '#ffffff', 'important')
                    innerInput.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
                    innerInput.style.setProperty('caret-color', '#ffffff', 'important')
                  })
                  const passwordInput = e.target.closest('.ant-input-password')?.querySelector('input')
                  if (passwordInput) {
                    passwordInput.style.color = '#ffffff'
                    passwordInput.style.setProperty('color', '#ffffff', 'important')
                    passwordInput.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
                    passwordInput.style.setProperty('caret-color', '#ffffff', 'important')
                  }
                }, 0)
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(168, 85, 247, 0.4)'
                e.target.style.boxShadow = 'none'
                e.target.style.backgroundColor = 'rgba(30, 35, 50, 0.7)'
                const input = e.target as HTMLInputElement
                if (input) {
                  input.style.color = '#ffffff'
                  input.style.setProperty('color', '#ffffff', 'important')
                  input.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
                }
                // 确保内部input元素也设置颜色
                setTimeout(() => {
                  const allInputs = e.target.querySelectorAll('input')
                  allInputs.forEach((innerInput) => {
                    innerInput.style.color = '#ffffff'
                    innerInput.style.setProperty('color', '#ffffff', 'important')
                    innerInput.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
                    innerInput.style.setProperty('caret-color', '#ffffff', 'important')
                  })
                  const passwordInput = e.target.closest('.ant-input-password')?.querySelector('input')
                  if (passwordInput) {
                    passwordInput.style.color = '#ffffff'
                    passwordInput.style.setProperty('color', '#ffffff', 'important')
                    passwordInput.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
                    passwordInput.style.setProperty('caret-color', '#ffffff', 'important')
                  }
                }, 0)
              }}
              onChange={(e) => {
                const input = e.target as HTMLInputElement
                if (input) {
                  input.style.color = '#ffffff'
                  input.style.setProperty('color', '#ffffff', 'important')
                  input.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
                }
                // 查找所有可能的 input 元素
                setTimeout(() => {
                  const allInputs = e.target.querySelectorAll('input')
                  allInputs.forEach((innerInput) => {
                    innerInput.style.color = '#ffffff'
                    innerInput.style.setProperty('color', '#ffffff', 'important')
                    innerInput.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
                    innerInput.style.setProperty('caret-color', '#ffffff', 'important')
                  })
                  // 也尝试直接查找密码输入框
                  const passwordInput = e.target.closest('.ant-input-password')?.querySelector('input')
                  if (passwordInput) {
                    passwordInput.style.color = '#ffffff'
                    passwordInput.style.setProperty('color', '#ffffff', 'important')
                    passwordInput.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important')
                    passwordInput.style.setProperty('caret-color', '#ffffff', 'important')
                  }
                }, 0)
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 44,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #00d9ff 0%, #0099cc 100%)',
                border: 'none',
                fontSize: 15,
                fontWeight: 600,
                color: '#ffffff',
                boxShadow: '0 0 30px rgba(0, 217, 255, 0.6), 0 6px 20px rgba(0, 217, 255, 0.4)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'
                e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 217, 255, 0.8), 0 8px 24px rgba(0, 217, 255, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 217, 255, 0.6), 0 6px 20px rgba(0, 217, 255, 0.4)'
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(0.98)'
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'
              }}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
      
      {/* 备案号 - 右下角 */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          fontSize: 11,
          color: 'rgba(255, 255, 255, 0.7)',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        备案号：沪ICP备2025154783号-1
      </div>
    </div>
  )
}

export default Login

