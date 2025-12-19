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
    const dataMatch = curl.match(/--data(?:-raw|-binary)?\s+['"](.+?)['"]/s)
    if (dataMatch) {
      try {
        // 尝试解析为 JSON
        result.body = JSON.parse(dataMatch[1])
      } catch {
        // 如果不是 JSON，保持原始字符串
        result.body = dataMatch[1]
      }
    }
    
    // 处理 -d 或 --data 参数（简写形式）
    if (!result.body) {
      const shortDataMatch = curl.match(/-d\s+['"](.+?)['"]/s)
      if (shortDataMatch) {
        try {
          result.body = JSON.parse(shortDataMatch[1])
        } catch {
          result.body = shortDataMatch[1]
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
  return {
    url: parsed.url,
    method: parsed.method,
    headers: parsed.headers,
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

