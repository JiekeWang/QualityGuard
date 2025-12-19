import { useEffect, useState, useRef } from 'react'
import { Table, Button, Tag, Modal, message, Card, Row, Col, Statistic, Tabs, Dropdown, Input } from 'antd'
import { DownloadOutlined, EyeOutlined, ShareAltOutlined, DownOutlined } from '@ant-design/icons'
import { reportService, ReportSummary, ReportDetail } from '../store/services/report'
import dayjs from 'dayjs'

const { TextArea } = Input

const Reports: React.FC = () => {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [currentReport, setCurrentReport] = useState<ReportDetail | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedText, setSelectedText] = useState('')
  const responseTextAreaRef = useRef<any>(null)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      setLoading(true)
      const data = await reportService.getReports()
      setReports(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error('加载报告列表失败:', error)
      message.error('加载报告列表失败: ' + (error.response?.data?.detail || error.message))
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  const handleView = async (record: ReportSummary) => {
    try {
      const detail = await reportService.getReport(record.id)
      setCurrentReport(detail)
      setDetailVisible(true)
    } catch (error: any) {
      console.error('加载报告详情失败:', error)
      message.error('加载报告详情失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDownload = async (record: ReportSummary, format: 'html' | 'doc' = 'html') => {
    try {
      const { content } = await reportService.exportReport(record.id, format)
      const blob = new Blob([content], {
        type: format === 'html' ? 'text/html;charset=utf-8;' : 'application/msword',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report-${record.id}.${format}`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('导出报告失败:', error)
      message.error('导出报告失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleShare = async (record: ReportSummary) => {
    try {
      const base = window.location.origin
      // 这里假设前端路由中有 /reports 页面，可通过查询参数指定报告
      const url = `${base}/#/reports?reportId=${record.id}`

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = url
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }

      message.success('分享链接已复制到剪贴板')
    } catch (error: any) {
      console.error('复制分享链接失败:', error)
      message.error('复制分享链接失败: ' + (error.message || '未知错误'))
    }
  }

  const columns = [
    {
      title: '报告ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '执行ID',
      dataIndex: 'execution_id',
      key: 'execution_id',
      width: 100,
    },
    {
      title: '项目ID',
      dataIndex: 'project_id',
      key: 'project_id',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          pending: 'default',
          running: 'processing',
          passed: 'success',
          failed: 'error',
          cancelled: 'warning',
          error: 'error',
        }
        const labelMap: Record<string, string> = {
          pending: '待执行',
          running: '执行中',
          passed: '通过',
          failed: '失败',
          cancelled: '已取消',
          error: '错误',
        }
        return <Tag color={colorMap[status] || 'default'}>{labelMap[status] || status}</Tag>
      },
    },
    {
      title: '生成时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) =>
        time ? dayjs(time).add(8, 'hour').format('YYYY/MM/DD HH:mm:ss') : '-',
    },
    {
      title: '通过/总数',
      key: 'summary',
      render: (_: any, record: ReportSummary) => {
        const total = record.summary?.total ?? 1
        const passed = record.summary?.passed ?? (record.status === 'passed' ? 1 : 0)
        return `${passed}/${total}`
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: any, record: ReportSummary) => {
        const items = [
          {
            key: 'view',
            label: (
              <span>
                <EyeOutlined style={{ marginRight: 4 }} />
                查看
              </span>
            ),
          },
          {
            key: 'html',
            label: (
              <span>
                <DownloadOutlined style={{ marginRight: 4 }} />
                下载 HTML
              </span>
            ),
          },
          {
            key: 'doc',
            label: (
              <span>
                <DownloadOutlined style={{ marginRight: 4 }} />
                下载 DOC
              </span>
            ),
          },
          {
            key: 'share',
            label: (
              <span>
                <ShareAltOutlined style={{ marginRight: 4 }} />
                分享
              </span>
            ),
          },
        ]

        const onMenuClick = ({ key }: { key: string }) => {
          if (key === 'view') {
            handleView(record)
          } else if (key === 'html') {
            handleDownload(record, 'html')
          } else if (key === 'doc') {
            handleDownload(record, 'doc')
          } else if (key === 'share') {
            handleShare(record)
          }
        }

        return (
          <Dropdown
            menu={{
              items,
              onClick: onMenuClick,
            }}
            trigger={['click']}
          >
            <Button type="link">
              操作 <DownOutlined />
            </Button>
          </Dropdown>
        )
      },
    },
  ]

  const totalCount = Array.isArray(reports) ? reports.length : 0
  const passedCount = Array.isArray(reports)
    ? reports.filter(r => r.status === 'passed').length
    : 0
  const failedCount = Array.isArray(reports)
    ? reports.filter(r => r.status === 'failed' || r.status === 'error').length
    : 0
  const passRate =
    totalCount > 0 ? ((passedCount / totalCount) * 100).toFixed(1) : '0.0'

  const currentSummary = currentReport?.summary
  const detailFirstStep =
    (currentReport as any)?.result?.details && (currentReport as any).result.details[0]
  const detailRequest = detailFirstStep?.request
  const detailResponse = detailFirstStep?.response

  // 在完整 JSON 中查找某个键值对对应的精确路径（用于生成断言时避免路径不完整）
  const findFieldPathInJson = (
    obj: any,
    targetKey: string,
    targetValue: any,
    path: string = '$'
  ): string | null => {
    // 明确区分 null 和 undefined：null 是有效值，undefined 表示不存在
    if (obj === undefined) return null
    // null 对象本身也可以作为值被查找
    if (obj === null) return null

    // 匹配当前层
    if (!Array.isArray(obj) && typeof obj === 'object') {
      if (Object.prototype.hasOwnProperty.call(obj, targetKey)) {
        // 使用严格相等 === 来区分 null、空字符串 ""、0、false 等
        // 特别注意：null === null 为 true，但 null !== "" 为 true
        if (obj[targetKey] === targetValue) {
          return `${path}.${targetKey}`
        }
      }
    }

    // 数组
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const childPath = `${path}[${i}]`
        const found = findFieldPathInJson(obj[i], targetKey, targetValue, childPath)
        if (found) return found
      }
      return null
    }

    // 对象
    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const childPath = `${path}.${key}`
        const found = findFieldPathInJson(value, targetKey, targetValue, childPath)
        if (found) return found
      }
    }

    return null
  }

  // 在完整JSON中查找选中对象的位置，返回正确的路径前缀
  const findObjectPathInFullJson = (fullJson: any, targetObj: any, currentPath: string = '$', visited = new WeakSet()): string | null => {
    if (!fullJson || !targetObj) return null
    
    // 使用深度比较来判断是否是同一个对象
    // 特别注意：使用严格相等 === 来区分 null、空字符串 ""、undefined 等
    const isSameObject = (a: any, b: any): boolean => {
      // 严格相等比较，可以区分 null 和空字符串
      if (a === b) return true
      
      // null 和 undefined 的明确区分
      if (a === null || b === null) {
        // 如果都是 null，上面已经通过 === 判断返回 true
        // 这里只需要处理一个是 null 另一个不是的情况
        return false
      }
      
      // 基本类型直接比较（包括空字符串 ""）
      if (typeof a !== 'object' || typeof b !== 'object') {
        return false
      }
      
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      
      if (keysA.length !== keysB.length) return false
      
      for (const key of keysA) {
        if (!(key in b)) return false
        
        const valA = a[key]
        const valB = b[key]
        
        // 使用严格相等比较，可以区分 null 和空字符串
        if (valA === valB) {
          continue
        }
        
        // 嵌套对象递归比较
        if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
          if (!isSameObject(valA, valB)) return false
        } else {
          // 基本类型不相等，返回 false
          return false
        }
      }
      
      return true
    }
    
    if (visited.has(fullJson)) return null
    visited.add(fullJson)
    
    if (isSameObject(fullJson, targetObj)) {
      return currentPath
    }
    
    if (Array.isArray(fullJson)) {
      for (let i = 0; i < fullJson.length; i++) {
        const found = findObjectPathInFullJson(fullJson[i], targetObj, `${currentPath}[${i}]`, visited)
        if (found) return found
      }
    } else if (fullJson && typeof fullJson === 'object') {
      for (const [key, value] of Object.entries(fullJson)) {
        const found = findObjectPathInFullJson(value, targetObj, `${currentPath}.${key}`, visited)
        if (found) return found
      }
    }
    
    return null
  }

  // 递归提取对象的所有字段路径和值
  const extractAllPaths = (obj: any, prefix: string = '$', maxDepth: number = 10, currentDepth: number = 0): Array<{ path: string; value: any }> => {
    const results: Array<{ path: string; value: any }> = []
    
    if (currentDepth >= maxDepth) {
      return results
    }
    
    // 明确区分 null 和 undefined：null 应该被提取，undefined 应该被跳过
    if (obj === undefined) {
      return results
    }
    
    // null 值应该被提取
    if (obj === null) {
      results.push({ path: prefix, value: null })
      return results
    }
    
    if (Array.isArray(obj)) {
      // 如果是数组，提取第一个元素的字段
      if (obj.length > 0) {
        if (typeof obj[0] === 'object' && obj[0] !== null) {
          results.push(...extractAllPaths(obj[0], `${prefix}[0]`, maxDepth, currentDepth + 1))
        } else {
          // 确保 null 和空字符串被正确区分
          results.push({ path: `${prefix}[0]`, value: obj[0] })
        }
      }
    } else if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = `${prefix}.${key}`
        
        // 明确区分 null、undefined 和空字符串
        if (value === undefined) {
          // undefined 跳过，不提取
          continue
        } else if (value === null) {
          // null 值应该被提取，类型为 null
          results.push({ path: currentPath, value: null })
        } else if (Array.isArray(value)) {
          // 数组：提取第一个元素
          if (value.length > 0) {
            if (typeof value[0] === 'object' && value[0] !== null) {
              results.push(...extractAllPaths(value[0], `${currentPath}[0]`, maxDepth, currentDepth + 1))
            } else {
              // 确保 null 和空字符串被正确区分
              results.push({ path: `${currentPath}[0]`, value: value[0] })
            }
          }
        } else if (typeof value === 'object') {
          // 嵌套对象：递归提取
          results.push(...extractAllPaths(value, currentPath, maxDepth, currentDepth + 1))
        } else {
          // 基本类型（包括空字符串 ""）：直接添加，保持原始类型
          results.push({ path: currentPath, value })
        }
      }
    } else {
      // 基本类型（包括空字符串 ""）：直接添加，保持原始类型
      results.push({ path: prefix, value: obj })
    }
    
    return results
  }

  // 解析选中的文本，提取JSON路径和值
  const parseSelectedText = (selected: string, fullJson: any): Array<{ path: string; value: any }> => {
    const results: Array<{ path: string; value: any }> = []
    
    if (!selected || !selected.trim()) {
      return results
    }

    const trimmed = selected.trim()
    let selectedJson: any = null

    // 尝试1: 直接解析
    try {
      selectedJson = JSON.parse(trimmed)
    } catch {
      // 尝试2: 修复不完整的JSON（补全大括号）
      try {
        let fixed = trimmed
        // 如果以 { 开头但没有 }，尝试补全
        if (fixed.startsWith('{') && !fixed.endsWith('}')) {
          // 计算需要补全的括号
          let openBraces = (fixed.match(/{/g) || []).length
          let closeBraces = (fixed.match(/}/g) || []).length
          fixed = fixed + '}'.repeat(openBraces - closeBraces)
        }
        // 如果以 [ 开头但没有 ]，尝试补全
        if (fixed.startsWith('[') && !fixed.endsWith(']')) {
          let openBrackets = (fixed.match(/\[/g) || []).length
          let closeBrackets = (fixed.match(/\]/g) || []).length
          fixed = fixed + ']'.repeat(openBrackets - closeBrackets)
        }
        selectedJson = JSON.parse(fixed)
      } catch {
        // 尝试3: 匹配多组键值对（不要求是完整JSON）
        // 改进正则：支持 null、true、false、数字、字符串（包括空字符串）
        const regex = /"([^"]+)":\s*(null|true|false|-?\d+\.?\d*|"[^"]*"|\[[^\]]*\]|\{[^}]*\})(?=\s*[,}])/g
        const bodyJson = fullJson?.body_json || fullJson?.body || fullJson
        let hasMatch = false
        let match
        while ((match = regex.exec(trimmed)) !== null) {
          hasMatch = true
          const key = match[1]
          let valueStr = match[2].trim()

          // 如果值看起来是对象或数组（以 { 或 [ 开头），这里不直接生成断言，
          // 避免产生整对象 / 整数组的等值断言，让用户缩小选中范围即可。
          if (valueStr.startsWith('{') || valueStr.startsWith('[')) {
            continue
          }

          try {
            // 使用 JSON.parse 解析，这样可以正确区分 null、true、false、数字、字符串（包括空字符串 ""）
            const parsedValue = JSON.parse(valueStr)
            // 只对基础类型生成断言，对解析成对象/数组的值也跳过
            if (parsedValue !== null && typeof parsedValue === 'object') {
              continue
            }

            // 确保 null 和空字符串被正确区分
            // parsedValue === null 时，类型是 null
            // parsedValue === "" 时，类型是 string
            if (bodyJson && typeof bodyJson === 'object') {
              const foundPath = findFieldPathInJson(bodyJson, key, parsedValue, '$')
              if (foundPath) {
                // 保持原始类型：null 保持为 null，空字符串保持为 ""
                results.push({ path: foundPath, value: parsedValue })
              }
            }
          } catch {
            // 如果 JSON.parse 失败，可能是未加引号的字符串，尝试作为字符串处理
            // 但要注意：空字符串应该是 ""，而不是未加引号的内容
            
            // 检查是否是未加引号的 null（JSON 中的 null 值，不是字符串 "null"）
            if (valueStr === 'null' && !valueStr.startsWith('"')) {
              // 这是 JSON 的 null 值（不带引号），应该解析为 null
              if (bodyJson && typeof bodyJson === 'object') {
                const foundPath = findFieldPathInJson(bodyJson, key, null, '$')
                if (foundPath) {
                  results.push({ path: foundPath, value: null })
                }
              }
            } else if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
              // 带引号的字符串，去掉引号后可能是空字符串 "" 或字符串 "null"
              const unquoted = valueStr.slice(1, -1)
              if (bodyJson && typeof bodyJson === 'object') {
                const foundPath = findFieldPathInJson(bodyJson, key, unquoted, '$')
                if (foundPath) {
                  // 保持为字符串类型，即使是空字符串 "" 或字符串 "null"
                  // 这样 "null" 字符串和 null 值会被正确区分
                  results.push({ path: foundPath, value: unquoted })
                }
              }
            } else {
              // 未加引号的字符串，作为普通字符串处理
              // 但要注意：如果原 JSON 中这个字段的值是 null，这里不会匹配到
              // 因为 null 值应该被上面的 JSON.parse 成功解析
              if (bodyJson && typeof bodyJson === 'object') {
                const foundPath = findFieldPathInJson(bodyJson, key, valueStr, '$')
                if (foundPath) {
                  results.push({ path: foundPath, value: valueStr })
                }
              }
            }
          }
        }
        if (hasMatch) {
          return results
        }
      }
    }

    // 如果成功解析为JSON对象
    if (selectedJson !== null) {
      const bodyJson = fullJson?.body_json || fullJson?.body || fullJson
      
      // 确定路径前缀：尝试在完整JSON中找到选中对象的位置
      let pathPrefix = '$'
      if (bodyJson && typeof bodyJson === 'object') {
        if (Array.isArray(bodyJson) && bodyJson.length > 0) {
          // 如果响应是数组，检查选中的对象是否在数组中
          const foundIndex = bodyJson.findIndex((item: any) => {
            if (typeof item === 'object' && item !== null && typeof selectedJson === 'object' && selectedJson !== null) {
              // 简单比较：如果选中的对象的所有键都在item中，且值相同，认为匹配
              return Object.keys(selectedJson).every(key => key in item && item[key] === selectedJson[key])
            }
            return false
          })
          if (foundIndex >= 0) {
            pathPrefix = `$[${foundIndex}]`
          } else {
            pathPrefix = '$[0]' // 默认使用第一个元素
          }
        } else {
          // 如果响应是对象，检查选中的对象是否是它的子对象
          const foundPath = findObjectPathInFullJson(bodyJson, selectedJson, '$', new WeakSet())
          if (foundPath) {
            pathPrefix = foundPath
          }
        }
      }
      
      // 提取所有字段
      if (Array.isArray(selectedJson)) {
        if (selectedJson.length > 0) {
          results.push(...extractAllPaths(selectedJson[0], `${pathPrefix}[0]`))
        }
      } else if (typeof selectedJson === 'object') {
        results.push(...extractAllPaths(selectedJson, pathPrefix))
      } else {
        results.push({ path: pathPrefix, value: selectedJson })
      }
    }

    return results
  }

  // 处理响应信息文本选中
  const handleResponseTextSelect = () => {
    if (responseTextAreaRef.current) {
      const textarea = responseTextAreaRef.current.resizableTextArea?.textArea
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selected = textarea.value.substring(start, end)
        setSelectedText(selected)
      }
    }
  }

  const handleCopyAssertionsFromReport = async () => {
    if (!detailResponse) {
      message.warning('当前报告中没有可用的响应信息，无法生成断言')
      return
    }

    const assertions: any[] = []

    // 如果有选中的文本，优先根据选中内容生成断言
    if (selectedText && selectedText.trim()) {
      const bodyJson = detailResponse.body_json || detailResponse.body || detailResponse.bodyJSON
      const parsed = parseSelectedText(selectedText, bodyJson || detailResponse)
      
      if (parsed.length > 0) {
        // 根据解析出的路径和值生成断言
        for (const { path, value } of parsed) {
          if (path === '$.status_code' || path.includes('status_code')) {
            assertions.push({
              type: 'status_code',
              expected: value,
            })
          } else {
            assertions.push({
              type: 'response_body',
              path: path,
              operator: 'equal',
              expected: value,
            })
          }
        }
      } else {
        message.warning('无法从选中的内容中解析出有效的JSON路径，请尝试选中完整的键值对或JSON对象')
        return
      }
    } else {
      // 没有选中内容，使用默认逻辑：状态码 + 常见字段
      if (detailResponse.status_code != null) {
        assertions.push({
          type: 'status_code',
          expected: detailResponse.status_code,
        })
      }

      const bodyJson = detailResponse.body_json || detailResponse.body || detailResponse.bodyJSON
      if (bodyJson && typeof bodyJson === 'object') {
        // 常见字段：code / status / success
        if ('code' in bodyJson) {
          assertions.push({
            type: 'response_body',
            path: '$.code',
            operator: 'equal',
            expected: (bodyJson as any).code,
          })
        }
        if ('status' in bodyJson) {
          assertions.push({
            type: 'response_body',
            path: '$.status',
            operator: 'equal',
            expected: (bodyJson as any).status,
          })
        }
        if ('success' in bodyJson) {
          assertions.push({
            type: 'response_body',
            path: '$.success',
            operator: 'equal',
            expected: (bodyJson as any).success,
          })
        }
      }
    }

    if (!assertions.length) {
      message.warning('未能从当前响应中推断出合适的断言，请手动配置')
      return
    }

    const json = JSON.stringify(assertions, null, 2)

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(json)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = json
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        textarea.style.top = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      message.success(`已生成 ${assertions.length} 条断言并复制到剪贴板，可在测试用例的断言配置中粘贴使用`)
      setSelectedText('') // 清空选中状态
    } catch (error: any) {
      console.error('复制断言失败:', error)
      message.error('复制断言失败：' + (error.message || '未知错误'))
    }
  }

  return (
    <div
      style={{
        padding: '16px',
        height: 'calc(100vh - 88px)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '100%',
      }}
    >
      <h2 style={{ marginBottom: 16, marginTop: 0 }}>测试报告</h2>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="总执行次数" value={totalCount} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="通过数" value={passedCount} valueStyle={{ color: '#10b981' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="失败数"
              value={failedCount}
              valueStyle={{ color: failedCount > 0 ? '#ef4444' : undefined }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="通过率" value={`${passRate}%`} />
          </Card>
        </Col>
      </Row>

      <div style={{ flex: 1, minHeight: 0 }}>
        <div style={{ height: '100%', overflowY: 'auto' }}>
          <Table
            columns={columns}
            dataSource={Array.isArray(reports) ? reports : []}
            rowKey="id"
            pagination={{
              current: page,
              pageSize,
              defaultPageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '20', '50'],
              showTotal: (total) => `共 ${total} 条记录`,
              onChange: (p, size) => {
                setPage(p)
                setPageSize(size || 10)
              },
            }}
            loading={loading}
          />
        </div>
      </div>

      <Modal
        title={`测试报告详情 #${currentReport?.id ?? ''}`}
        open={detailVisible}
        footer={null}
        onCancel={() => setDetailVisible(false)}
        width={900}
      >
        {currentReport && (
          <Tabs
            defaultActiveKey="overview"
            items={[
              {
                key: 'overview',
                label: '概览',
                children: (
                  <div>
                    <p>
                      <strong>执行ID：</strong>
                      {currentReport.execution_id}
                    </p>
                    <p>
                      <strong>项目ID：</strong>
                      {currentReport.project_id}
                    </p>
                    <p>
                      <strong>用例ID：</strong>
                      {currentReport.test_case_id ?? '-'}
                    </p>
                    <p>
                      <strong>用例名称：</strong>
                      {currentReport.test_case_name ?? '-'}
                    </p>
                    <p>
                      <strong>环境：</strong>
                      {currentReport.environment ?? '-'}
                    </p>
                    <p>
                      <strong>状态：</strong>
                      {currentReport.status}
                    </p>
                    <p>
                      <strong>开始时间：</strong>
                      {currentReport.started_at
                        ? dayjs(currentReport.started_at)
                            .add(8, 'hour')
                            .format('YYYY/MM/DD HH:mm:ss')
                        : '-'}
                    </p>
                    <p>
                      <strong>完成时间：</strong>
                      {currentReport.finished_at
                        ? dayjs(currentReport.finished_at)
                            .add(8, 'hour')
                            .format('YYYY/MM/DD HH:mm:ss')
                        : '-'}
                    </p>
                    <p>
                      <strong>生成时间：</strong>
                      {currentReport.created_at
                        ? dayjs(currentReport.created_at)
                            .add(8, 'hour')
                            .format('YYYY/MM/DD HH:mm:ss')
                        : '-'}
                    </p>
                    {currentSummary && (
                      <Card style={{ marginTop: 16 }}>
                        <Row gutter={16}>
                          <Col span={6}>
                            <Statistic title="总数" value={currentSummary.total} />
                          </Col>
                          <Col span={6}>
                            <Statistic
                              title="通过"
                              value={currentSummary.passed}
                              valueStyle={{ color: '#10b981' }}
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic
                              title="失败"
                              value={currentSummary.failed}
                              valueStyle={{
                                color:
                                  currentSummary.failed > 0 || currentSummary.skipped > 0
                                    ? '#ef4444'
                                    : undefined,
                              }}
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic title="跳过" value={currentSummary.skipped} />
                          </Col>
                        </Row>
                      </Card>
                    )}
                  </div>
                ),
              },
              {
                key: 'request',
                label: '请求 / 响应',
                children: detailFirstStep ? (
                  <>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {selectedText ? `已选中 ${selectedText.length} 个字符，将根据选中内容生成断言` : '提示：在右侧响应信息中选中部分或全部内容，然后点击按钮生成断言'}
                      </div>
                      <Button 
                        size="small" 
                        type="primary" 
                        onClick={handleCopyAssertionsFromReport}
                        disabled={!detailResponse}
                      >
                        {selectedText ? '根据选中内容生成断言' : '从本次结果生成断言（复制 JSON）'}
                      </Button>
                    </div>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Card title="请求信息">
                          <TextArea
                            readOnly
                            value={JSON.stringify(detailRequest ?? {}, null, 2)}
                            autoSize={{ minRows: 10, maxRows: 15 }}
                            style={{
                              fontFamily: 'Consolas, "Courier New", monospace',
                              fontSize: 12,
                              backgroundColor: '#f5f5f5',
                            }}
                          />
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card title="响应信息">
                          <TextArea
                            ref={responseTextAreaRef}
                            readOnly
                            value={JSON.stringify(detailResponse ?? {}, null, 2)}
                            autoSize={{ minRows: 10, maxRows: 15 }}
                            style={{
                              fontFamily: 'Consolas, "Courier New", monospace',
                              fontSize: 12,
                              backgroundColor: '#f5f5f5',
                            }}
                            onSelect={handleResponseTextSelect}
                            onMouseUp={handleResponseTextSelect}
                            onKeyUp={handleResponseTextSelect}
                          />
                        </Card>
                      </Col>
                    </Row>
                  </>
                ) : (
                  <p>当前报告尚未包含请求/响应明细。</p>
                ),
              },
            ]}
          />
        )}
      </Modal>
    </div>
  )
}

export default Reports

