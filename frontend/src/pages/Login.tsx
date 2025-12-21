import { useState, useEffect, useRef } from 'react'
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
  const [displayError, setDisplayError] = useState<string | null>(null)
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 如果已经登录，重定向到dashboard
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  // 当error状态变化时，显示错误提示3秒后自动清除
  useEffect(() => {
    if (error) {
      // 清除之前的定时器（如果存在）
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current)
        errorTimerRef.current = null
      }
      
      // 直接设置错误消息
      setDisplayError(error)
      
      // 启动3秒定时器，3秒后自动清除
      errorTimerRef.current = setTimeout(() => {
        setDisplayError(null)
        dispatch(clearError())
        errorTimerRef.current = null
      }, 3000)
    }
    // 注意：当error为null时，不立即清除displayError，让定时器自然完成
    // 这样即使pending状态清除了error，displayError仍然会显示3秒

    // 清理函数：只在effect重新执行或组件卸载时清理
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current)
        errorTimerRef.current = null
      }
    }
  }, [error, dispatch])

  // 安全验证函数：防止SQL注入、XSS等攻击
  const sanitizeInput = (input: string): string => {
    // 移除或转义危险字符
    return input
      .replace(/[<>'"]/g, '') // 移除HTML标签和引号
      .replace(/[;\\]/g, '') // 移除SQL注入常用字符
      .trim()
  }

  // 验证用户名安全性
  const validateUsername = (value: string): boolean => {
    if (!value) return false
    
    // 长度限制
    if (value.length > 100) return false
    
    // 检查是否包含危险字符（SQL注入、XSS等）
    const dangerousPatterns = [
      /<script/i,
      /<\/script/i,
      /javascript:/i,
      /on\w+\s*=/i, // onclick, onerror等事件处理器
      /['";\\]/,
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i,
      /exec\s*\(/i,
      /--/,
      /\/\*/,
      /\*\//,
    ]
    
    return !dangerousPatterns.some(pattern => pattern.test(value))
  }

  // 验证密码安全性
  const validatePassword = (value: string): boolean => {
    if (!value) return false
    
    // 密码长度限制（最小6位，最大72位，bcrypt限制）
    if (value.length < 6 || value.length > 72) return false
    
    // 检查是否包含控制字符（不允许控制字符）
    if (/[\x00-\x1F\x7F]/.test(value)) return false
    
    // 检查SQL注入和XSS相关的危险关键词组合（但允许单独的引号等字符）
    const dangerousPatterns = [
      /<script/i,
      /<\/script/i,
      /javascript:/i,
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i,
      /exec\s*\(/i,
      /or\s+1\s*=\s*1/i,
      /and\s+1\s*=\s*1/i,
    ]
    
    return !dangerousPatterns.some(pattern => pattern.test(value))
  }

  const onLoginFinish = async (values: { username: string; password: string }) => {
    // 清除之前的错误提示和定时器，避免旧错误提示残留
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current)
      errorTimerRef.current = null
    }
    setDisplayError(null)
    // 注意：不在这里调用clearError()，让pending状态自动清除error
    // 这样可以确保错误提示的显示逻辑完全由useEffect控制
    
    // 安全验证
    if (!validateUsername(values.username)) {
      message.error('用户名包含非法字符，请检查输入')
      return
    }
    
    if (!validatePassword(values.password)) {
      message.error('密码格式不正确，长度应在6-72位之间，且不能包含特殊字符')
      return
    }
    
    // 清理输入
    const sanitizedValues = {
      username: sanitizeInput(values.username),
      password: values.password, // 密码不需要清理，因为可能需要特殊字符
    }
    
    try {
      await dispatch(loginAsync(sanitizedValues)).unwrap()
      message.success('登录成功')
      navigate('/dashboard')
    } catch (err: any) {
      // 错误信息会通过Redux error状态和Alert组件显示，不需要message.error
      // 只需要记录日志即可
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
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* 连接登录框的电路线 - 使用viewBox坐标（0-100）而不是百分比 */}
        <path
          d="M 50 50 L 30 20 M 50 50 L 70 30 M 50 50 L 20 80 M 50 50 L 80 70"
          stroke="#00d9ff"
          strokeWidth="0.2"
          fill="none"
          className="circuit-line"
          style={{ filter: 'drop-shadow(0 0 4px #00d9ff)' }}
        />
        {/* 电路节点 - 使用viewBox坐标 */}
        {[
          { x: 30, y: 20 },
          { x: 70, y: 30 },
          { x: 20, y: 80 },
          { x: 80, y: 70 },
        ].map((node, i) => (
          <circle
            key={i}
            cx={node.x}
            cy={node.y}
            r="0.4"
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
        

        {displayError && (
          <Alert
            message={<span style={{ color: '#ffffff', fontWeight: 500 }}>{displayError}</span>}
            type="error"
            showIcon
            closable
            onClose={() => {
              // 清除定时器
              if (errorTimerRef.current) {
                clearTimeout(errorTimerRef.current)
                errorTimerRef.current = null
              }
              setDisplayError(null)
              dispatch(clearError())
            }}
            style={{ 
              marginBottom: 24, 
              fontSize: 13,
              borderRadius: 12,
              border: '1px solid rgba(239, 68, 68, 0.5)',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ffffff',
            }}
            icon={
              <span style={{ color: '#ef4444', fontSize: 16 }}>×</span>
            }
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
            rules={[
              { required: true, message: '请输入用户名或邮箱!' },
              { max: 100, message: '用户名长度不能超过100个字符!' },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve()
                  }
                  if (!validateUsername(value)) {
                    return Promise.reject(new Error('用户名包含非法字符，请检查输入'))
                  }
                  return Promise.resolve()
                },
              },
            ]}
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
            rules={[
              { required: true, message: '请输入密码!' },
              { min: 6, message: '密码长度至少6位!' },
              { max: 72, message: '密码长度不能超过72位!' },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve()
                  }
                  if (!validatePassword(value)) {
                    return Promise.reject(new Error('密码格式不正确，不能包含危险字符组合'))
                  }
                  return Promise.resolve()
                },
              },
            ]}
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

