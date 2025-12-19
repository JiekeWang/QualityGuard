import { useState, useEffect } from 'react'
import { Layout, Menu, Dropdown, Avatar, message } from 'antd'
import {
  DashboardOutlined,
  ProjectOutlined,
  ApiOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
  RobotOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { getCurrentUserAsync, logoutAsync } from '../../store/slices/authSlice'

const { Header, Sider, Content } = Layout

interface AppLayoutProps {
  children: React.ReactNode
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<any[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  // 目前未使用 Ant Design 主题 token，这里保留默认主题配置

  useEffect(() => {
    // 如果token存在但没有用户信息，获取用户信息
    const token = localStorage.getItem('token')
    if (token && !user) {
      dispatch(getCurrentUserAsync()).catch((error) => {
        console.error('获取用户信息失败:', error)
        // 如果获取用户信息失败，可能是token过期，清除token
        if (error?.response?.status === 401) {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
        }
      })
    }
  }, [dispatch, user])

  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap()
      message.success('已退出登录')
      navigate('/login')
    } catch (error) {
      console.error('登出失败:', error)
      navigate('/login')
    }
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      handleLogout()
    } else if (key === 'profile') {
      navigate('/personal')
    }
  }

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: '项目管理',
    },
    {
      key: '/api-testing',
      icon: <ApiOutlined />,
      label: 'API测试',
      children: [
        // 第一步：接口管理
        {
          key: '/api-testing/interfaces',
          label: '接口仓库',
        },
        {
          type: 'divider' as const,
        },
        // 第二步：用例组织和管理
        {
          key: '/api-testing/test-cases',
          label: '测试用例',
        },
        {
          key: '/api-testing/modules',
          label: '模块管理',
        },
        {
          key: '/api-testing/directories',
          label: '目录管理',
        },
        {
          type: 'divider' as const,
        },
        // 第三步：测试配置
        {
          key: '/api-testing/assertion-libraries',
          label: '预设断言库',
        },
        {
          key: '/api-testing/data-drivers',
          label: '数据驱动配置',
        },
        {
          type: 'divider' as const,
        },
        // 第四步：用例评审（执行前评审）
        {
          key: '/api-testing/test-case-reviews',
          label: '用例评审',
        },
        {
          type: 'divider' as const,
        },
        // 第五步：测试执行
        {
          key: '/api-testing/test-executions',
          label: '测试执行',
        },
        {
          key: '/api-testing/test-scenes',
          label: '测试场景',
        },
        {
          type: 'divider' as const,
        },
        // 第六步：结果查看
        {
          key: '/api-testing/reports',
          label: '测试报告',
        },
        {
          type: 'divider' as const,
        },
        // 辅助功能
        {
          key: '/api-testing/mock',
          label: 'Mock服务',
        },
      ],
    },
    {
      key: '/quick-test',
      icon: <ThunderboltOutlined />,
      label: '快速测试',
    },
    {
      key: '/performance',
      icon: <LineChartOutlined />,
      label: '性能测试',
    },
    {
      key: '/ui-automation',
      icon: <RobotOutlined />,
      label: 'UI自动化',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: [
        {
          key: '/settings',
          label: '系统配置',
        },
        {
          key: '/settings/environments',
          label: '环境管理',
        },
      ],
    },
  ]

  // 根据当前路径高亮菜单项
  const getSelectedKeys = () => {
    const path = location.pathname
    // 精确匹配或包含匹配
    for (const item of menuItems) {
      if (path === item.key || path.startsWith(item.key + '/')) {
        return [item.key as string]
      }
      // 检查子菜单
      if (item.children) {
        for (const child of item.children) {
          if (path === child.key || path.startsWith(child.key + '/')) {
            return [child.key as string]
          }
        }
      }
    }
    return [] as string[]
  }

  // 获取应该展开的菜单
  useEffect(() => {
    const path = location.pathname
    for (const item of menuItems) {
      if (item.children && path.startsWith(item.key + '/')) {
        setOpenKeys([item.key])
        return
      }
    }
  }, [location.pathname])

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        style={{ 
          background: 'linear-gradient(180deg, #1e2329 0%, #252b3a 100%)',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: collapsed ? 14 : 16,
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 4,
          }}
        >
          {collapsed ? 'QG' : 'QualityGuard'}
        </div>
        {/* onOpenChange 这里类型比较宽，直接复用 setOpenKeys，避免不必要的类型转换 */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          openKeys={openKeys}
          onOpenChange={setOpenKeys as any}
          items={menuItems}
          onClick={({ key }) => navigate(key as string)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 16px',
            height: 56,
            background: 'linear-gradient(135deg, #1e2329 0%, #252b3a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <h2 style={{ 
            margin: 0, 
            color: '#e4e7eb',
            fontWeight: 600,
            fontSize: 16,
            whiteSpace: 'nowrap',
          }}>自动化测试平台</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {user && (
              <>
                <span style={{ color: '#9ca3af', fontSize: 13, whiteSpace: 'nowrap' }}>{user.username}</span>
                <Dropdown
                  menu={{ items: userMenuItems, onClick: handleMenuClick }}
                  placement="bottomRight"
                >
                  <Avatar
                    size={32}
                    style={{ cursor: 'pointer', flexShrink: 0 }}
                    icon={<UserOutlined />}
                  />
                </Dropdown>
              </>
            )}
          </div>
        </Header>
        <Content
          style={{
            margin: '16px',
            padding: 0,
            minHeight: 280,
            background: 'transparent',
            overflow: 'hidden',
            width: 'calc(100% - 32px)',
            maxWidth: '100%',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout

