/**
 * cURL 解析工具
 * 将 cURL 命令解析为请求配置对象
 */

export interface ParsedCurl {
  url: string
  method: string
  headers: Record<string, string>
  body: any
  params: Record<string, string>
}

/**
 * 解析 cURL 命令
 * @param curlCommand cURL 命令字符串
 * @returns 解析后的请求配置
 */
export function parseCurl(curlCommand: string): ParsedCurl | null {
  try {
    // 移除换行符和多余空格
    let curl = curlCommand.trim().replace(/\\\n/g, ' ').replace(/\s+/g, ' ')
    
    // 移除 curl 命令开头
    curl = curl.replace(/^curl\s+/i, '')
    
    const result: ParsedCurl = {
      url: '',
      method: 'GET',
      headers: {},
      body: null,
      params: {}
    }
    
    // 提取 URL
    const urlMatch = curl.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/)
    if (urlMatch) {
      const fullUrl = urlMatch[1]
      result.url = fullUrl
      
      // 分离 URL 和查询参数
      if (fullUrl.includes('?')) {
        const [baseUrl, queryString] = fullUrl.split('?')
        result.url = baseUrl
        
        // 解析查询参数
        const params = new URLSearchParams(queryString)
        params.forEach((value, key) => {
          result.params[key] = value
        })
      }
    }
    
    // 提取请求方法
    const methodMatch = curl.match(/-X\s+([A-Z]+)/i)
    if (methodMatch) {
      result.method = methodMatch[1].toUpperCase()
    }
    
    // 提取请求头
    const headerRegex = /-H\s+['"]([^:]+):\s*([^'"]+)['"]/g
    let headerMatch
    while ((headerMatch = headerRegex.exec(curl)) !== null) {
      const key = headerMatch[1].trim()
      const value = headerMatch[2].trim()
      result.headers[key] = value
    }
    
    // 提取请求体
    // 处理多个 --data 参数（表单数据格式）
    const dataMatches = curl.matchAll(/--data(?:-raw|-binary)?\s+([^\s\\]+)/g)
    const dataArray: string[] = []
    for (const match of dataMatches) {
      dataArray.push(match[1].trim().replace(/^['"]|['"]$/g, ''))
    }
    
    if (dataArray.length > 0) {
      // 如果有多个 --data 参数，合并为表单数据格式
      if (dataArray.length > 1) {
        // 多个参数，格式为 key=value，合并为对象
        const formData: Record<string, string> = {}
        for (const data of dataArray) {
          const [key, ...valueParts] = data.split('=')
          if (key && valueParts.length > 0) {
            formData[key.trim()] = valueParts.join('=').trim()
          }
        }
        result.body = formData
        // 如果没有设置 Content-Type，默认为表单格式
        if (!result.headers['Content-Type'] && !result.headers['content-type']) {
          result.headers['Content-Type'] = 'application/x-www-form-urlencoded'
        }
      } else {
        // 单个参数
        const dataStr = dataArray[0]
        try {
          // 尝试解析为 JSON
          result.body = JSON.parse(dataStr)
        } catch {
          // 如果不是 JSON，检查是否是 key=value 格式
          if (dataStr.includes('=')) {
            const [key, ...valueParts] = dataStr.split('=')
            if (key && valueParts.length > 0) {
              result.body = { [key.trim()]: valueParts.join('=').trim() }
              if (!result.headers['Content-Type'] && !result.headers['content-type']) {
                result.headers['Content-Type'] = 'application/x-www-form-urlencoded'
              }
            } else {
              result.body = dataStr
            }
          } else {
            result.body = dataStr
          }
        }
      }
    }
    
    // 处理 -d 或 --data 参数（简写形式，如果没有找到 --data）
    if (!result.body) {
      const shortDataMatches = curl.matchAll(/-d\s+([^\s\\]+)/g)
      const shortDataArray: string[] = []
      for (const match of shortDataMatches) {
        shortDataArray.push(match[1].trim().replace(/^['"]|['"]$/g, ''))
      }
      
      if (shortDataArray.length > 0) {
        if (shortDataArray.length > 1) {
          // 多个参数
          const formData: Record<string, string> = {}
          for (const data of shortDataArray) {
            const [key, ...valueParts] = data.split('=')
            if (key && valueParts.length > 0) {
              formData[key.trim()] = valueParts.join('=').trim()
            }
          }
          result.body = formData
          if (!result.headers['Content-Type'] && !result.headers['content-type']) {
            result.headers['Content-Type'] = 'application/x-www-form-urlencoded'
          }
        } else {
          const dataStr = shortDataArray[0]
          try {
            result.body = JSON.parse(dataStr)
          } catch {
            if (dataStr.includes('=')) {
              const [key, ...valueParts] = dataStr.split('=')
              if (key && valueParts.length > 0) {
                result.body = { [key.trim()]: valueParts.join('=').trim() }
                if (!result.headers['Content-Type'] && !result.headers['content-type']) {
                  result.headers['Content-Type'] = 'application/x-www-form-urlencoded'
                }
              } else {
                result.body = dataStr
              }
            } else {
              result.body = dataStr
            }
          }
        }
      }
    }
    
    // 如果没有找到 URL，返回 null
    if (!result.url) {
      return null
    }
    
    // 如果没有明确指定 method 但有 body，默认为 POST
    if (result.body && result.method === 'GET') {
      result.method = 'POST'
    }
    
    return result
  } catch (error) {
    console.error('解析 cURL 命令失败:', error)
    return null
  }
}

/**
 * 从解析的 cURL 生成 token_config
 * @param parsed 解析后的 cURL 对象
 * @param tokenPath JSONPath 路径（用于提取 token）
 * @returns token_config 配置对象
 */
export function generateTokenConfig(
  parsed: ParsedCurl,
  tokenPath: string = '$.data.token'
): any {
  // 清理 headers：移除一些不必要的浏览器相关 headers
  // 但保留重要的 headers（如 Content-Type、Authorization 等）
  const cleanedHeaders: Record<string, string> = {}
  const headersToKeep = [
    'content-type',
    'authorization',
    'accept',
    'accept-encoding',
    'x-requested-with',
    'origin',
    'referer'
  ]
  
  for (const [key, value] of Object.entries(parsed.headers)) {
    const lowerKey = key.toLowerCase()
    // 保留重要的 headers，移除浏览器相关的 headers
    if (
      headersToKeep.includes(lowerKey) ||
      lowerKey.startsWith('x-') ||
      lowerKey === 'authorization'
    ) {
      cleanedHeaders[key] = value
    }
  }
  
  // 如果没有 Content-Type 但 body 是对象，自动添加
  if (parsed.body && typeof parsed.body === 'object' && !Array.isArray(parsed.body)) {
    const hasContentType = Object.keys(cleanedHeaders).some(
      k => k.toLowerCase() === 'content-type'
    )
    if (!hasContentType) {
      // 检查 body 是否是表单数据格式
      const isFormData = Object.values(parsed.body).every(v => typeof v === 'string')
      if (isFormData) {
        cleanedHeaders['Content-Type'] = 'application/x-www-form-urlencoded'
      } else {
        cleanedHeaders['Content-Type'] = 'application/json'
      }
    }
  }
  
  const tokenConfig = {
    url: parsed.url,
    method: parsed.method,
    headers: cleanedHeaders,
    body: parsed.body,
    params: Object.keys(parsed.params).length > 0 ? parsed.params : undefined,
    extractors: [
      {
        name: 'token',
        type: 'json',
        path: tokenPath
      }
    ],
    retry_status_codes: [401, 403]
  }
  
  console.log('[调试] 生成的 token_config:', JSON.stringify(tokenConfig, null, 2))
  
  return tokenConfig
}

/**
 * 示例 cURL 命令用于测试
 */
export const exampleCurls = {
  basic: `curl 'https://api.example.com/login' \\
  -H 'Content-Type: application/json' \\
  --data-raw '{"username":"admin","password":"123456"}'`,
  
  withHeaders: `curl 'https://api.example.com/auth/token' \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -H 'User-Agent: Mozilla/5.0' \\
  -H 'Accept: application/json' \\
  --data-raw '{"grant_type":"password","username":"user","password":"pass"}'`,
  
  withParams: `curl 'https://api.example.com/oauth/token?client_id=abc123&client_secret=xyz789' \\
  -X POST \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  --data 'grant_type=client_credentials'`
}

