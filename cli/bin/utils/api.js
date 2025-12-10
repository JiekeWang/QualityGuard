const axios = require('axios')
const fs = require('fs')
const path = require('path')
const os = require('os')

const configPath = path.join(os.homedir(), '.qualityguard', 'config.json')

// 读取配置
function getConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'))
    }
  } catch (error) {
    // 忽略错误
  }
  return {
    apiUrl: process.env.QG_API_URL || 'http://localhost:8000/api/v1',
    token: process.env.QG_TOKEN || '',
  }
}

const config = getConfig()

const apiClient = axios.create({
  baseURL: config.apiUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use((config) => {
  if (config.token) {
    config.headers.Authorization = `Bearer ${config.token}`
  }
  return config
})

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('认证失败，请检查token配置')
    }
    return Promise.reject(error)
  }
)

module.exports = {
  apiClient,
  getConfig,
}

