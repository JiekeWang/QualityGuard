/**
 * 用例导入导出工具
 */

export interface TestCaseData {
  name: string
  description?: string
  project_id?: number
  test_type?: string
  tags?: string[]
  steps?: any[]
  config?: any
  method?: string
  path?: string
  headers?: Record<string, string>
  params?: Record<string, any>
  body?: any
}

/**
 * 解析Postman Collection格式
 */
export function parsePostmanCollection(data: any): TestCaseData[] {
  const cases: TestCaseData[] = []
  
  if (!data || !data.item) {
    throw new Error('无效的Postman Collection格式')
  }
  
  const parseItem = (item: any, folderName?: string): void => {
    if (item.request) {
      // 这是一个请求
      const request = item.request
      const method = request.method || 'GET'
      const url = request.url
      let path = ''
      let params: Record<string, any> = {}
      
      if (typeof url === 'string') {
        const urlObj = new URL(url)
        path = urlObj.pathname
        urlObj.searchParams.forEach((value, key) => {
          params[key] = value
        })
      } else if (url && url.raw) {
        try {
          const urlObj = new URL(url.raw)
          path = urlObj.pathname
          urlObj.searchParams.forEach((value, key) => {
            params[key] = value
          })
        } catch (e) {
          path = url.path?.join('/') || url.raw || ''
        }
      } else if (url && url.path) {
        path = '/' + (Array.isArray(url.path) ? url.path.join('/') : url.path)
        if (url.query) {
          url.query.forEach((q: any) => {
            if (q.key) {
              params[q.key] = q.value || ''
            }
          })
        }
      }
      
      const headers: Record<string, string> = {}
      if (request.header) {
        request.header.forEach((h: any) => {
          if (h.key && h.value) {
            headers[h.key] = h.value
          }
        })
      }
      
      let body: any = null
      if (request.body) {
        if (request.body.mode === 'raw' && request.body.raw) {
          try {
            body = JSON.parse(request.body.raw)
          } catch (e) {
            body = request.body.raw
          }
        } else if (request.body.mode === 'formdata' && request.body.formdata) {
          body = {}
          request.body.formdata.forEach((f: any) => {
            if (f.key) {
              body[f.key] = f.value || ''
            }
          })
        } else if (request.body.mode === 'urlencoded' && request.body.urlencoded) {
          body = {}
          request.body.urlencoded.forEach((f: any) => {
            if (f.key) {
              body[f.key] = f.value || ''
            }
          })
        }
      }
      
      // 解析测试脚本（断言）
      const assertions: any[] = []
      if (item.event) {
        item.event.forEach((event: any) => {
          if (event.listen === 'test' && event.script && event.script.exec) {
            const script = event.script.exec.join('\n')
            // 尝试提取断言
            if (script.includes('pm.response.to.have.status')) {
              const statusMatch = script.match(/pm\.response\.to\.have\.status\((\d+)\)/)
              if (statusMatch) {
                assertions.push({
                  type: 'status_code',
                  expected: parseInt(statusMatch[1])
                })
              }
            }
            if (script.includes('pm.response.json()')) {
              assertions.push({
                type: 'script',
                script: script
              })
            }
          }
        })
      }
      
      cases.push({
        name: item.name || `${method} ${path}`,
        description: item.description || folderName ? `来自文件夹: ${folderName}` : undefined,
        test_type: 'api',
        method: method,
        path: path,
        headers: headers,
        params: params,
        body: body,
        config: {
          assertions: assertions.length > 0 ? assertions : undefined,
          timeout: 30,
        },
        steps: [{
          method: method,
          path: path,
          headers: headers,
          params: params,
          body: body,
        }],
      })
    } else if (item.item) {
      // 这是一个文件夹，递归处理
      item.item.forEach((subItem: any) => {
        parseItem(subItem, item.name || folderName)
      })
    }
  }
  
  data.item.forEach((item: any) => {
    parseItem(item)
  })
  
  return cases
}

/**
 * 解析Swagger/OpenAPI格式
 */
