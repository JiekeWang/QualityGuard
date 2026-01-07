import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import { store } from './store'
import './index.css'
import './styles/theme-enhancements.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ConfigProvider 
        locale={zhCN}
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorBgBase: '#0f1419',
            colorBgContainer: '#1e2329',
            colorBgElevated: '#252b3a',
            colorText: '#e4e7eb',
            colorTextSecondary: '#9ca3af',
            colorTextTertiary: '#6b7280',
            colorBorder: '#2d3748',
            colorBorderSecondary: '#1e2329',
            colorPrimary: '#667eea',
            colorSuccess: '#10b981',
            colorWarning: '#f59e0b',
            colorError: '#ef4444',
            colorInfo: '#667eea',
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            boxShadowSecondary: '0 4px 16px rgba(0, 0, 0, 0.4)',
            // 字体大小优化
            fontSize: 13,
            fontSizeSM: 12,
            fontSizeLG: 14,
            fontSizeXL: 16,
            fontSizeHeading1: 20,
            fontSizeHeading2: 18,
            fontSizeHeading3: 16,
            fontSizeHeading4: 14,
            fontSizeHeading5: 13,
            // 输入框文字颜色配置
            colorTextPlaceholder: '#6b7280',
            colorTextHeading: '#ffffff',
            // 行高优化
            lineHeight: 1.5,
            lineHeightLG: 1.6,
            lineHeightSM: 1.4,
          },
          components: {
            Button: {
              fontSize: 13,
              paddingInline: 12,
              paddingBlock: 4,
              controlHeight: 32,
              borderRadius: 6,
            },
            Input: {
              fontSize: 13,
              paddingInline: 10,
              paddingBlock: 4,
              controlHeight: 32,
              colorText: '#e4e7eb',
              colorTextPlaceholder: '#9ca3af',
              colorBgContainer: 'rgba(15, 20, 25, 0.5)',
              colorBorder: 'rgba(148, 163, 184, 0.1)',
              colorBorderHover: 'rgba(102, 126, 234, 0.3)',
              colorPrimaryHover: '#667eea',
              activeBorderColor: '#667eea',
            },
            InputNumber: {
              fontSize: 13,
              paddingInline: 10,
              paddingBlock: 4,
              controlHeight: 32,
              colorText: '#e4e7eb',
              colorTextPlaceholder: '#9ca3af',
              colorBgContainer: 'rgba(15, 20, 25, 0.5)',
              colorBorder: 'rgba(148, 163, 184, 0.1)',
            },
            TextArea: {
              fontSize: 13,
              paddingInline: 10,
              paddingBlock: 6,
              colorText: '#e4e7eb',
              colorTextPlaceholder: '#9ca3af',
              colorBgContainer: 'rgba(15, 20, 25, 0.5)',
              colorBorder: 'rgba(148, 163, 184, 0.1)',
              // 确保 rows 属性生效
              controlHeight: undefined, // 不设置固定高度，让 rows 控制
            },
            Select: {
              fontSize: 13,
              paddingInline: 10,
              paddingBlock: 4,
              controlHeight: 32,
              // Select 输入框本身的颜色 - 深色主题
              colorText: '#e4e7eb',
              colorTextPlaceholder: '#9ca3af',
              colorBgContainer: 'rgba(15, 20, 25, 0.5)',
              colorBorder: 'rgba(148, 163, 184, 0.1)',
              // 下拉框选项的颜色配置 - 深色主题
              colorBgElevated: '#252b3a',  // 下拉框背景：深色
              optionSelectedBg: 'rgba(102, 126, 234, 0.2)',  // 选中项背景：浅蓝色
              optionActiveBg: 'rgba(102, 126, 234, 0.1)',  // 悬停项背景：更浅的蓝色
              optionSelectedColor: '#e4e7eb',  // 选中项文字：浅色
              colorTextQuaternary: '#e4e7eb',  // 选项文字颜色：浅色
            },
            Table: {
              fontSize: 13,
              padding: 8,
              paddingContentVertical: 8,
              paddingContentHorizontal: 12,
            },
            Form: {
              labelFontSize: 13,
            },
            Modal: {
              fontSize: 13,
              paddingContentHorizontal: 20,
              paddingContentVertical: 16,
            },
            Card: {
              fontSize: 13,
              paddingLG: 16,
            },
            Menu: {
              fontSize: 13,
              itemHeight: 40,
            },
            Message: {
              contentBg: '#252b3a',
              colorText: '#e4e7eb',
              colorSuccess: '#10b981',
              colorError: '#ef4444',
              colorWarning: '#f59e0b',
              colorInfo: '#667eea',
            },
          },
        }}
      >
        <App />
      </ConfigProvider>
    </Provider>
  </React.StrictMode>,
)

