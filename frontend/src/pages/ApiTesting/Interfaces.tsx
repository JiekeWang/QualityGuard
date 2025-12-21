import { useState, useEffect } from 'react'
import { Card, Button, Table, Space, Input, Tag, Modal, Form, Select, message, Popconfirm, Tabs, InputNumber, Dropdown } from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, CopyOutlined, MoreOutlined, ImportOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { interfaceService, Interface, InterfaceCreate, InterfaceUpdate } from '../../store/services/interface'
import { projectService } from '../../store/services/project'

const { Option } = Select
const { TextArea } = Input

const Interfaces: React.FC = () => {
  const [interfaces, setInterfaces] = useState<Interface[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedProject, setSelectedProject] = useState<number | undefined>()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingInterface, setEditingInterface] = useState<Interface | null>(null)
  const [form] = Form.useForm()
  const [projects, setProjects] = useState<any[]>([])
  const [curlImportVisible, setCurlImportVisible] = useState(false)
  const [curlCommand, setCurlCommand] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  useEffect(() => {
    loadProjects()
    loadInterfaces()
  }, [])

  useEffect(() => {
    loadInterfaces()
  }, [searchText, selectedProject])

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects()
      setProjects(data)
    } catch (error) {
      console.error('加载项目列表失败:', error)
    }
  }

  const loadInterfaces = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedProject) params.project_id = selectedProject
      if (searchText) params.search = searchText
      const data = await interfaceService.getInterfaces(params)
      console.log('接口列表数据:', data) // 调试日志
      setInterfaces(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error('加载接口列表失败:', error)
      console.error('错误详情:', error.response?.data)
      message.error('加载接口列表失败: ' + (error.response?.data?.detail || error.message))
      setInterfaces([]) // 确保即使出错也有空数组
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingInterface(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: Interface) => {
    setEditingInterface(record)
    form.setFieldsValue({
      name: record.name,
      method: record.method,
      path: record.path,
      description: record.description,
      project_id: record.project_id,
      status: record.status,
      module: record.module,
      tags: record.tags || [],
      headers: record.headers ? JSON.stringify(record.headers, null, 2) : '',
      query_params: record.query_params ? JSON.stringify(record.query_params, null, 2) : '',
      path_params: record.path_params ? JSON.stringify(record.path_params, null, 2) : '',
      body_params: record.body_params ? JSON.stringify(record.body_params, null, 2) : '',
      form_params: record.form_params ? JSON.stringify(record.form_params, null, 2) : '',
      response_schema: record.response_schema ? JSON.stringify(record.response_schema, null, 2) : '',
      response_example: record.response_example ? JSON.stringify(record.response_example, null, 2) : '',
      timeout: record.timeout || 30,
      retry_strategy: record.retry_strategy ? JSON.stringify(record.retry_strategy, null, 2) : '',
      pre_script: record.pre_script || '',
      post_script: record.post_script || '',
    })
    setModalVisible(true)
  }

  const handleClone = async (record: Interface) => {
    try {
      const cloneData: InterfaceCreate = {
        name: `${record.name} (副本)`,
        method: record.method,
        path: record.path,
        description: record.description,
        project_id: record.project_id,
        status: record.status,
        module: record.module,
        tags: record.tags || [],
        headers: record.headers || {},
        query_params: record.query_params || {},
        path_params: record.path_params || {},
        body_params: record.body_params || {},
        form_params: record.form_params || {},
        response_schema: record.response_schema || {},
        response_example: record.response_example || {},
        timeout: record.timeout || 30,
        retry_strategy: record.retry_strategy || {},
        pre_script: record.pre_script || '',
        post_script: record.post_script || '',
      }
      await interfaceService.createInterface(cloneData)
      message.success('克隆成功')
      loadInterfaces()
    } catch (error: any) {
      message.error('克隆失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const parseCurlCommand = (curl: string) => {
    try {
      const result: any = {
        method: 'GET',
        path: '',
        headers: {},
        query_params: {},
        body_params: {},
        form_params: {},
      }

      // 规范化CURL命令：移除反斜杠换行符，合并为单行，但保留必要的空格
      let normalizedCurl = curl
        .replace(/\\\s*\n\s*/g, ' ')  // 移除反斜杠换行符
        .replace(/\n\s*/g, ' ')        // 移除普通换行符
        .replace(/\s+/g, ' ')          // 合并多个空格为单个空格
        .trim()

      // 提取请求方法
      const methodMatch = normalizedCurl.match(/-X\s+(\w+)/i) || normalizedCurl.match(/--request\s+(\w+)/i)
      if (methodMatch) {
        result.method = methodMatch[1].toUpperCase()
      } else if (normalizedCurl.includes('--data-raw') || normalizedCurl.match(/\s--data\s/) || normalizedCurl.match(/\s-d\s/)) {
        result.method = 'POST'
      } else if (normalizedCurl.match(/\s--form\s/) || normalizedCurl.match(/\s-F\s/)) {
        result.method = 'POST'
      }

      // 提取URL - 支持多种格式：--url参数、直接URL、单引号、双引号
      let urlMatch = null
      
      // 优先匹配 --url 参数（单引号）
      urlMatch = normalizedCurl.match(/--url\s+[']([^']+)[']/i)
      if (!urlMatch) {
        // --url 参数（双引号）
        urlMatch = normalizedCurl.match(/--url\s+["]([^"]+)["]/i)
      }
      if (!urlMatch) {
        // --url 参数（无引号）
        urlMatch = normalizedCurl.match(/--url\s+([^\s]+)/i)
      }
      if (!urlMatch) {
        // 单引号URL（可能包含查询参数）
        urlMatch = normalizedCurl.match(/curl\s+[']([^']+)[']/i)
      }
      if (!urlMatch) {
        // 双引号URL
        urlMatch = normalizedCurl.match(/curl\s+["]([^"]+)["]/i)
      }
      if (!urlMatch) {
        // 无引号URL（需要找到第一个参数之前的部分，排除curl命令本身）
        // 匹配curl后面的第一个非参数项（不以-开头的）
        urlMatch = normalizedCurl.match(/curl\s+([^\s-]+)/i)
      }

      if (urlMatch) {
        let url = urlMatch[1].trim()
        // 移除引号（如果还有的话）
        url = url.replace(/^['"]|['"]$/g, '')
        
        try {
          // 如果URL不包含协议，添加https://
          let fullUrl = url
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            fullUrl = 'https://' + url
          }
          
          const urlObj = new URL(fullUrl)
          // 确保path不为空，如果为空则使用/
          result.path = urlObj.pathname || '/'
          
          // 提取查询参数
          urlObj.searchParams.forEach((value, key) => {
            result.query_params[key] = value
          })
        } catch (e) {
          // URL解析失败，手动提取路径和查询参数
          console.warn('URL解析失败，尝试手动提取:', e, url)
          
          // 提取协议、主机、路径
          // 匹配 http://host:port/path?query 或 https://host:port/path?query
          const urlPattern = /(?:https?:\/\/)?([^\/\s]+)(\/[^?\s]*)?(\?[^#\s]*)?/
          const urlParts = url.match(urlPattern)
          
          if (urlParts) {
            // 提取路径部分
            if (urlParts[2]) {
              result.path = urlParts[2].split('?')[0]  // 移除查询参数部分
            } else {
              result.path = '/'  // 如果没有路径，默认为根路径
            }
            
            // 手动提取查询参数
            if (urlParts[3]) {
              const queryString = urlParts[3].substring(1)  // 移除开头的?
              queryString.split('&').forEach(param => {
                const equalIndex = param.indexOf('=')
                if (equalIndex > 0) {
                  const key = decodeURIComponent(param.substring(0, equalIndex))
                  const value = decodeURIComponent(param.substring(equalIndex + 1) || '')
                  if (key) {
                    result.query_params[key] = value
                  }
                } else if (param) {
                  // 没有值的参数
                  result.query_params[decodeURIComponent(param)] = ''
                }
              })
            }
          } else {
            // 如果完全无法解析，尝试提取路径部分
            const pathMatch = url.match(/\/[^?\s]*/)
            if (pathMatch) {
              result.path = pathMatch[0].split('?')[0]
            } else {
              // 如果连路径都提取不到，设置为根路径
              result.path = '/'
            }
          }
        }
      } else {
        // 如果完全无法提取URL，设置默认路径
        console.warn('无法从curl命令中提取URL')
        result.path = '/'
      }

      // 提取Headers - 支持单引号和双引号，支持多行
      // 先处理单引号格式
      const singleQuoteHeaderPattern = /-H\s+[']([^']+)[']/gi
      let match
      while ((match = singleQuoteHeaderPattern.exec(normalizedCurl)) !== null) {
        const header = match[1]
        const colonIndex = header.indexOf(':')
        if (colonIndex > 0) {
          const key = header.substring(0, colonIndex).trim()
          const value = header.substring(colonIndex + 1).trim()
          if (key && value) {
            result.headers[key] = value
          }
        }
      }

      // 处理双引号格式
      const doubleQuoteHeaderPattern = /-H\s+["]([^"]+)["]/gi
      while ((match = doubleQuoteHeaderPattern.exec(normalizedCurl)) !== null) {
        const header = match[1]
        const colonIndex = header.indexOf(':')
        if (colonIndex > 0) {
          const key = header.substring(0, colonIndex).trim()
          const value = header.substring(colonIndex + 1).trim()
          if (key && value) {
            result.headers[key] = value
          }
        }
      }

      // 处理--header格式
      const headerPattern = /--header\s+['"]([^'"]+)['"]/gi
      while ((match = headerPattern.exec(normalizedCurl)) !== null) {
        const header = match[1]
        const colonIndex = header.indexOf(':')
        if (colonIndex > 0) {
          const key = header.substring(0, colonIndex).trim()
          const value = header.substring(colonIndex + 1).trim()
          if (key && value) {
            result.headers[key] = value
          }
        }
      }

      // 提取Body数据 - 优先处理--data-raw（支持多行JSON）
      // 使用非贪婪匹配，但需要匹配到最后一个引号
      let dataMatch = null
      
      // 先尝试匹配单引号包裹的多行数据（非贪婪匹配到下一个单引号或行尾）
      const singleQuoteDataPattern = /--data-raw\s+[']([\s\S]*?)['](?:\s|$)/i
      dataMatch = normalizedCurl.match(singleQuoteDataPattern)
      
      if (!dataMatch) {
        // 尝试匹配双引号包裹的多行数据
        const doubleQuoteDataPattern = /--data-raw\s+["]([\s\S]*?)["](?:\s|$)/i
        dataMatch = normalizedCurl.match(doubleQuoteDataPattern)
      }
      
      if (!dataMatch) {
        // 尝试其他data格式（单引号）
        const singleQuoteOtherPattern = /(?:-d|--data)\s+[']([\s\S]*?)['](?:\s|$)/i
        dataMatch = normalizedCurl.match(singleQuoteOtherPattern)
      }
      
      if (!dataMatch) {
        // 尝试其他data格式（双引号）
        const doubleQuoteOtherPattern = /(?:-d|--data)\s+["]([\s\S]*?)["](?:\s|$)/i
        dataMatch = normalizedCurl.match(doubleQuoteOtherPattern)
      }

      if (dataMatch) {
        let data = dataMatch[1]
        // 移除可能的引号（虽然正则已经处理了，但保险起见）
        data = data.replace(/^['"]|['"]$/g, '')
        
        // 检查Content-Type
        const contentType = result.headers['Content-Type'] || result.headers['content-type'] || ''
        
        if (contentType.includes('application/json') || (!contentType && (data.trim().startsWith('{') || data.trim().startsWith('[')))) {
          // JSON格式
          try {
            result.body_params = JSON.parse(data)
          } catch (e) {
            console.warn('JSON解析失败，作为原始数据:', e)
            result.body_params = { raw: data }
          }
          if (!result.headers['Content-Type'] && !result.headers['content-type']) {
            result.headers['Content-Type'] = 'application/json'
          }
        } else if (contentType.includes('application/x-www-form-urlencoded') || (data.includes('=') && data.includes('&') && !data.includes('{'))) {
          // 表单数据
          const formPairs = data.split('&')
          formPairs.forEach(pair => {
            const equalIndex = pair.indexOf('=')
            if (equalIndex > 0) {
              const key = decodeURIComponent(pair.substring(0, equalIndex))
              const value = decodeURIComponent(pair.substring(equalIndex + 1) || '')
              if (key) {
                result.form_params[key] = value
              }
            }
          })
          if (!result.headers['Content-Type'] && !result.headers['content-type']) {
            result.headers['Content-Type'] = 'application/x-www-form-urlencoded'
          }
        } else {
          // 其他格式，作为原始数据
          result.body_params = { raw: data }
        }
      }

      // 提取Form数据（multipart/form-data）
      const formPatterns = [
        /-F\s+['"]([^'"]+)['"]/gi,
        /--form\s+['"]([^'"]+)['"]/gi,
      ]

      for (const pattern of formPatterns) {
        while ((match = pattern.exec(normalizedCurl)) !== null) {
          const formData = match[1]
          const equalIndex = formData.indexOf('=')
          if (equalIndex > 0) {
            const key = formData.substring(0, equalIndex)
            const value = formData.substring(equalIndex + 1) || ''
            if (key) {
              result.form_params[key] = value
            }
          }
        }
      }

      // 如果使用了-F或--form，设置Content-Type
      if ((normalizedCurl.includes('-F') || normalizedCurl.includes('--form')) && Object.keys(result.form_params).length > 0) {
        if (!result.headers['Content-Type'] && !result.headers['content-type']) {
          result.headers['Content-Type'] = 'multipart/form-data'
        }
      }

      console.log('CURL解析结果:', result)
      
      // 验证必要字段
      if (!result.path) {
        console.warn('警告: 未能提取URL路径')
      }
      
      return result
    } catch (error: any) {
      console.error('解析CURL命令失败:', error)
      console.error('原始CURL命令:', curl)
      throw new Error(`CURL命令格式不正确: ${error.message || '未知错误'}，请检查后重试`)
    }
  }

  const handleCurlImport = () => {
    if (!curlCommand.trim()) {
      message.warning('请输入CURL命令')
      return
    }

    try {
      const parsed = parseCurlCommand(curlCommand)
      
      console.log('解析后的数据:', parsed)
      
      // 填充表单 - 确保所有字段都被正确设置
      const formValues: any = {
        method: parsed.method || 'GET',
        path: parsed.path || '',
      }

      // 设置Headers
      if (Object.keys(parsed.headers).length > 0) {
        formValues.headers = JSON.stringify(parsed.headers, null, 2)
      } else {
        formValues.headers = ''
      }

      // 设置Query参数
      if (Object.keys(parsed.query_params).length > 0) {
        formValues.query_params = JSON.stringify(parsed.query_params, null, 2)
      } else {
        formValues.query_params = ''
      }

      // 设置Body参数
      if (Object.keys(parsed.body_params).length > 0) {
        // 如果是对象，转换为JSON字符串
        if (typeof parsed.body_params === 'object' && parsed.body_params !== null) {
          formValues.body_params = JSON.stringify(parsed.body_params, null, 2)
        } else {
          formValues.body_params = String(parsed.body_params)
        }
      } else {
        formValues.body_params = ''
      }

      // 设置Form参数
      if (Object.keys(parsed.form_params).length > 0) {
        formValues.form_params = JSON.stringify(parsed.form_params, null, 2)
      } else {
        formValues.form_params = ''
      }

      console.log('准备填充的表单值:', formValues)

      // 设置表单值
      form.setFieldsValue(formValues)
      
      // 显示成功消息，并提示查看请求配置tab
      message.success('CURL命令导入成功！请切换到"请求配置"标签页查看导入的数据')
      setCurlImportVisible(false)
      setCurlCommand('')
    } catch (error: any) {
      console.error('CURL导入错误:', error)
      message.error('导入失败: ' + (error.message || 'CURL命令格式不正确'))
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await interfaceService.deleteInterface(id)
      message.success('删除成功')
      loadInterfaces()
      // 如果删除的项在选中列表中，从选中列表中移除
      setSelectedRowKeys(prev => prev.filter(key => key !== id))
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的接口')
      return
    }

    try {
      // 批量删除：循环调用删除接口
      const deletePromises = selectedRowKeys.map(id => 
        interfaceService.deleteInterface(Number(id))
      )
      await Promise.all(deletePromises)
      message.success(`成功删除 ${selectedRowKeys.length} 个接口`)
      setSelectedRowKeys([])
      loadInterfaces()
    } catch (error: any) {
      message.error('批量删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const parseJsonField = (value: string, allowArray: boolean = false): any => {
    if (!value || value.trim() === '') {
      // body_params可以是数组或对象，其他字段默认返回对象
      return allowArray ? [] : {}
    }
    try {
      const parsed = JSON.parse(value)
      // 如果允许数组，返回解析后的值（可能是数组或对象）
      if (allowArray) {
        return parsed
      }
      // 如果不允许数组，但解析出来是数组，转换为对象
      if (Array.isArray(parsed)) {
        return {}
      }
      return parsed
    } catch (e) {
      throw new Error('JSON格式错误: ' + value)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      // 解析JSON字段
      const jsonFields = ['headers', 'query_params', 'path_params', 'body_params', 'form_params', 'response_schema', 'response_example', 'retry_strategy']
      const processedValues: any = { ...values }
      
      for (const field of jsonFields) {
        if (values[field]) {
          // body_params支持数组类型
          processedValues[field] = parseJsonField(values[field], field === 'body_params')
        } else {
          // body_params可以是空数组，其他字段默认空对象
          processedValues[field] = field === 'body_params' ? [] : {}
        }
      }
      
      if (editingInterface) {
        const updateData: InterfaceUpdate = {
          ...processedValues,
          project_id: values.project_id,
        }
        await interfaceService.updateInterface(editingInterface.id, updateData)
        message.success('更新成功')
        // 如果项目发生了变化，需要更新selectedProject状态
        if (values.project_id && values.project_id !== editingInterface.project_id) {
          setSelectedProject(values.project_id)
        }
      } else {
        const createData: InterfaceCreate = {
          ...processedValues,
          project_id: values.project_id,
        }
        await interfaceService.createInterface(createData)
        message.success('创建成功')
      }
      setModalVisible(false)
      form.resetFields()
      await loadInterfaces()
    } catch (error: any) {
      if (error.errorFields) {
        return // 表单验证错误
      }
      console.error('接口操作失败:', error)
      message.error((editingInterface ? '更新' : '创建') + '失败: ' + (error.message || error.response?.data?.detail || '未知错误'))
    }
  }

  const columns = [
    {
      title: '接口名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '请求方法',
      dataIndex: 'method',
      key: 'method',
      width: 100,
      render: (method: string) => {
        const colors: Record<string, string> = {
          GET: 'blue',
          POST: 'green',
          PUT: 'orange',
          DELETE: 'red',
          PATCH: 'purple',
          HEAD: 'cyan',
          OPTIONS: 'default',
        }
        return <Tag color={colors[method] || 'default'}>{method}</Tag>
      },
    },
    {
      title: '接口路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
    },
    {
      title: '项目',
      dataIndex: 'project_id',
      key: 'project',
      render: (projectId: number) => {
        const project = projects.find(p => p.id === projectId)
        return project?.name || projectId
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors: Record<string, string> = {
          active: 'success',
          inactive: 'default',
          deprecated: 'warning',
        }
        const labels: Record<string, string> = {
          active: '活跃',
          inactive: '停用',
          deprecated: '已废弃',
        }
        return <Tag color={colors[status] || 'default'}>{labels[status] || status}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: Interface) => {
        const menuItems: MenuProps['items'] = [
          {
            key: 'edit',
            label: '编辑',
            icon: <EditOutlined />,
            onClick: () => handleEdit(record),
          },
          {
            key: 'clone',
            label: '克隆',
            icon: <CopyOutlined />,
            onClick: () => handleClone(record),
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            label: (
              <Popconfirm
                title="确定要删除这个接口吗？"
                onConfirm={() => handleDelete(record.id)}
                okText="确定"
                cancelText="取消"
                onCancel={(e) => e?.stopPropagation()}
              >
                <span style={{ color: '#ff4d4f' }}>删除</span>
              </Popconfirm>
            ),
            icon: <DeleteOutlined />,
            danger: true,
          },
        ]

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()}>
              操作
            </Button>
          </Dropdown>
        )
      },
    },
  ]

  return (
    <div style={{ padding: '16px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>接口仓库</h2>
        <Space>
          <Select
            placeholder="选择项目"
            allowClear
            style={{ width: 200 }}
            value={selectedProject}
            onChange={setSelectedProject}
          >
            {projects.map(project => (
              <Option key={project.id} value={project.id}>
                {project.name}
              </Option>
            ))}
          </Select>
          <Input
            placeholder="搜索接口"
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Space>
            <Popconfirm
              title={selectedRowKeys.length > 0 ? `确定要删除选中的 ${selectedRowKeys.length} 个接口吗？` : '请先选择要删除的接口'}
              onConfirm={handleBatchDelete}
              okText="确定"
              cancelText="取消"
              disabled={selectedRowKeys.length === 0}
            >
              <Button 
                danger 
                icon={<DeleteOutlined />}
                disabled={selectedRowKeys.length === 0}
              >
                批量删除{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
              </Button>
            </Popconfirm>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新建接口
            </Button>
          </Space>
        </Space>
      </div>
      <Card>
        <Table
          columns={columns}
          dataSource={interfaces}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          rowSelection={{
            selectedRowKeys,
            onChange: (selectedKeys) => {
              setSelectedRowKeys(selectedKeys)
            },
            getCheckboxProps: (record) => ({
              name: record.name,
            }),
          }}
        />
      </Card>

      <Modal
        title={editingInterface ? '编辑接口' : '新建接口'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setCurlImportVisible(false)
          setCurlCommand('')
        }}
        width={900}
        style={{ top: 20 }}
        bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
      >
        <Modal
          title="导入CURL命令"
          open={curlImportVisible}
          onOk={handleCurlImport}
          onCancel={() => {
            setCurlImportVisible(false)
            setCurlCommand('')
          }}
          width={700}
          okText="导入"
          cancelText="取消"
        >
          <div style={{ marginBottom: 16 }}>
            <p>请粘贴CURL命令，系统将自动解析并填充接口信息：</p>
            <TextArea
              rows={10}
              placeholder={'例如: curl -X POST "https://api.example.com/users" -H "Content-Type: application/json" -d \'{"name":"test"}\''}
              value={curlCommand}
              onChange={(e) => setCurlCommand(e.target.value)}
              style={{ fontFamily: 'monospace' }}
            />
          </div>
        </Modal>
        
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button 
            type="primary"
            icon={<ImportOutlined />} 
            onClick={() => setCurlImportVisible(true)}
          >
            导入CURL
          </Button>
        </div>
        
        <Form form={form} layout="vertical">
          <Tabs defaultActiveKey="basic" type="card" items={[
            {
              key: 'basic',
              label: '基础信息',
              children: (
                <>
                  <Form.Item
                    name="name"
                    label="接口名称"
                    rules={[{ required: true, message: '请输入接口名称' }]}
                  >
                    <Input placeholder="请输入接口名称" />
                  </Form.Item>
                  <Form.Item
                    name="method"
                    label="请求方法"
                    rules={[{ required: true, message: '请选择请求方法' }]}
                  >
                    <Select placeholder="请选择请求方法">
                      <Option value="GET">GET</Option>
                      <Option value="POST">POST</Option>
                      <Option value="PUT">PUT</Option>
                      <Option value="DELETE">DELETE</Option>
                      <Option value="PATCH">PATCH</Option>
                      <Option value="HEAD">HEAD</Option>
                      <Option value="OPTIONS">OPTIONS</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="path"
                    label="接口路径"
                    rules={[{ required: true, message: '请输入接口路径' }]}
                  >
                    <Input placeholder="/api/v1/users" />
                  </Form.Item>
                  <Form.Item
                    name="project_id"
                    label="项目"
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
                  <Form.Item name="description" label="描述">
                    <TextArea rows={3} placeholder="请输入接口描述" />
                  </Form.Item>
                  <Form.Item name="status" label="状态" initialValue="active">
                    <Select>
                      <Option value="active">活跃</Option>
                      <Option value="inactive">停用</Option>
                      <Option value="deprecated">已废弃</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item name="module" label="模块">
                    <Input placeholder="请输入模块名称" />
                  </Form.Item>
                  <Form.Item name="tags" label="标签">
                    <Select mode="tags" placeholder="输入标签后按回车" />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'request',
              label: '请求配置',
              children: (
                <>
                  <Form.Item 
                    name="headers" 
                    label="Headers配置"
                    tooltip='JSON格式，例如: {"Content-Type": "application/json", "Authorization": "Bearer token"}'
                  >
                    <TextArea 
                      rows={6} 
                      placeholder='{"Content-Type": "application/json"}' 
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                  <Form.Item 
                    name="query_params" 
                    label="Query参数"
                    tooltip='JSON格式，例如: {"page": 1, "size": 10}'
                  >
                    <TextArea 
                      rows={6} 
                      placeholder='{"page": 1, "size": 10}' 
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                  <Form.Item 
                    name="path_params" 
                    label="Path参数"
                    tooltip='JSON格式，例如: {"id": "{userId}"}'
                  >
                    <TextArea 
                      rows={6} 
                      placeholder='{"id": "{userId}"}' 
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                  <Form.Item 
                    name="body_params" 
                    label="Body参数"
                    tooltip='JSON格式，例如: {"name": "string", "age": 18}'
                  >
                    <TextArea 
                      rows={6} 
                      placeholder='{"name": "string", "age": 18}' 
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                  <Form.Item 
                    name="form_params" 
                    label="Form参数"
                    tooltip='JSON格式，例如: {"username": "admin", "password": "123456"}'
                  >
                    <TextArea 
                      rows={6} 
                      placeholder='{"username": "admin", "password": "123456"}' 
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'response',
              label: '响应配置',
              children: (
                <>
                  <Form.Item 
                    name="response_schema" 
                    label="响应Schema"
                    tooltip="JSON格式，定义响应数据结构"
                  >
                    <TextArea 
                      rows={8} 
                      placeholder='{"type": "object", "properties": {"code": {"type": "number"}, "message": {"type": "string"}}}' 
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                  <Form.Item 
                    name="response_example" 
                    label="响应示例"
                    tooltip="JSON格式，示例响应数据"
                  >
                    <TextArea 
                      rows={8} 
                      placeholder='{"code": 200, "message": "success", "data": {}}' 
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'advanced',
              label: '高级配置',
              children: (
                <>
                  <Form.Item 
                    name="timeout" 
                    label="超时时间（秒）"
                    initialValue={30}
                  >
                    <InputNumber min={1} max={300} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item 
                    name="retry_strategy" 
                    label="重试策略"
                    tooltip='JSON格式，例如: {"max_retries": 3, "retry_delay": 1000}'
                  >
                    <TextArea 
                      rows={6} 
                      placeholder='{"max_retries": 3, "retry_delay": 1000}' 
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                  <Form.Item 
                    name="pre_script" 
                    label="前置脚本"
                    tooltip="执行请求前运行的脚本"
                  >
                    <TextArea 
                      rows={6} 
                      placeholder="// 前置脚本示例&#10;console.log('执行前置脚本');" 
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                  <Form.Item 
                    name="post_script" 
                    label="后置脚本"
                    tooltip="执行请求后运行的脚本"
                  >
                    <TextArea 
                      rows={6} 
                      placeholder="// 后置脚本示例&#10;console.log('执行后置脚本');" 
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                </>
              ),
            },
          ]} />
        </Form>
      </Modal>
    </div>
  )
}

export default Interfaces