export function parseSwagger(data: any): TestCaseData[] {
  const cases: TestCaseData[] = []
  
  if (!data || !data.paths) {
    throw new Error('无效的Swagger/OpenAPI格式')
  }
  
  const paths = data.paths || {}
  const basePath = data.basePath || ''
  const servers = data.servers || []
  const baseUrl = servers.length > 0 ? servers[0].url : ''
  
  Object.keys(paths).forEach(path => {
    const pathItem = paths[path]
    const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options']
    
    methods.forEach(method => {
      if (pathItem[method]) {
        const operation = pathItem[method]
        const fullPath = basePath + path
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }
        
        const params: Record<string, any> = {}
        if (operation.parameters) {
          operation.parameters.forEach((param: any) => {
            if (param.in === 'query' || param.in === 'path') {
              params[param.name] = param.example || param.default || ''
            } else if (param.in === 'header') {
              headers[param.name] = param.example || param.default || ''
            }
          })
        }
        
        let body: any = null
        if (operation.requestBody) {
          const content = operation.requestBody.content
          if (content && content['application/json'] && content['application/json'].schema) {
            // 生成示例body
            body = generateExampleFromSchema(content['application/json'].schema)
          }
        }
        
        // 解析响应断言
        const assertions: any[] = []
        if (operation.responses) {
          const successCode = Object.keys(operation.responses).find(code => 
            code.startsWith('2') || code === '200' || code === '201'
          )
          if (successCode) {
            assertions.push({
              type: 'status_code',
              expected: parseInt(successCode)
            })
          }
        }
        
        cases.push({
          name: operation.summary || operation.operationId || `${method.toUpperCase()} ${fullPath}`,
          description: operation.description,
          test_type: 'api',
          method: method.toUpperCase(),
          path: fullPath,
          headers: headers,
          params: params,
          body: body,
          config: {
            assertions: assertions.length > 0 ? assertions : undefined,
            timeout: 30,
          },
          steps: [{
            method: method.toUpperCase(),
            path: fullPath,
            headers: headers,
            params: params,
            body: body,
          }],
        })
      }
    })
  })
  
  return cases
}

/**
 * 从Schema生成示例数据
 */
function generateExampleFromSchema(schema: any): any {
  if (schema.example) {
    return schema.example
  }
  
  if (schema.type === 'object' && schema.properties) {
    const example: any = {}
    Object.keys(schema.properties).forEach(key => {
      const prop = schema.properties[key]
      if (prop.example !== undefined) {
        example[key] = prop.example
      } else if (prop.default !== undefined) {
        example[key] = prop.default
      } else if (prop.type === 'string') {
        example[key] = ''
      } else if (prop.type === 'number' || prop.type === 'integer') {
        example[key] = 0
      } else if (prop.type === 'boolean') {
        example[key] = false
      } else if (prop.type === 'array') {
        example[key] = []
      } else if (prop.type === 'object') {
        example[key] = {}
      }
    })
    return example
  }
  
  return {}
}

/**
 * 解析Excel文件（简化版，需要xlsx库）
 */
export async function parseExcel(file: File): Promise<TestCaseData[]> {
  try {
    // 动态导入xlsx库
    const XLSX = await import('xlsx')
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const cases: TestCaseData[] = []
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      
      jsonData.forEach((row: any) => {
        cases.push({
          name: row['用例名称'] || row['name'] || `导入用例_${Date.now()}`,
          description: row['用例描述'] || row['description'] || '',
          test_type: row['测试类型'] || row['test_type'] || 'api',
          tags: row['标签'] || row['tags'] ? (typeof row['标签'] === 'string' ? row['标签'].split(',') : row['tags']) : [],
          method: row['请求方法'] || row['method'] || 'GET',
          path: row['接口路径'] || row['path'] || '',
          headers: row['请求头'] || row['headers'] ? (typeof row['请求头'] === 'string' ? JSON.parse(row['请求头']) : row['headers']) : {},
          params: row['查询参数'] || row['params'] ? (typeof row['查询参数'] === 'string' ? JSON.parse(row['查询参数']) : row['params']) : {},
          body: row['请求体'] || row['body'] ? (typeof row['请求体'] === 'string' ? JSON.parse(row['请求体']) : row['body']) : null,
          steps: [{
            method: row['请求方法'] || row['method'] || 'GET',
            path: row['接口路径'] || row['path'] || '',
            headers: row['请求头'] || row['headers'] ? (typeof row['请求头'] === 'string' ? JSON.parse(row['请求头']) : row['headers']) : {},
            params: row['查询参数'] || row['params'] ? (typeof row['查询参数'] === 'string' ? JSON.parse(row['查询参数']) : row['params']) : {},
            body: row['请求体'] || row['body'] ? (typeof row['请求体'] === 'string' ? JSON.parse(row['请求体']) : row['body']) : null,
          }],
          config: {
            timeout: row['超时时间'] || row['timeout'] || 30,
            retry_count: row['重试次数'] || row['retry_count'] || 0,
          },
        })
      })
    })
    
    return cases
  } catch (error: any) {
    if (error.message && error.message.includes('xlsx')) {
      throw new Error('Excel导入功能需要安装xlsx库，请运行: npm install xlsx')
    }
    throw error
  }
}

/**
 * 转换为Postman Collection格式
 */
