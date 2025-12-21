import React, { useState, useEffect } from 'react'
import { Table, Button, Space, Input, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'

const { TextArea } = Input

// 数据驱动配置表格组件 - 独立文件确保不被优化
interface DataDriverTableProps {
  dataDriver: any
  form: {
    getFieldValue: (name: string) => any
    setFieldsValue: (values: any) => void
  }
}

const DataDriverTable: React.FC<DataDriverTableProps> = ({ dataDriver, form }) => {
  const { getFieldValue, setFieldsValue } = form
  
  // 使用 state 来管理数据列表，确保组件正确重新渲染
  const [dataList, setDataList] = useState<any[]>([])
  
  // 当 dataDriver prop 变化时，更新 dataList state
  useEffect(() => {
    try {
      const parsed = typeof dataDriver === 'string' ? JSON.parse(dataDriver || '{}') : (dataDriver || {})
      const newDataList = parsed.data || []
      setDataList(newDataList)
    } catch (e) {
      setDataList([])
    }
  }, [dataDriver])

  const updateDataDriver = (newDataList: any[]) => {
    // 立即更新本地 state，确保UI立即响应
    setDataList(newDataList)
    
    // 获取当前的 data_driver 值
    const currentDataDriver = getFieldValue('data_driver') || {}
    
    // 构造新的 data_driver 值
    let newDataDriver: string
    try {
      const parsed = typeof currentDataDriver === 'string' 
        ? JSON.parse(currentDataDriver || '{}') 
        : (currentDataDriver || {})
      newDataDriver = JSON.stringify({
        ...parsed,
        data: newDataList,
      }, null, 2)
    } catch (e) {
      newDataDriver = JSON.stringify({
        data: newDataList,
      }, null, 2)
    }
    
    // 只更新 data_driver 字段，使用单数形式的 setFieldValue
    // 这样可以避免意外影响其他表单字段
    try {
      // Ant Design 4.x 使用 setFieldsValue，但我们只传递一个字段
      setFieldsValue({
        data_driver: newDataDriver
      })
    } catch (e) {
      console.error('[DataDriverTable] 更新表单失败:', e)
    }
  }

  // 定义列标题常量，避免被优化
  const COLUMN_REQUEST_TITLE = '接口入参'
  const COLUMN_ASSERTIONS_TITLE = '断言'

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Space>
          <Button 
            type="primary" 
            size="small"
            icon={<PlusOutlined />}
            onClick={() => {
              const newDataList = [...dataList]
              // 添加一行新的测试数据，包含request和assertions字段
              newDataList.push({
                request: '',
                assertions: []
              })
              updateDataDriver(newDataList)
              message.success('已添加一行测试数据')
            }}
          >
            添加数据行
          </Button>
          <Button
            size="small"
            onClick={() => {
              if (dataList.length === 0) {
                message.warning('没有测试数据可导出')
                return
              }
              const dataStr = JSON.stringify(dataList, null, 2)
              const blob = new Blob([dataStr], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = `test_data_${Date.now()}.json`
              link.click()
              URL.revokeObjectURL(url)
              message.success('测试数据已导出')
            }}
          >
            导出JSON
          </Button>
          <Button
            size="small"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.json'
              input.onchange = async (e: any) => {
                const file = e.target.files[0]
                if (file) {
                  try {
                    const text = await file.text()
                    const importedData = JSON.parse(text)
                    // 支持两种格式：
                    // 1. 直接数组格式: [{"request": {...}, "assertions": [...]}]
                    // 2. 对象格式: {"data": [{"request": {...}, "assertions": [...]}]}
                    let dataArray: any[] = []
                    if (Array.isArray(importedData)) {
                      dataArray = importedData
                    } else if (importedData.data && Array.isArray(importedData.data)) {
                      dataArray = importedData.data
                    } else {
                      message.error('导入的数据格式不正确，应为数组或包含data字段的对象')
                      return
                    }
                    updateDataDriver(dataArray)
                    message.success(`成功导入 ${dataArray.length} 条测试数据`)
                  } catch (e: any) {
                    message.error('导入失败: ' + (e.message || 'JSON格式错误'))
                  }
                }
              }
              input.click()
            }}
          >
            导入JSON
          </Button>
          <Button
            size="small"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.csv,.xlsx,.xls'
              input.onchange = async (e: any) => {
                const file = e.target.files[0]
                if (file) {
                  try {
                    // 使用 FileReader 读取文件
                    const reader = new FileReader()
                    reader.onload = (evt: any) => {
                      try {
                        const binaryStr = evt.target.result
                        const workbook = XLSX.read(binaryStr, { type: 'binary' })
                        
                        // 读取第一个工作表
                        const firstSheetName = workbook.SheetNames[0]
                        const worksheet = workbook.Sheets[firstSheetName]
                        
                        // 转换为JSON格式
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
                        
                        if (!jsonData || jsonData.length === 0) {
                          message.error('文件中没有有效数据')
                          return
                        }
                        
                        console.log('导入的原始数据：', jsonData)
                        
                        // 转换数据格式为 {request: {...}, assertions: [...]}
                        const dataArray: any[] = []
                        jsonData.forEach((row: any) => {
                          // 检查是否有有效数据
                          const hasData = Object.keys(row).some(key => {
                            const value = row[key]
                            return value !== null && value !== undefined && value !== ''
                          })
                          
                          if (!hasData) {
                            return // 跳过空行
                          }
                          
                          // 构建数据项
                          const dataItem: any = {
                            request: {},
                            assertions: []
                          }
                          
                          // 分离request和assertion字段
                          Object.keys(row).forEach(key => {
                            const value = row[key]
                            if (value === null || value === undefined || value === '') {
                              return
                            }
                            
                            // 如果字段名以 expected_ 开头，生成断言
                            if (key.startsWith('expected_')) {
                              const fieldName = key.replace('expected_', '')
                              
                              // 判断是否为简化配置（字段名不包含下划线和数字）
                              // 简化配置：expected_PassedRules（智能匹配）
                              // 完整配置：expected_ItemResultDict_OrthoDiagnosis_PassedRules（JSONPath）
                              const isSimpleField = !fieldName.includes('_') && !/\d/.test(fieldName)
                              const isLongString = typeof value === 'string' && value.length > 20
                              
                              console.log(`[断言生成] 字段: ${fieldName}, 简单字段: ${isSimpleField}, 长字符串: ${isLongString}, 值长度: ${typeof value === 'string' ? value.length : 'N/A'}`)
                              
                              if (isSimpleField && isLongString) {
                                // 简化配置：使用智能匹配
                                console.log(`[断言生成] 生成 smart_match 断言: ${fieldName}`)
                                dataItem.assertions.push({
                                  type: 'smart_match',
                                  field: fieldName,
                                  expected: value
                                })
                              } else {
                                // 完整配置：使用传统的 JSONPath 断言
                                console.log(`[断言生成] 生成 json_path 断言: $.${fieldName}`)
                                dataItem.assertions.push({
                                  type: 'json_path',
                                  path: `$.${fieldName}`,
                                  expected: value
                                })
                              }
                            } else {
                              // 否则作为请求参数
                              dataItem.request[key] = value
                            }
                          })
                          
                          // 只添加有数据的项
                          if (Object.keys(dataItem.request).length > 0 || dataItem.assertions.length > 0) {
                            dataArray.push(dataItem)
                          }
                        })
                        
                        if (dataArray.length === 0) {
                          message.error('文件中没有可导入的数据')
                          return
                        }
                        
                        console.log('转换后的数据：', dataArray)
                        
                        // 更新数据驱动配置
                        updateDataDriver(dataArray)
                        message.success(`成功导入 ${dataArray.length} 条测试数据`)
                      } catch (e: any) {
                        console.error('解析文件失败：', e)
                        message.error('导入失败: ' + (e.message || '文件解析错误'))
                      }
                    }
                    reader.readAsBinaryString(file)
                  } catch (e: any) {
                    console.error('读取文件失败：', e)
                    message.error('导入失败: ' + (e.message || '文件读取错误'))
                  }
                }
              }
              input.click()
            }}
          >
            导入CSV/Excel
          </Button>
        </Space>
      </div>
      
      {/* DATA_DRIVER_TABLE_START */}
      <Table
        size="small"
        dataSource={(() => {
          // 如果数据为空，返回一个空行
          if (dataList.length === 0) {
            return [{ request: '', assertions: '', __index: 0 }]
          }
          // 将数据列表转换为表格行数据
          return dataList.map((item: any, idx: number) => {
            const request = item.request || item.request_params || ''
            const assertions = item.assertions || ''
            // 如果是对象，转换为JSON字符串显示
            const requestStr = typeof request === 'string' 
              ? request 
              : JSON.stringify(request, null, 2)
            const assertionsStr = Array.isArray(assertions)
              ? JSON.stringify(assertions, null, 2)
              : (typeof assertions === 'string' ? assertions : '')
            return {
              request: requestStr,
              assertions: assertionsStr,
              __index: idx
            }
          })
        })()}
        rowKey="__index"
        pagination={false}
        scroll={{ y: 400 }}
        columns={[
          {
            title: COLUMN_REQUEST_TITLE,
            dataIndex: 'request',
            key: 'request',
            width: '45%',
            render: (value: any, record: any) => {
              return (
                <TextArea
                  rows={10}
                  value={value === null || value === undefined ? '' : String(value)}
                  onChange={(e) => {
                    const newDataList = [...dataList]
                    const index = record.__index
                    // 确保数组有足够的元素
                    while (newDataList.length <= index) {
                      newDataList.push({})
                    }
                    const val = e.target.value.trim()
                    let parsedValue: any = val
                    // 尝试解析为JSON
                    if (val) {
                      try {
                        parsedValue = JSON.parse(val)
                      } catch {
                        // 如果不是有效JSON，保持为字符串
                        parsedValue = val
                      }
                    } else {
                      parsedValue = ''
                    }
                    newDataList[index] = {
                      ...newDataList[index],
                      request: parsedValue
                    }
                    updateDataDriver(newDataList)
                  }}
                  placeholder='输入接口入参，支持JSON格式，例如: {"username": "user1", "password": "pass1"}'
                  style={{ fontFamily: 'monospace', fontSize: '12px', minHeight: '240px' }}
                />
              )
            },
          },
          {
            title: COLUMN_ASSERTIONS_TITLE,
            dataIndex: 'assertions',
            key: 'assertions',
            width: '45%',
            render: (value: any, record: any) => {
              return (
                <TextArea
                  rows={10}
                  value={value === null || value === undefined ? '' : String(value)}
                  onChange={(e) => {
                    const newDataList = [...dataList]
                    const index = record.__index
                    // 确保数组有足够的元素
                    while (newDataList.length <= index) {
                      newDataList.push({})
                    }
                    const val = e.target.value.trim()
                    let parsedValue: any = val
                    // 尝试解析为JSON数组
                    if (val) {
                      try {
                        parsedValue = JSON.parse(val)
                        // 确保是数组
                        if (!Array.isArray(parsedValue)) {
                          parsedValue = [parsedValue]
                        }
                      } catch {
                        // 如果不是有效JSON，保持为字符串
                        parsedValue = val
                      }
                    } else {
                      parsedValue = []
                    }
                    newDataList[index] = {
                      ...newDataList[index],
                      assertions: parsedValue
                    }
                    updateDataDriver(newDataList)
                  }}
                  placeholder='输入断言配置，JSON数组格式，例如: [{"type": "status_code", "expected": 200}] 或节点断言: [{"type": "node", "path": "$.data", "mode": "all_fields", "expected": {"user_id": 1001}}]'
                  style={{ fontFamily: 'monospace', fontSize: '12px', minHeight: '240px' }}
                />
              )
            },
          },
          {
            title: '操作',
            key: 'action',
            width: 100,
            fixed: 'right' as const,
            render: (_: any, record: any) => {
              return (
                <Button
                  size="small"
                  danger
                  type="link"
                  onClick={() => {
                    const newDataList = [...dataList]
                    const index = record.__index
                    newDataList.splice(index, 1)
                    updateDataDriver(newDataList)
                    message.success('已删除')
                  }}
                >
                  删除
                </Button>
              )
            },
          },
        ]}
        locale={{
          emptyText: '暂无测试数据，点击"添加数据行"按钮添加'
        }}
      />
      {/* DATA_DRIVER_TABLE_END */}
      
      {dataList.length === 0 && (
        <div style={{ marginTop: 12, padding: 12, background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>
          <p style={{ margin: 0, color: '#0c4a6e', fontSize: 12, marginBottom: 8, fontWeight: 'bold' }}>
            💡 使用说明：
          </p>
          <ol style={{ margin: 0, paddingLeft: 20, color: '#0c4a6e', fontSize: 12, lineHeight: 1.8 }}>
            <li><strong>每行代表一个测试用例</strong>：每行数据包含接口入参和断言配置</li>
            <li><strong>接口入参</strong>：输入该测试用例的请求参数，支持JSON格式，例如：<code style={{ backgroundColor: '#e0f2fe', padding: '2px 4px', borderRadius: 3 }}>{'{"username": "user1", "password": "pass1"}'}</code></li>
            <li><strong>断言配置</strong>：输入该测试用例的断言规则，JSON数组格式，例如：<code style={{ backgroundColor: '#e0f2fe', padding: '2px 4px', borderRadius: 3 }}>{'[{"type": "status_code", "expected": 200}]'}</code> 或节点断言：<code style={{ backgroundColor: '#e0f2fe', padding: '2px 4px', borderRadius: 3 }}>{'[{"type": "node", "path": "$.data", "mode": "all_fields", "expected": {"user_id": 1001}}]'}</code></li>
            <li><strong>添加数据行</strong>：点击"添加数据行"按钮添加一行新的测试用例</li>
            <li><strong>删除数据</strong>：点击每行右侧的"删除"按钮可删除该测试用例</li>
            <li><strong>批量导入</strong>：点击"导入CSV/Excel"按钮可批量导入测试数据，支持CSV和Excel格式</li>
            <li><strong>执行方式</strong>：系统会遍历每行数据，使用该行的接口入参发送请求，使用该行的断言配置验证响应</li>
            <li><strong>数据格式</strong>：最终数据格式为 <code style={{ backgroundColor: '#e0f2fe', padding: '2px 4px', borderRadius: 3 }}>{'{"data": [{"request": {...}, "assertions": [...]}, ...]}'}</code></li>
            <li><strong>自动生成断言</strong>：如果数据中包含 <code style={{ backgroundColor: '#e0f2fe', padding: '2px 4px', borderRadius: 3 }}>expected_*</code> 字段，系统会自动生成对应的断言规则</li>
          </ol>
        </div>
      )}
    </div>
  )
}

export default DataDriverTable


