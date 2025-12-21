import React, { useState, useEffect } from 'react'
import { Table, Button, Space, Input, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import type { TestDataItem } from '../store/services/testDataConfig'
import RowEditModal from './RowEditModal'

const { TextArea } = Input

// 测试数据表格组件 - 独立使用，不依赖form
interface TestDataTableProps {
  value: TestDataItem[]
  onChange: (data: TestDataItem[]) => void
  onRowEdit?: (index: number, rowData: TestDataItem) => void  // 行编辑回调（可选）
  testCaseOptions?: Array<{ id: number; name: string }>  // 可选关联的用例列表
  onRowAssociatedCasesChange?: (index: number, caseIds: number[]) => void  // 关联用例变更回调
}

const TestDataTable: React.FC<TestDataTableProps> = ({ 
  value, 
  onChange, 
  onRowEdit,
  testCaseOptions = [],
  onRowAssociatedCasesChange
}) => {
  const [dataList, setDataList] = useState<TestDataItem[]>(value || [])
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)
  const [editingRowData, setEditingRowData] = useState<TestDataItem | null>(null)
  
  // 当外部value变化时，更新内部state
  useEffect(() => {
    setDataList(value || [])
  }, [value])

  const updateDataList = (newDataList: TestDataItem[]) => {
    setDataList(newDataList)
    onChange(newDataList)
  }

  const handleAddRow = () => {
    const newDataList = [...dataList]
    newDataList.push({
      request: {},
      assertions: []
    })
    updateDataList(newDataList)
    message.success('已添加一行测试数据')
  }

  const handleDeleteRow = (index: number) => {
    const newDataList = [...dataList]
    newDataList.splice(index, 1)
    updateDataList(newDataList)
    message.success('已删除')
  }

  const handleEditRow = (index: number) => {
    setEditingRowIndex(index)
    setEditingRowData(dataList[index])
  }

  const handleSaveRow = (updatedData: TestDataItem, associatedCases?: number[]) => {
    if (editingRowIndex !== null) {
      const newDataList = [...dataList]
      newDataList[editingRowIndex] = updatedData
      updateDataList(newDataList)
      
      // 如果有关联用例变更回调，调用它
      if (associatedCases !== undefined && onRowAssociatedCasesChange) {
        onRowAssociatedCasesChange(editingRowIndex, associatedCases)
      }
      
      // 如果有行编辑回调，调用它
      if (onRowEdit) {
        onRowEdit(editingRowIndex, updatedData)
      }
      
      setEditingRowIndex(null)
      setEditingRowData(null)
      message.success('保存成功')
    }
  }

  const handleCancelEdit = () => {
    setEditingRowIndex(null)
    setEditingRowData(null)
  }

  const handleExportJSON = () => {
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
  }

  const handleImportJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (file) {
        try {
          const text = await file.text()
          const importedData = JSON.parse(text)
          let dataArray: TestDataItem[] = []
          if (Array.isArray(importedData)) {
            dataArray = importedData
          } else if (importedData.data && Array.isArray(importedData.data)) {
            dataArray = importedData.data
          } else {
            message.error('导入的数据格式不正确，应为数组或包含data字段的对象')
            return
          }
          updateDataList(dataArray)
          message.success(`成功导入 ${dataArray.length} 条测试数据`)
        } catch (e: any) {
          message.error('导入失败: ' + (e.message || 'JSON格式错误'))
        }
      }
    }
    input.click()
  }

  const handleImportCSVExcel = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv,.xlsx,.xls'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (file) {
        try {
          const reader = new FileReader()
          reader.onload = (evt: any) => {
            try {
              const binaryStr = evt.target.result
              const workbook = XLSX.read(binaryStr, { type: 'binary' })
              
              const firstSheetName = workbook.SheetNames[0]
              const worksheet = workbook.Sheets[firstSheetName]
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
              
              if (!jsonData || jsonData.length === 0) {
                message.error('文件中没有有效数据')
                return
              }
              
              const dataArray: TestDataItem[] = []
              jsonData.forEach((row: any) => {
                const hasData = Object.keys(row).some(key => {
                  const value = row[key]
                  return value !== null && value !== undefined && value !== ''
                })
                
                if (!hasData) {
                  return
                }
                
                const dataItem: TestDataItem = {
                  request: {},
                  assertions: []
                }
                
                Object.keys(row).forEach(key => {
                  const value = row[key]
                  if (value === null || value === undefined || value === '') {
                    return
                  }
                  
                  if (key.startsWith('expected_')) {
                    const fieldName = key.replace('expected_', '')
                    const isSimpleField = !fieldName.includes('_') && !/\d/.test(fieldName)
                    const isLongString = typeof value === 'string' && value.length > 20
                    
                    if (isSimpleField && isLongString) {
                      dataItem.assertions.push({
                        type: 'smart_match',
                        field: fieldName,
                        expected: value
                      })
                    } else {
                      dataItem.assertions.push({
                        type: 'json_path',
                        path: `$.${fieldName}`,
                        expected: value
                      })
                    }
                  } else {
                    dataItem.request[key] = value
                  }
                })
                
                if (Object.keys(dataItem.request).length > 0 || dataItem.assertions.length > 0) {
                  dataArray.push(dataItem)
                }
              })
              
              if (dataArray.length === 0) {
                message.error('文件中没有可导入的数据')
                return
              }
              
              updateDataList(dataArray)
              message.success(`成功导入 ${dataArray.length} 条测试数据`)
            } catch (e: any) {
              message.error('导入失败: ' + (e.message || '文件解析错误'))
            }
          }
          reader.readAsBinaryString(file)
        } catch (e: any) {
          message.error('导入失败: ' + (e.message || '文件读取错误'))
        }
      }
    }
    input.click()
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Space>
          <Button 
            type="primary" 
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddRow}
          >
            添加数据行
          </Button>
          <Button
            size="small"
            onClick={handleExportJSON}
          >
            导出JSON
          </Button>
          <Button
            size="small"
            onClick={handleImportJSON}
          >
            导入JSON
          </Button>
          <Button
            size="small"
            onClick={handleImportCSVExcel}
          >
            导入CSV/Excel
          </Button>
        </Space>
      </div>
      
      <Table
        size="small"
        dataSource={dataList.map((item, idx) => ({ ...item, __index: idx }))}
        rowKey="__index"
        pagination={false}
        scroll={{ y: 400 }}
        columns={[
          {
            title: '序号',
            key: 'index',
            width: 60,
            render: (_: any, record: any) => record.__index + 1
          },
          {
            title: '接口入参',
            dataIndex: 'request',
            key: 'request',
            width: '35%',
            render: (value: any) => {
              const requestStr = typeof value === 'string' 
                ? value 
                : JSON.stringify(value || {}, null, 2)
              return (
                <div style={{ 
                  maxHeight: '150px', 
                  overflow: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {requestStr || '(空)'}
                </div>
              )
            },
          },
          {
            title: '断言',
            dataIndex: 'assertions',
            key: 'assertions',
            width: '35%',
            render: (value: any) => {
              const assertionsStr = Array.isArray(value)
                ? JSON.stringify(value, null, 2)
                : (typeof value === 'string' ? value : '[]')
              return (
                <div style={{ 
                  maxHeight: '150px', 
                  overflow: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {assertionsStr}
                </div>
              )
            },
          },
          {
            title: '操作',
            key: 'action',
            width: 150,
            fixed: 'right' as const,
            render: (_: any, record: any) => (
              <Space>
                <Button
                  size="small"
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => handleEditRow(record.__index)}
                >
                  编辑
                </Button>
                <Button
                  size="small"
                  danger
                  type="link"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteRow(record.__index)}
                >
                  删除
                </Button>
              </Space>
            ),
          },
        ]}
        locale={{
          emptyText: '暂无测试数据，点击"添加数据行"按钮添加'
        }}
      />
      
      {/* 行数据编辑Modal */}
      {editingRowData !== null && editingRowIndex !== null && (
        <RowEditModal
          visible={true}
          rowData={editingRowData}
          rowIndex={editingRowIndex}
          testCaseOptions={testCaseOptions}
          onSave={handleSaveRow}
          onCancel={handleCancelEdit}
        />
      )}
      
      {dataList.length === 0 && (
        <div style={{ marginTop: 12, padding: 12, background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>
          <p style={{ margin: 0, color: '#0c4a6e', fontSize: 12, marginBottom: 8, fontWeight: 'bold' }}>
            💡 使用说明：
          </p>
          <ol style={{ margin: 0, paddingLeft: 20, color: '#0c4a6e', fontSize: 12, lineHeight: 1.8 }}>
            <li><strong>每行代表一个测试场景</strong>：每行数据包含接口入参和断言配置</li>
            <li><strong>接口入参</strong>：输入该测试场景的请求参数，支持JSON格式</li>
            <li><strong>断言配置</strong>：输入该测试场景的断言规则，JSON数组格式</li>
            <li><strong>批量导入</strong>：点击"导入CSV/Excel"按钮可批量导入测试数据</li>
            <li><strong>自动生成断言</strong>：如果数据中包含 <code style={{ backgroundColor: '#e0f2fe', padding: '2px 4px', borderRadius: 3 }}>expected_*</code> 字段，系统会自动生成对应的断言规则</li>
          </ol>
        </div>
      )}
    </div>
  )
}

export default TestDataTable

