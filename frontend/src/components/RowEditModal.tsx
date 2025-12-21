import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, message, Space, Tag } from 'antd'
import type { TestDataItem } from '../store/services/testDataConfig'

const { TextArea } = Input
const { Option } = Select

interface RowEditModalProps {
  visible: boolean
  rowData: TestDataItem
  rowIndex: number
  testCaseOptions?: Array<{ id: number; name: string }>  // 可选关联的用例列表
  associatedCaseIds?: number[]  // 当前行已关联的用例ID列表
  onSave: (data: TestDataItem, associatedCases?: number[]) => void
  onCancel: () => void
}

const RowEditModal: React.FC<RowEditModalProps> = ({
  visible,
  rowData,
  rowIndex,
  testCaseOptions = [],
  associatedCaseIds = [],
  onSave,
  onCancel
}) => {
  const [form] = Form.useForm()
  const [associatedCases, setAssociatedCases] = useState<number[]>(associatedCaseIds || [])

  useEffect(() => {
    if (visible && rowData) {
      // 初始化表单数据
      const requestStr = typeof rowData.request === 'string' 
        ? rowData.request 
        : JSON.stringify(rowData.request || {}, null, 2)
      const assertionsStr = Array.isArray(rowData.assertions)
        ? JSON.stringify(rowData.assertions, null, 2)
        : (typeof rowData.assertions === 'string' ? rowData.assertions : '[]')
      
      form.setFieldsValue({
        request: requestStr,
        assertions: assertionsStr
      })
      setAssociatedCases(associatedCaseIds || [])
    }
  }, [visible, rowData, form, associatedCaseIds])

  const handleSave = () => {
    form.validateFields().then(values => {
      try {
        // 解析request
        let request: Record<string, any> = {}
        if (values.request && values.request.trim()) {
          try {
            request = JSON.parse(values.request.trim())
          } catch (e) {
            message.error('接口入参必须是有效的JSON格式')
            return
          }
        }
        
        // 解析assertions
        let assertions: Array<Record<string, any>> = []
        if (values.assertions && values.assertions.trim()) {
          try {
            const parsed = JSON.parse(values.assertions.trim())
            assertions = Array.isArray(parsed) ? parsed : [parsed]
          } catch (e) {
            message.error('断言配置必须是有效的JSON数组格式')
            return
          }
        }
        
        const updatedData: TestDataItem = {
          request,
          assertions
        }
        
        onSave(updatedData, associatedCases)
      } catch (e: any) {
        message.error('保存失败: ' + (e.message || '未知错误'))
      }
    })
  }

  return (
    <Modal
      title={`编辑测试数据 - 第 ${rowIndex + 1} 行`}
      open={visible}
      onOk={handleSave}
      onCancel={onCancel}
      width={1200}
      okText="保存"
      cancelText="取消"
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
    >
      <Form
        form={form}
        layout="vertical"
      >
        <Form.Item
          label="接口入参 (JSON格式)"
          name="request"
          rules={[
            {
              validator: (_, value) => {
                if (!value || !value.trim()) {
                  return Promise.resolve()
                }
                try {
                  JSON.parse(value.trim())
                  return Promise.resolve()
                } catch (e) {
                  return Promise.reject(new Error('必须是有效的JSON格式'))
                }
              }
            }
          ]}
        >
          <TextArea
            rows={20}
            placeholder='输入接口入参，支持JSON格式，例如: {"Codes": "R-lower", "DamageToothCount": 1}'
            style={{ 
              fontFamily: 'monospace', 
              fontSize: '13px',
              lineHeight: '1.6',
              minHeight: '400px'
            }}
            autoSize={{ minRows: 20, maxRows: 30 }}
          />
        </Form.Item>
        
        <Form.Item
          label="断言配置 (JSON数组格式)"
          name="assertions"
          rules={[
            {
              validator: (_, value) => {
                if (!value || !value.trim()) {
                  return Promise.resolve()
                }
                try {
                  const parsed = JSON.parse(value.trim())
                  if (!Array.isArray(parsed)) {
                    return Promise.reject(new Error('必须是JSON数组格式'))
                  }
                  return Promise.resolve()
                } catch (e) {
                  return Promise.reject(new Error('必须是有效的JSON数组格式'))
                }
              }
            }
          ]}
        >
          <TextArea
            rows={20}
            placeholder='输入断言配置，JSON数组格式，例如: [{"type": "smart_match", "field": "PassedRules", "expected": "..."}]'
            style={{ 
              fontFamily: 'monospace', 
              fontSize: '13px',
              lineHeight: '1.6',
              minHeight: '400px'
            }}
            autoSize={{ minRows: 20, maxRows: 30 }}
          />
        </Form.Item>
        
        {testCaseOptions.length > 0 && (
          <Form.Item
            label="关联测试用例"
            help="选择使用此测试数据的用例（可选）"
          >
            <Select
              mode="multiple"
              placeholder="选择测试用例"
              value={associatedCases}
              onChange={(values) => setAssociatedCases(values)}
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {testCaseOptions.map(option => (
                <Option key={option.id} value={option.id}>
                  {option.name}
                </Option>
              ))}
            </Select>
            {associatedCases.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Space wrap>
                  {associatedCases.map(caseId => {
                    const caseInfo = testCaseOptions.find(opt => opt.id === caseId)
                    return (
                      <Tag key={caseId} closable onClose={() => {
                        setAssociatedCases(associatedCases.filter(id => id !== caseId))
                      }}>
                        {caseInfo?.name || `用例 ${caseId}`}
                      </Tag>
                    )
                  })}
                </Space>
              </div>
            )}
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

export default RowEditModal

