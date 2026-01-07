import { useState, useEffect, useRef } from 'react'
import { Card, Button, Space, Modal, Form, Input, Select, message, Table, Tag, Checkbox, Drawer, Alert, Tabs, Collapse, Descriptions } from 'antd'
import { PlayCircleOutlined, StopOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { projectService } from '../../store/services/project'
import { api } from '../../store/services/api'

const { Option } = Select
const { TextArea } = Input
const { Panel } = Collapse

interface PageElement {
  index: number
  tag: string
  selector: string
  text: string
  id: string
  className: string
  value: string
  placeholder: string
  alt: string
  href: string
  isButton: boolean
  isInput: boolean
  isLink: boolean
  isImage: boolean
  isHeading: boolean
  isLabel: boolean
  isVisible: boolean
}

interface PageSnapshot {
  timestamp: string
  step_index: number
  url: string
  title: string
  elements: PageElement[]
  elements_count: number
}

interface RecordingStep {
  action: string
  selector?: string
  url?: string
  value?: string
  timestamp: string
  step_index: number
}

const UIRecording: React.FC = () => {
  const [recording, setRecording] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [steps, setSteps] = useState<RecordingStep[]>([])
  const [snapshots, setSnapshots] = useState<PageSnapshot[]>([])
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null)
  const [selectedElements, setSelectedElements] = useState<Record<number, number[]>>({}) // {step_index: [element_indices]}
  const [projects, setProjects] = useState<any[]>([])
  const [generateModalVisible, setGenerateModalVisible] = useState(false)
  const [snapshotDrawerVisible, setSnapshotDrawerVisible] = useState(false)
  const [form] = Form.useForm()
  const stepsPollingRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadProjects()
    return () => {
      if (stepsPollingRef.current) {
        clearInterval(stepsPollingRef.current)
      }
    }
  }, [])

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects()
      setProjects(data)
    } catch (error) {
      console.error('加载项目失败:', error)
    }
  }

  const startRecording = async () => {
    try {
      const response = await api.post('/ui-recording/start', {
        browser: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 720 }
      })
      
      if (response.data.status === 'recording') {
        setSessionId(response.data.session_id)
        setRecording(true)
        setSteps([])
        setSnapshots([])
        setSelectedElements({})
        message.success('录制已开始')
        
        // 开始轮询步骤和快照
        startStepsPolling(response.data.session_id)
      } else {
        message.error('启动录制失败: ' + (response.data.error || '未知错误'))
      }
    } catch (error: any) {
      message.error('启动录制失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const startStepsPolling = (sessionId: string) => {
    if (stepsPollingRef.current) {
      clearInterval(stepsPollingRef.current)
    }
    
    stepsPollingRef.current = setInterval(async () => {
      try {
        // 获取步骤
        const stepsResponse = await api.get(`/ui-recording/${sessionId}/steps`)
        setSteps(stepsResponse.data.steps || [])
        
        // 获取快照
        const snapshotsResponse = await api.get(`/ui-recording/${sessionId}/snapshots`)
        setSnapshots(snapshotsResponse.data.snapshots || [])
      } catch (error) {
        console.error('获取步骤/快照失败:', error)
      }
    }, 2000)
  }

  const stopRecording = async () => {
    if (!sessionId) return
    
    try {
      await api.post(`/ui-recording/${sessionId}/stop`)
      setRecording(false)
      
      if (stepsPollingRef.current) {
        clearInterval(stepsPollingRef.current)
        stepsPollingRef.current = null
      }
      
      message.success('录制已停止')
    } catch (error: any) {
      message.error('停止录制失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const [navigateUrl, setNavigateUrl] = useState('')
  const [navigating, setNavigating] = useState(false)
  const [operateModalVisible, setOperateModalVisible] = useState(false)
  const [operateForm] = Form.useForm()
  const [currentSnapshotForOperate, setCurrentSnapshotForOperate] = useState<PageSnapshot | null>(null)

  const handleNavigate = async () => {
    if (!sessionId) {
      message.warning('请先开始录制')
      return
    }
    
    if (!navigateUrl.trim()) {
      message.warning('请输入URL')
      return
    }
    
    try {
      setNavigating(true)
      const response = await api.post(`/ui-recording/${sessionId}/navigate`, {
        url: navigateUrl.trim()
      })
      
      if (response.data.status === 'success') {
        message.success('导航成功')
        setNavigateUrl('')
        // 刷新步骤和快照
        setTimeout(() => {
          if (stepsPollingRef.current) {
            api.get(`/ui-recording/${sessionId}/steps`).then(res => setSteps(res.data.steps || []))
            api.get(`/ui-recording/${sessionId}/snapshots`).then(res => {
              setSnapshots(res.data.snapshots || [])
              // 如果有快照，设置为当前快照用于操作
              const latestSnapshot = res.data.snapshots?.[res.data.snapshots.length - 1]
              if (latestSnapshot) {
                setCurrentSnapshotForOperate(latestSnapshot)
              }
            })
          }
        }, 1500)
      } else {
        message.error('导航失败: ' + (response.data.error || '未知错误'))
      }
    } catch (error: any) {
      message.error('导航失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setNavigating(false)
    }
  }

  const handleOperate = () => {
    // 获取最新的快照用于操作
    if (snapshots.length > 0) {
      setCurrentSnapshotForOperate(snapshots[snapshots.length - 1])
    }
    setOperateModalVisible(true)
  }

  const handleClickElement = async (selector: string) => {
    if (!sessionId) return
    
    try {
      const response = await api.post(`/ui-recording/${sessionId}/click`, { selector })
      if (response.data.status === 'success') {
        message.success('点击成功')
        setOperateModalVisible(false)
        setTimeout(() => {
          if (stepsPollingRef.current) {
            api.get(`/ui-recording/${sessionId}/steps`).then(res => setSteps(res.data.steps || []))
            api.get(`/ui-recording/${sessionId}/snapshots`).then(res => {
              setSnapshots(res.data.snapshots || [])
              const latestSnapshot = res.data.snapshots?.[res.data.snapshots.length - 1]
              if (latestSnapshot) {
                setCurrentSnapshotForOperate(latestSnapshot)
              }
            })
          }
        }, 1500)
      }
    } catch (error: any) {
      message.error('点击失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleFillElement = async () => {
    if (!sessionId) return
    
    try {
      const values = await operateForm.validateFields(['selector', 'value'])
      const response = await api.post(`/ui-recording/${sessionId}/fill`, {
        selector: values.selector,
        value: values.value
      })
      if (response.data.status === 'success') {
        message.success('输入成功')
        operateForm.resetFields()
        setOperateModalVisible(false)
        setTimeout(() => {
          if (stepsPollingRef.current) {
            api.get(`/ui-recording/${sessionId}/steps`).then(res => setSteps(res.data.steps || []))
            api.get(`/ui-recording/${sessionId}/snapshots`).then(res => {
              setSnapshots(res.data.snapshots || [])
              const latestSnapshot = res.data.snapshots?.[res.data.snapshots.length - 1]
              if (latestSnapshot) {
                setCurrentSnapshotForOperate(latestSnapshot)
              }
            })
          }
        }, 1500)
      }
    } catch (error: any) {
      if (error.errorFields) return
      message.error('输入失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSelectElement = async () => {
    if (!sessionId) return
    
    try {
      const values = await operateForm.validateFields(['selector', 'value'])
      const response = await api.post(`/ui-recording/${sessionId}/select`, {
        selector: values.selector,
        value: values.value
      })
      if (response.data.status === 'success') {
        message.success('选择成功')
        operateForm.resetFields()
        setOperateModalVisible(false)
        setTimeout(() => {
          if (stepsPollingRef.current) {
            api.get(`/ui-recording/${sessionId}/steps`).then(res => setSteps(res.data.steps || []))
            api.get(`/ui-recording/${sessionId}/snapshots`).then(res => {
              setSnapshots(res.data.snapshots || [])
              const latestSnapshot = res.data.snapshots?.[res.data.snapshots.length - 1]
              if (latestSnapshot) {
                setCurrentSnapshotForOperate(latestSnapshot)
              }
            })
          }
        }, 1500)
      }
    } catch (error: any) {
      if (error.errorFields) return
      message.error('选择失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleViewSnapshot = async (stepIndex: number) => {
    if (!sessionId) return
    
    try {
      const response = await api.get(`/ui-recording/${sessionId}/snapshot/${stepIndex}`)
      if (response.data.snapshot) {
        setSelectedStepIndex(stepIndex)
        setSnapshotDrawerVisible(true)
      }
    } catch (error: any) {
      message.error('获取快照失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleElementToggle = (stepIndex: number, elementIndex: number, checked: boolean) => {
    const current = selectedElements[stepIndex] || []
    if (checked) {
      setSelectedElements({
        ...selectedElements,
        [stepIndex]: [...current, elementIndex]
      })
    } else {
      setSelectedElements({
        ...selectedElements,
        [stepIndex]: current.filter(idx => idx !== elementIndex)
      })
    }
  }

  const handleGenerateTestCase = async () => {
    try {
      const values = await form.validateFields()
      
      if (!sessionId) {
        message.error('录制会话不存在')
        return
      }
      
      const response = await api.post(`/ui-recording/${sessionId}/generate-test-case`, {
        name: values.name,
        description: values.description,
        project_id: values.project_id,
        browser: 'chromium',
        headless: true,
        selected_checkpoints: selectedElements
      })
      
      message.success(`测试用例已生成: ${response.data.name}`)
      setGenerateModalVisible(false)
      setSnapshotDrawerVisible(false)
      form.resetFields()
      
      // 重置状态
      setSessionId(null)
      setSteps([])
      setSnapshots([])
      setSelectedElements({})
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error('生成测试用例失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      'navigate': '导航',
      'click': '点击',
      'fill': '输入',
      'select': '选择'
    }
    return actionMap[action] || action
  }

  const getElementTypeLabel = (element: PageElement) => {
    if (element.isButton) return '按钮'
    if (element.isInput) return '输入框'
    if (element.isLink) return '链接'
    if (element.isImage) return '图片'
    if (element.isHeading) return '标题'
    if (element.isLabel) return '标签'
    return element.tag
  }

  const stepColumns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => getActionLabel(action)
    },
    {
      title: '配置',
      key: 'config',
      render: (_: any, record: RecordingStep) => {
        if (record.action === 'navigate') {
          return <span style={{ color: '#1890ff' }}>{record.url}</span>
        } else if (record.action === 'click') {
          return <span style={{ color: '#52c41a' }}>{record.selector}</span>
        } else if (record.action === 'fill') {
          return <span>{record.selector} = <strong>{record.value}</strong></span>
        } else if (record.action === 'select') {
          return <span>{record.selector} = <strong>{record.value}</strong></span>
        }
        return '-'
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: RecordingStep) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewSnapshot(record.step_index)}
        >
          查看元素
        </Button>
      )
    }
  ]

  const currentSnapshot = snapshots.find(s => s.step_index === selectedStepIndex)
  const selectedCount = Object.values(selectedElements).reduce((sum, indices) => sum + indices.length, 0)

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={startRecording}
              disabled={recording}
            >
              开始录制
            </Button>
            <Button
              danger
              icon={<StopOutlined />}
              onClick={stopRecording}
              disabled={!recording}
            >
              停止录制
            </Button>
            {recording && (
              <Tag color="red" style={{ fontSize: 14, padding: '4px 12px' }}>
                🔴 正在录制...
              </Tag>
            )}
            {recording && (
              <Button onClick={handleNavigate}>
                导航到URL
              </Button>
            )}
          </Space>
        </div>

        {recording && (
          <>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="输入要访问的URL，例如: https://example.com"
                  value={navigateUrl}
                  onChange={(e) => setNavigateUrl(e.target.value)}
                  onPressEnter={handleNavigate}
                  style={{ flex: 1 }}
                />
                <Button
                  type="primary"
                  onClick={handleNavigate}
                  loading={navigating}
                >
                  导航
                </Button>
                {snapshots.length > 0 && (
                  <Button onClick={handleOperate}>
                    操作页面元素
                  </Button>
                )}
              </Space.Compact>
            </Card>
            <Alert
              message="录制提示"
              description="录制已开始。请先导航到目标页面，然后可以操作页面元素。每次操作后系统会自动记录页面状态，您可以在步骤中查看元素并选择检查点。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          </>
        )}

        <Card title={`录制步骤 (${steps.length}个)`} size="small" style={{ marginBottom: 16 }}>
          <Table
            columns={stepColumns}
            dataSource={steps}
            rowKey="step_index"
            pagination={false}
            size="small"
          />
        </Card>

        {steps.length > 0 && (
          <Card title="生成测试用例" size="small">
            <Space>
              <span>已选择 {selectedCount} 个检查点</span>
              <Button
                type="primary"
                onClick={() => setGenerateModalVisible(true)}
                disabled={selectedCount === 0}
              >
                生成测试用例
              </Button>
            </Space>
          </Card>
        )}
      </Card>

      {/* 页面快照抽屉 - 显示所有元素 */}
      <Drawer
        title={`步骤 ${selectedStepIndex !== null ? selectedStepIndex + 1 : ''} 的页面元素`}
        placement="right"
        width={900}
        open={snapshotDrawerVisible}
        onClose={() => {
          setSnapshotDrawerVisible(false)
          setSelectedStepIndex(null)
        }}
        extra={
          <Space>
            <Button onClick={() => {
              if (currentSnapshot && selectedStepIndex !== null) {
                // 全选有意义的元素
                const meaningfulIndices = currentSnapshot.elements
                  .map((el, idx) => (el.text || el.value || el.id || el.placeholder) ? idx : -1)
                  .filter(idx => idx !== -1)
                setSelectedElements({
                  ...selectedElements,
                  [selectedStepIndex]: meaningfulIndices
                })
              }
            }}>
              全选有意义元素
            </Button>
            <Button onClick={() => {
              if (selectedStepIndex !== null) {
                setSelectedElements({
                  ...selectedElements,
                  [selectedStepIndex]: []
                })
              }
            }}>
              清空选择
            </Button>
            <Button
              type="primary"
              onClick={() => {
                setSnapshotDrawerVisible(false)
                setGenerateModalVisible(true)
              }}
            >
              生成测试用例
            </Button>
          </Space>
        }
      >
        {currentSnapshot && (
          <div>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="URL">{currentSnapshot.url}</Descriptions.Item>
              <Descriptions.Item label="标题">{currentSnapshot.title}</Descriptions.Item>
              <Descriptions.Item label="元素总数">{currentSnapshot.elements_count}</Descriptions.Item>
              <Descriptions.Item label="已选择">
                {(selectedElements[selectedStepIndex!] || []).length}
              </Descriptions.Item>
            </Descriptions>

            <Table
              columns={[
                {
                  title: '选择',
                  key: 'select',
                  width: 80,
                  render: (_: any, record: PageElement, index: number) => (
                    <Checkbox
                      checked={(selectedElements[selectedStepIndex!] || []).includes(index)}
                      onChange={(e) => handleElementToggle(selectedStepIndex!, index, e.target.checked)}
                    />
                  )
                },
                {
                  title: '类型',
                  key: 'type',
                  width: 100,
                  render: (element: PageElement) => (
                    <Tag color={element.isButton ? 'blue' : element.isInput ? 'green' : 'default'}>
                      {getElementTypeLabel(element)}
                    </Tag>
                  )
                },
                {
                  title: '选择器',
                  dataIndex: 'selector',
                  key: 'selector',
                  ellipsis: true,
                  width: 200
                },
                {
                  title: '文本/值',
                  key: 'content',
                  render: (element: PageElement) => {
                    if (element.text) return <span>{element.text.substring(0, 50)}</span>
                    if (element.value) return <span style={{ color: '#52c41a' }}>{element.value.substring(0, 50)}</span>
                    if (element.placeholder) return <span style={{ color: '#999' }}>placeholder: {element.placeholder}</span>
                    if (element.id) return <span style={{ color: '#1890ff' }}>#{element.id}</span>
                    return '-'
                  }
                },
                {
                  title: '属性',
                  key: 'attrs',
                  render: (element: PageElement) => {
                    const attrs = []
                    if (element.id) attrs.push(`id: ${element.id}`)
                    if (element.className) attrs.push(`class: ${element.className.substring(0, 30)}`)
                    if (element.href) attrs.push(`href: ${element.href.substring(0, 30)}`)
                    return attrs.length > 0 ? attrs.join(', ') : '-'
                  }
                }
              ]}
              dataSource={currentSnapshot.elements}
              rowKey="index"
              pagination={{ pageSize: 50 }}
              size="small"
            />
          </div>
        )}
      </Drawer>

      {/* 生成测试用例Modal */}
      <Modal
        title="生成测试用例"
        open={generateModalVisible}
        onOk={handleGenerateTestCase}
        onCancel={() => {
          setGenerateModalVisible(false)
          form.resetFields()
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="用例名称"
            rules={[{ required: true, message: '请输入用例名称' }]}
          >
            <Input placeholder="请输入用例名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="用例描述"
          >
            <TextArea rows={3} placeholder="请输入用例描述" />
          </Form.Item>

          <Form.Item
            name="project_id"
            label="所属项目"
            rules={[{ required: true, message: '请选择项目' }]}
          >
            <Select placeholder="请选择项目">
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Alert
            message="检查点信息"
            description={`已选择 ${selectedCount} 个检查点，将作为断言添加到测试用例中。`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </Form>
      </Modal>

      {/* 操作页面元素Modal */}
      <Modal
        title="操作页面元素"
        open={operateModalVisible}
        onCancel={() => {
          setOperateModalVisible(false)
          operateForm.resetFields()
        }}
        footer={null}
        width={1000}
      >
        <Form form={operateForm} layout="vertical">
          <Form.Item
            name="action"
            label="操作类型"
            rules={[{ required: true, message: '请选择操作类型' }]}
          >
            <Select placeholder="请选择操作类型">
              <Option value="click">点击</Option>
              <Option value="fill">输入</Option>
              <Option value="select">选择</Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.action !== curr.action}>
            {({ getFieldValue }) => {
              const action = getFieldValue('action')
              
              return (
                <>
                  <Form.Item
                    name="selector"
                    label="选择元素"
                    rules={[{ required: true, message: '请选择或输入选择器' }]}
                    extra={currentSnapshotForOperate && (
                      <div style={{ marginTop: 8, maxHeight: 300, overflow: 'auto' }}>
                        <Table
                          size="small"
                          columns={[
                            {
                              title: '选择',
                              key: 'select',
                              width: 60,
                              render: (_: any, element: PageElement) => (
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => {
                                    operateForm.setFieldValue('selector', element.selector)
                                  }}
                                >
                                  选择
                                </Button>
                              )
                            },
                            {
                              title: '类型',
                              key: 'type',
                              width: 80,
                              render: (element: PageElement) => (
                                <Tag>{getElementTypeLabel(element)}</Tag>
                              )
                            },
                            {
                              title: '选择器',
                              dataIndex: 'selector',
                              key: 'selector',
                              ellipsis: true
                            },
                            {
                              title: '文本/值',
                              key: 'content',
                              render: (element: PageElement) => {
                                if (element.text) return element.text.substring(0, 50)
                                if (element.value) return element.value.substring(0, 50)
                                if (element.placeholder) return `placeholder: ${element.placeholder}`
                                if (element.id) return `#${element.id}`
                                return '-'
                              }
                            }
                          ]}
                          dataSource={currentSnapshotForOperate?.elements.filter(el => {
                            if (action === 'click') return el.isButton || el.isLink
                            if (action === 'fill') return el.isInput
                            if (action === 'select') return el.tag === 'select'
                            return true
                          }) || []}
                          rowKey="index"
                          pagination={{ pageSize: 10 }}
                        />
                      </div>
                    )}
                  >
                    <Input placeholder="或手动输入选择器（CSS选择器、XPath等）" />
                  </Form.Item>

                  {(action === 'fill' || action === 'select') && (
                    <Form.Item
                      name="value"
                      label={action === 'fill' ? '输入值' : '选择值'}
                      rules={[{ required: true, message: `请输入${action === 'fill' ? '输入值' : '选择值'}` }]}
                    >
                      <Input placeholder={action === 'fill' ? '请输入要填充的值' : '请输入要选择的值'} />
                    </Form.Item>
                  )}

                  <Form.Item>
                    <Space>
                      {action === 'click' && (
                        <Button
                          type="primary"
                          onClick={() => {
                            const selector = operateForm.getFieldValue('selector')
                            if (selector) {
                              handleClickElement(selector)
                            }
                          }}
                        >
                          执行点击
                        </Button>
                      )}
                      {action === 'fill' && (
                        <Button type="primary" onClick={handleFillElement}>
                          执行输入
                        </Button>
                      )}
                      {action === 'select' && (
                        <Button type="primary" onClick={handleSelectElement}>
                          执行选择
                        </Button>
                      )}
                      <Button onClick={() => {
                        setOperateModalVisible(false)
                        operateForm.resetFields()
                      }}>
                        取消
                      </Button>
                    </Space>
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

export default UIRecording
