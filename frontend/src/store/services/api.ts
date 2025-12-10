import axios from 'axios'

// 根据环境变量或默认值设置 API 地址
const getApiBaseURL = () => {
  // 生产环境使用环境变量，开发环境使用代理
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || '/api/v1'
  }
  return '/api/v1'
}

export const api = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // TODO: 添加token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // TODO: 处理未授权
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

