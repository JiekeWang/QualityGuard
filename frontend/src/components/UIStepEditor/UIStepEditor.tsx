import { useState, useEffect } from 'react'
import { Card, Button, Form, Input, Select, Space, Table, Modal, message, Popconfirm, InputNumber, Switch } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UpOutlined, DownOutlined } from '@ant-design/icons'
import { pageObjectService, PageObject } from '../../store/services/pageObject'
import { uiElementService, UIElement } from '../../store/services/uiElement'

const { Option } = Select
const { TextArea } = Input

export interface UIStep {
  name?: string
  action: string
  selector?: string
  url?: string
  value?: string
  expected?: string
  assertion_type?: string
  timeout?: number
  wait_type?: string
  milliseconds?: number
  screenshot_type?: string
  extract_type?: string
  variable_name?: string
  script?: string
  page_object_id?: number
  element_id?: number
  [key: string]: any
}

interface UIStepEditorProps {
  value?: UIStep[]
  onChange?: (steps: UIStep[]) => void
  projectId?: number
}

const UIStepEditor: React.FC<UIStepEditorProps> = ({ value = [], onChange, projectId }) => {
  const [steps, setSteps] = useState<UIStep[]>(value || [])
  const [stepModalVisible, setStepModalVisible] = useState(false)
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null)
  const [stepForm] = Form.useForm()
  const [pageObjects, setPageObjects] = useState<PageObject[]>([])
  const [uiElements, setUIElements] = useState<UIElement[]>([])
  const [selectedPageObjectId, setSelectedPageObjectId] = useState<number | undefined>()

  useEffect(() => {
    if (value && Array.isArray(value) && value.length > 0) {
      setSteps(value)
    } else if (!value || (Array.isArray(value) && value.length === 0)) {
      setSteps([])
    }
  }, [value])

  useEffect(() => {
    if (projectId) {
      loadPageObjects()
    }
  }, [projectId])

  useEffect(() => {
    if (selectedPageObjectId) {
      loadUIElements(selectedPageObjectId)
    } else {
      setUIElements([])
    }
  }, [selectedPageObjectId])

  const loadPageObjects = async () => {
    if (!projectId) return
    try {
      const data = await pageObjectService.getPageObjects({ project_id: projectId })
      setPageObjects(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载页面对象失败:', error)
    }
  }

  const loadUIElements = async (pageObjectId: number) => {
    try {
      const data = await uiElementService.getUIElements({ page_object_id: pageObjectId })
      setUIElements(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载UI元素失败:', error)
      setUIElements([])
    }
  }

  const handleAddStep = () => {
    setEditingStepIndex(null)
    stepForm.resetFields()
    setStepModalVisible(true)
  }

  const handleEditStep = (index: number) => {
    setEditingStepIndex(index)
    const step = steps[index]
    stepForm.setFieldsValue({
      ...step,
      page_object_id: step.page_object_id,
      element_id: step.element_id,
    })
    if (step.page_object_id) {
      setSelectedPageObjectId(step.page_object_id)
    }
    setStepModalVisible(true)
  }

  const handleDeleteStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index)
    setSteps(newSteps)
    onChange?.(newSteps)
  }

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps]
    if (direction === 'up' && index > 0) {
      [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]]
    } else if (direction === 'down' && index < newSteps.length - 1) {
      [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]]
    }
    setSteps(newSteps)
    onChange?.(newSteps)
  }

  const handleStepSubmit = () => {
    stepForm.validateFields().then(values => {
      const newStep: UIStep = {
        name: values.name || `步骤 ${steps.length + 1}`,
        action: values.action,
      }

      // 根据操作类型设置不同的字段
      switch (values.action) {
        case 'navigate':
          newStep.url = values.url
          break
        case 'click':
        case 'fill':
        case 'select':
        case 'clear':
        case 'hover':
          if (values.element_id) {
            // 使用页面对象元素
            const element = uiElements.find(e => e.id === values.element_id)
            if (element) {
              newStep.selector = element.locator_value
              newStep.page_object_id = values.page_object_id
              newStep.element_id = values.element_id
            }
          } else {
            newStep.selector = values.selector
          }
          if (values.action === 'fill' || values.action === 'select') {
            newStep.value = values.value
          }
          break
        case 'drag_and_drop':
          if (values.source_element_id) {
            const sourceElement = uiElements.find(e => e.id === values.source_element_id)
            if (sourceElement) {
              newStep.source = sourceElement.locator_value
            }
          } else {
            newStep.source = values.source
          }
          if (values.target_element_id) {
            const targetElement = uiElements.find(e => e.id === values.target_element_id)
            if (targetElement) {
              newStep.target = targetElement.locator_value
            }
          } else {
            newStep.target = values.target
          }
          break
        case 'scroll':
          newStep.direction = values.direction
          newStep.pixels = values.pixels
          if (values.element_id) {
            const element = uiElements.find(e => e.id === values.element_id)
            if (element) {
              newStep.selector = element.locator_value
            }
          } else if (values.selector) {
            newStep.selector = values.selector
          }
          break
        case 'wait':
          newStep.wait_type = values.wait_type
          if (values.wait_type === 'time') {
            newStep.milliseconds = values.milliseconds
          } else if (values.wait_type === 'selector') {
            if (values.element_id) {
              const element = uiElements.find(e => e.id === values.element_id)
              if (element) {
                newStep.selector = element.locator_value
              }
            } else {
              newStep.selector = values.selector
            }
          }
          break
        case 'screenshot':
          newStep.screenshot_type = values.screenshot_type
          if (values.screenshot_type === 'element' && values.element_id) {
            const element = uiElements.find(e => e.id === values.element_id)
            if (element) {
              newStep.selector = element.locator_value
            }
          } else if (values.screenshot_type === 'element' && values.selector) {
            newStep.selector = values.selector
          }
          break
        case 'extract':
          newStep.extract_type = values.extract_type
          newStep.variable_name = values.variable_name
          if (values.element_id) {
            const element = uiElements.find(e => e.id === values.element_id)
            if (element) {
              newStep.selector = element.locator_value
            }
          } else {
            newStep.selector = values.selector
          }
          if (values.extract_type === 'attribute') {
            newStep.attribute_name = values.attribute_name
          }
          break
        case 'assert':
          newStep.assertion_type = values.assertion_type
          if (values.element_id) {
            const element = uiElements.find(e => e.id === values.element_id)
            if (element) {
              newStep.selector = element.locator_value
            }
          } else {
            newStep.selector = values.selector
          }
          newStep.expected = values.expected
          break
        case 'execute_script':
          newStep.script = values.script
          break
      }

      // 设置超时
      if (values.timeout) {
        newStep.timeout = values.timeout
      }

      const newSteps = [...steps]
      if (editingStepIndex !== null) {
        newSteps[editingStepIndex] = newStep
      } else {
        newSteps.push(newStep)
      }
      setSteps(newSteps)
      onChange?.(newSteps)
      setStepModalVisible(false)
      stepForm.resetFields()
      setSelectedPageObjectId(undefined)
    }).catch(err => {
      console.error('表单验证失败:', err)
    })
  }

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      navigate: '页面导航',
      click: '点击',
      fill: '输入',
      select: '选择',
      clear: '清空',
      hover: '悬停',
      drag_and_drop: '拖拽',
      scroll: '滚动',
      wait: '等待',
      screenshot: '截图',
      extract: '提取',
      assert: '断言',
      execute_script: '执行脚本',
    }
    return actionMap[action] || action
  }

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: '步骤名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: UIStep) => text || getActionLabel(record.action),
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => getActionLabel(action),
    },
    {
      title: '配置',
      key: 'config',
      render: (_: any, record: UIStep) => {
        if (record.action === 'navigate') {
          return record.url || '-'
        } else if (record.action === 'click' || record.action === 'fill' || record.action === 'select') {
          return record.selector || '-'
        } else if (record.action === 'assert') {
          return `${record.assertion_type}: ${record.expected || '-'}`
        }
        return '-'
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, __: any, index: number) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<UpOutlined />}
            disabled={index === 0}
            onClick={() => handleMoveStep(index, 'up')}
          />
          <Button
            type="link"
            size="small"
            icon={<DownOutlined />}
            disabled={index === steps.length - 1}
            onClick={() => handleMoveStep(index, 'down')}
          />
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditStep(index)}
          />
          <Popconfirm
            title="确定要删除这个步骤吗？"
            onConfirm={() => handleDeleteStep(index)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddStep} block>
          添加步骤
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={steps}
        rowKey={(_, index) => index.toString()}
        pagination={false}
        size="small"
      />

      <Modal
        title={editingStepIndex !== null ? '编辑步骤' : '添加步骤'}
        open={stepModalVisible}
        onOk={handleStepSubmit}
        onCancel={() => {
          setStepModalVisible(false)
          stepForm.resetFields()
          setSelectedPageObjectId(undefined)
        }}
        width={800}
      >
        <Form form={stepForm} layout="vertical">
          <Form.Item
            name="name"
            label="步骤名称"
          >
            <Input placeholder="步骤名称（可选）" />
          </Form.Item>

          <Form.Item
            name="action"
            label="操作类型"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select placeholder="请选择操作类型">
              <Option value="navigate">页面导航</Option>
              <Option value="click">点击</Option>
              <Option value="fill">输入</Option>
              <Option value="select">选择</Option>
              <Option value="clear">清空</Option>
              <Option value="hover">悬停</Option>
              <Option value="drag_and_drop">拖拽</Option>
              <Option value="scroll">滚动</Option>
              <Option value="wait">等待</Option>
              <Option value="screenshot">截图</Option>
              <Option value="extract">提取变量</Option>
              <Option value="assert">断言</Option>
              <Option value="execute_script">执行脚本</Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.action !== curr.action}>
            {({ getFieldValue }) => {
              const action = getFieldValue('action')
              
              return (
                <>
                  {/* 页面对象和元素选择 */}
                  {(action === 'click' || action === 'fill' || action === 'select' || 
                    action === 'clear' || action === 'hover' || action === 'wait' || 
                    action === 'screenshot' || action === 'extract' || action === 'assert') && (
                    <>
                      <Form.Item
                        name="page_object_id"
                        label="页面对象（可选）"
                      >
                        <Select
                          placeholder="选择页面对象"
                          allowClear
                          onChange={(value) => {
                            setSelectedPageObjectId(value)
                            stepForm.setFieldValue('element_id', undefined)
                          }}
                        >
                          {pageObjects.map(po => (
                            <Option key={po.id} value={po.id}>
                              {po.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>

                      {selectedPageObjectId && (
                        <Form.Item
                          name="element_id"
                          label="UI元素（可选）"
                        >
                          <Select
                            placeholder="选择UI元素"
                            allowClear
                            showSearch
                            optionFilterProp="children"
                          >
                            {uiElements.map(element => (
                              <Option key={element.id} value={element.id}>
                                {element.name} ({element.locator_type}: {element.locator_value})
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      )}

                      <Form.Item
                        name="selector"
                        label="选择器（如果未选择元素，可手动输入）"
                      >
                        <Input placeholder="例如: #button, .class, //div[@id='id']" />
                      </Form.Item>
                    </>
                  )}

                  {/* navigate */}
                  {action === 'navigate' && (
                    <Form.Item
                      name="url"
                      label="URL"
                      rules={[{ required: true, message: '请输入URL' }]}
                    >
                      <Input placeholder="https://example.com" />
                    </Form.Item>
                  )}

                  {/* fill, select */}
                  {(action === 'fill' || action === 'select') && (
                    <Form.Item
                      name="value"
                      label="值"
                      rules={[{ required: true, message: '请输入值' }]}
                    >
                      <Input placeholder="输入值" />
                    </Form.Item>
                  )}

                  {/* drag_and_drop */}
                  {action === 'drag_and_drop' && (
                    <>
                      <Form.Item
                        name="source_element_id"
                        label="源元素"
                      >
                        <Select
                          placeholder="选择源元素"
                          allowClear
                          showSearch
                        >
                          {uiElements.map(element => (
                            <Option key={element.id} value={element.id}>
                              {element.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item
                        name="source"
                        label="源选择器（如果未选择元素）"
                      >
                        <Input placeholder="源元素选择器" />
                      </Form.Item>
                      <Form.Item
                        name="target_element_id"
                        label="目标元素"
                      >
                        <Select
                          placeholder="选择目标元素"
                          allowClear
                          showSearch
                        >
                          {uiElements.map(element => (
                            <Option key={element.id} value={element.id}>
                              {element.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item
                        name="target"
                        label="目标选择器（如果未选择元素）"
                      >
                        <Input placeholder="目标元素选择器" />
                      </Form.Item>
                    </>
                  )}

                  {/* scroll */}
                  {action === 'scroll' && (
                    <>
                      <Form.Item
                        name="direction"
                        label="滚动方向"
                        initialValue="down"
                      >
                        <Select>
                          <Option value="down">向下</Option>
                          <Option value="up">向上</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        name="pixels"
                        label="滚动像素"
                        initialValue={500}
                      >
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </>
                  )}

                  {/* wait */}
                  {action === 'wait' && (
                    <>
                      <Form.Item
                        name="wait_type"
                        label="等待类型"
                        rules={[{ required: true, message: '请选择等待类型' }]}
                      >
                        <Select>
                          <Option value="time">固定时间</Option>
                          <Option value="selector">等待元素</Option>
                          <Option value="load">等待页面加载</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.wait_type !== curr.wait_type}>
                        {({ getFieldValue }) => {
                          const waitType = getFieldValue('wait_type')
                          if (waitType === 'time') {
                            return (
                              <Form.Item
                                name="milliseconds"
                                label="等待时间（毫秒）"
                                initialValue={1000}
                                rules={[{ required: true, message: '请输入等待时间' }]}
                              >
                                <InputNumber min={0} style={{ width: '100%' }} />
                              </Form.Item>
                            )
                          }
                          return null
                        }}
                      </Form.Item>
                    </>
                  )}

                  {/* screenshot */}
                  {action === 'screenshot' && (
                    <Form.Item
                      name="screenshot_type"
                      label="截图类型"
                      initialValue="full"
                    >
                      <Select>
                        <Option value="full">全屏</Option>
                        <Option value="element">元素</Option>
                        <Option value="viewport">视口</Option>
                      </Select>
                    </Form.Item>
                  )}

                  {/* extract */}
                  {action === 'extract' && (
                    <>
                      <Form.Item
                        name="extract_type"
                        label="提取类型"
                        rules={[{ required: true, message: '请选择提取类型' }]}
                      >
                        <Select>
                          <Option value="text">文本</Option>
                          <Option value="attribute">属性</Option>
                          <Option value="url">URL</Option>
                          <Option value="title">标题</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        name="variable_name"
                        label="变量名"
                        rules={[{ required: true, message: '请输入变量名' }]}
                      >
                        <Input placeholder="例如: username" />
                      </Form.Item>
                      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.extract_type !== curr.extract_type}>
                        {({ getFieldValue }) => {
                          const extractType = getFieldValue('extract_type')
                          if (extractType === 'attribute') {
                            return (
                              <Form.Item
                                name="attribute_name"
                                label="属性名"
                                rules={[{ required: true, message: '请输入属性名' }]}
                              >
                                <Input placeholder="例如: href, value" />
                              </Form.Item>
                            )
                          }
                          return null
                        }}
                      </Form.Item>
                    </>
                  )}

                  {/* assert */}
                  {action === 'assert' && (
                    <>
                      <Form.Item
                        name="assertion_type"
                        label="断言类型"
                        rules={[{ required: true, message: '请选择断言类型' }]}
                      >
                        <Select>
                          <Option value="element_exists">元素存在</Option>
                          <Option value="element_visible">元素可见</Option>
                          <Option value="text_equals">文本等于</Option>
                          <Option value="text_contains">文本包含</Option>
                          <Option value="url_equals">URL等于</Option>
                          <Option value="url_contains">URL包含</Option>
                          <Option value="title_equals">标题等于</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        name="expected"
                        label="期望值"
                        rules={[{ required: true, message: '请输入期望值' }]}
                      >
                        <Input placeholder="期望值" />
                      </Form.Item>
                    </>
                  )}

                  {/* execute_script */}
                  {action === 'execute_script' && (
                    <Form.Item
                      name="script"
                      label="JavaScript代码"
                      rules={[{ required: true, message: '请输入脚本代码' }]}
                    >
                      <TextArea rows={5} placeholder="例如: return document.title;" />
                    </Form.Item>
                  )}

                  {/* 通用超时设置 */}
                  <Form.Item
                    name="timeout"
                    label="超时时间（毫秒，可选）"
                  >
                    <InputNumber min={0} style={{ width: '100%' }} placeholder="默认30000" />
                  </Form.Item>
                </>
              )
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UIStepEditor