export function convertToPostmanCollection(cases: TestCaseData[]): any {
  const items = cases.map(testCase => {
    const request: any = {
      method: testCase.method || 'GET',
      header: [],
      url: {
        raw: testCase.path || '',
        path: (testCase.path || '').split('/').filter(Boolean),
        query: [],
      },
    }
    
    // 添加headers
    if (testCase.headers) {
      Object.keys(testCase.headers).forEach(key => {
        request.header.push({
          key: key,
          value: testCase.headers![key],
        })
      })
    }
    
    // 添加query参数
    if (testCase.params) {
      Object.keys(testCase.params).forEach(key => {
        request.url.query.push({
          key: key,
          value: String(testCase.params![key]),
        })
      })
    }
    
    // 添加body
    if (testCase.body) {
      request.body = {
        mode: 'raw',
        raw: JSON.stringify(testCase.body, null, 2),
        options: {
          raw: {
            language: 'json',
          },
        },
      }
    }
    
    // 添加测试脚本
    const testScript: string[] = []
    if (testCase.config?.assertions) {
      testCase.config.assertions.forEach((assertion: any) => {
        if (assertion.type === 'status_code') {
          testScript.push(`pm.test("Status code is ${assertion.expected}", function () {`)
          testScript.push(`    pm.response.to.have.status(${assertion.expected});`)
          testScript.push(`});`)
        }
      })
    }
    
    return {
      name: testCase.name,
      request: request,
      event: testScript.length > 0 ? [{
        listen: 'test',
        script: {
          exec: testScript,
          type: 'text/javascript',
        },
      }] : [],
    }
  })
  
  return {
    info: {
      name: 'QualityGuard Test Cases',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
  }
}

/**
 * 转换为Excel格式（需要xlsx库）
 */
export async function convertToExcel(cases: TestCaseData[]): Promise<Blob> {
  try {
    const XLSX = await import('xlsx')
    
    const data = cases.map(testCase => ({
      '用例名称': testCase.name,
      '用例描述': testCase.description || '',
      '测试类型': testCase.test_type || 'api',
      '请求方法': testCase.method || 'GET',
      '接口路径': testCase.path || '',
      '请求头': testCase.headers ? JSON.stringify(testCase.headers) : '',
      '查询参数': testCase.params ? JSON.stringify(testCase.params) : '',
      '请求体': testCase.body ? JSON.stringify(testCase.body) : '',
      '标签': testCase.tags ? testCase.tags.join(',') : '',
      '超时时间': testCase.config?.timeout || 30,
      '重试次数': testCase.config?.retry_count || 0,
    }))
    
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '测试用例')
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  } catch (error: any) {
    if (error.message && error.message.includes('xlsx')) {
      throw new Error('Excel导出功能需要安装xlsx库，请运行: npm install xlsx')
    }
    throw error
  }
}

/**
 * 转换为HTML格式
 */
export function convertToHTML(cases: TestCaseData[]): string {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试用例导出报告</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 {
            color: #1890ff;
            border-bottom: 2px solid #1890ff;
            padding-bottom: 10px;
        }
        .case {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #e8e8e8;
            border-radius: 4px;
            background: #fafafa;
        }
        .case-header {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .case-info {
            margin: 5px 0;
            color: #666;
        }
        .case-info strong {
            color: #333;
        }
        .method {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: bold;
            margin-right: 10px;
        }
        .method.GET { background: #52c41a; color: white; }
        .method.POST { background: #1890ff; color: white; }
        .method.PUT { background: #faad14; color: white; }
        .method.DELETE { background: #f5222d; color: white; }
        .method.PATCH { background: #722ed1; color: white; }
        pre {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
        }
        .tag {
            display: inline-block;
            padding: 2px 8px;
            background: #e6f7ff;
            color: #1890ff;
            border-radius: 4px;
            margin-right: 5px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>测试用例导出报告</h1>
        <p>导出时间: ${new Date().toLocaleString('zh-CN')}</p>
        <p>用例总数: ${cases.length}</p>
        ${cases.map((testCase, index) => `
        <div class="case">
            <div class="case-header">
                <span class="method ${testCase.method || 'GET'}">${testCase.method || 'GET'}</span>
                ${testCase.name}
            </div>
            ${testCase.description ? `<div class="case-info"><strong>描述:</strong> ${testCase.description}</div>` : ''}
            ${testCase.path ? `<div class="case-info"><strong>路径:</strong> ${testCase.path}</div>` : ''}
            ${testCase.tags && testCase.tags.length > 0 ? `
            <div class="case-info">
                <strong>标签:</strong>
                ${testCase.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            ` : ''}
            ${testCase.headers ? `
            <div class="case-info">
                <strong>请求头:</strong>
                <pre>${JSON.stringify(testCase.headers, null, 2)}</pre>
            </div>
            ` : ''}
            ${testCase.params ? `
            <div class="case-info">
                <strong>查询参数:</strong>
                <pre>${JSON.stringify(testCase.params, null, 2)}</pre>
            </div>
            ` : ''}
            ${testCase.body ? `
            <div class="case-info">
                <strong>请求体:</strong>
                <pre>${JSON.stringify(testCase.body, null, 2)}</pre>
            </div>
            ` : ''}
            ${testCase.config?.assertions ? `
            <div class="case-info">
                <strong>断言:</strong>
                <pre>${JSON.stringify(testCase.config.assertions, null, 2)}</pre>
            </div>
            ` : ''}
        </div>
        `).join('')}
    </div>
</body>
</html>
  `
  return html
}

