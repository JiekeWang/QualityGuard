import { useState, useEffect, useCallback, useMemo } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, message, Popconfirm, Tag, Card, Tabs, InputNumber, Dropdown, Upload, DatePicker, Radio } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, SearchOutlined, CopyOutlined, MoreOutlined, ExportOutlined, ImportOutlined, DownloadOutlined, StarOutlined, StarFilled, FileTextOutlined, LinkOutlined, HistoryOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { testCaseService, TestCase, TestCaseCreate, TestCaseUpdate } from '../store/services/testCase'
import { projectService } from '../store/services/project'
import { testExecutionService } from '../store/services/testExecution'
import { interfaceService, type Interface } from '../store/services/interface'
import { testCaseCollectionService, TestCaseCollection, TestCaseCollectionCreate, TestCaseCollectionUpdate } from '../store/services/testCaseCollection'
import { userService, UserResponse } from '../store/services/user'
import { directoryService, Directory } from '../store/services/directory'
import { moduleService, Module } from '../store/services/module'
import { dataDriverService, DataSource, DataTemplate } from '../store/services/dataDriver'
import { testDataConfigService, TestDataConfigListItem, TestDataConfig } from '../store/services/testDataConfig'
import { api } from '../store/services/api'
import dayjs from 'dayjs'
import { 
  parsePostmanCollection, 
  parseSwagger, 
  parseExcel, 
  convertToPostmanCollection, 
  convertToExcel, 
  convertToHTML 
} from '../utils/importExport'

const { Option } = Select
const { TextArea } = Input

const TestCases: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCase, setEditingCase] = useState<TestCase | null>(null)
  const [form] = Form.useForm()
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<number | undefined>()
  const [selectedType, setSelectedType] = useState<string | undefined>()
  const [selectedTag, setSelectedTag] = useState<string | undefined>()
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>()
  const [selectedModule, setSelectedModule] = useState<string | undefined>()
  const [selectedDirectory, setSelectedDirectory] = useState<number | undefined>()
  const [viewMode, setViewMode] = useState<'all' | 'my_created' | 'my_owned' | 'my_favorite'>('all')
  const [dateRange, setDateRange] = useState<[string, string] | null>(null)
  const [searchText, setSearchText] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [interfaces, setInterfaces] = useState<any[]>([])
  const [batchExecuteVisible, setBatchExecuteVisible] = useState(false)
  const [batchEditVisible, setBatchEditVisible] = useState(false)
  const [batchEditForm] = Form.useForm()
  const [batchMoveVisible, setBatchMoveVisible] = useState(false)
  const [batchMoveForm] = Form.useForm()
  const [batchCopyVisible, setBatchCopyVisible] = useState(false)
  const [batchCopyForm] = Form.useForm()
  const [allTags, setAllTags] = useState<string[]>([])
  const [collections, setCollections] = useState<TestCaseCollection[]>([])
  const [collectionModalVisible, setCollectionModalVisible] = useState(false)
  const [editingCollection, setEditingCollection] = useState<TestCaseCollection | null>(null)
  const [collectionForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState<'cases' | 'collections'>('cases')
  const [users, setUsers] = useState<UserResponse[]>([])
  const [directories, setDirectories] = useState<Directory[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [batchImportVisible, setBatchImportVisible] = useState(false)
  const [batchSyncVisible, setBatchSyncVisible] = useState(false)
  const [referenceModalVisible, setReferenceModalVisible] = useState(false)
  const [templateModalVisible, setTemplateModalVisible] = useState(false)
  const [referencingCase, setReferencingCase] = useState<TestCase | null>(null)
  const [templateForm] = Form.useForm()
  const [referenceForm] = Form.useForm()
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [dataTemplates, setDataTemplates] = useState<DataTemplate[]>([])
  const [versionModalVisible, setVersionModalVisible] = useState(false)
  const [selectedTestCaseForVersion, setSelectedTestCaseForVersion] = useState<TestCase | null>(null)
  const [versions, setVersions] = useState<any[]>([])
  const [versionForm] = Form.useForm()
  const [compareModalVisible, setCompareModalVisible] = useState(false)
  const [compareResult, setCompareResult] = useState<any>(null)
  const [isDataDriven, setIsDataDriven] = useState(false)
  const [dataDriverValue, setDataDriverValue] = useState<string>('')
  const [testDataConfigs, setTestDataConfigs] = useState<TestDataConfigListItem[]>([])
  const [associatedConfigs, setAssociatedConfigs] = useState<TestDataConfig[]>([])
  const [loadingConfigs, setLoadingConfigs] = useState(false)

  useEffect(() => {
    loadProjects()
    loadTestCases()
    loadCollections()
    loadUsers()
    if (selectedProject) {
      loadInterfaces()
      loadDirectories()
      loadModules()
      loadDataSources()
      loadDataTemplates()
      loadTestDataConfigs()
    }
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadDirectories()
      loadModules()
      loadDataSources()
      loadDataTemplates()
      loadTestDataConfigs()
    }
  }, [selectedProject])

  useEffect(() => {
    if (selectedProject) {
      loadInterfaces()
    }
  }, [selectedProject])

  useEffect(() => {
    loadTestCases()
  }, [selectedProject, selectedType, selectedTag, selectedStatus, selectedModule, selectedDirectory, viewMode, dateRange, searchText])

  useEffect(() => {
    // 提取所有标签
    const tags = new Set<string>()
    if (Array.isArray(testCases)) {
      testCases.forEach(tc => {
        if (tc && tc.tags && Array.isArray(tc.tags)) {
          tc.tags.forEach(tag => {
            if (tag && typeof tag === 'string') {
              tags.add(tag)
            }
          })
        }
      })
    }
    setAllTags(Array.from(tags).sort())
  }, [testCases])

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects()
      if (Array.isArray(data)) {
        setProjects(data)
      } else {
        console.warn('项目列表数据格式错误，期望数组，实际:', typeof data, data)
        setProjects([])
      }
    } catch (error) {
      console.error('加载项目列表失败:', error)
      setProjects([]) // 确保即使出错也有空数组
    }
  }

  const loadTestCases = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedProject) {
        params.project_id = selectedProject
      }
      if (selectedType) {
        params.test_type = selectedType
      }
      if (selectedStatus) {
        params.status = selectedStatus
      }
      if (selectedModule) {
        params.module = selectedModule
      }
      if (searchText) {
        params.search = searchText
      }
      
      // 视图模式筛选
      if (viewMode === 'my_created') {
        params.created_by = 0  // 特殊值0表示当前用户
      } else if (viewMode === 'my_owned') {
        params.owner_id = 0  // 特殊值0表示当前用户
      } else if (viewMode === 'my_favorite') {
        params.favorite = true
      }
      
      // 时间范围筛选
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.start_date = dateRange[0]
        params.end_date = dateRange[1]
      }
      
      const data = await testCaseService.getTestCases(params)
      console.log('测试用例列表数据:', data) // 调试日志
      if (Array.isArray(data)) {
        // 客户端标签筛选
        let filteredData = data
        if (selectedTag) {
          filteredData = data.filter(tc => 
            tc.tags && Array.isArray(tc.tags) && tc.tags.includes(selectedTag)
          )
        }
        setTestCases(filteredData)
      } else {
        console.warn('测试用例列表数据格式错误，期望数组，实际:', typeof data, data)
        setTestCases([])
      }
    } catch (error: any) {
      console.error('加载测试用例列表失败:', error)
      console.error('错误详情:', error.response?.data)
      message.error('加载测试用例列表失败: ' + (error.response?.data?.detail || error.message))
      setTestCases([]) // 确保即使出错也有空数组
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingCase(null)
    form.resetFields()
    setIsDataDriven(false)
    setAssociatedConfigs([])
    setModalVisible(true)
  }

  const handleEdit = (record: TestCase) => {
    console.log('[调试] 打开编辑窗口，测试用例数据：', record)
    console.log('[调试] config:', record.config)
    console.log('[调试] interface_id:', record.config?.interface_id)
    console.log('[调试] is_data_driven:', record.is_data_driven)
    console.log('[调试] data_driver:', record.data_driver)
    
    setEditingCase(record)
    setSelectedProject(record.project_id)
    const config = record.config || {}
    const steps = record.steps || []
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      project_id: record.project_id,
      test_type: record.test_type,
      tags: record.tags || [],
      priority: config.priority || 'medium',
      interface_id: config.interface_id,
      module: record.module,
      directory_id: record.directory_id,
      status: record.status || 'active',
      is_multi_interface: record.is_multi_interface || false,
      workflow: record.workflow ? JSON.stringify(record.workflow, null, 2) : '',
      // 请求配置
      request_config: config.request ? JSON.stringify(config.request, null, 2) : '',
      // 断言配置（JSON + 可视化表格）
      assertions: config.assertions ? JSON.stringify(config.assertions, null, 2) : '',
      assertions_list: Array.isArray(config.assertions)
        ? config.assertions.map((a: any) => ({
            type: a.type || 'status_code',
            path: a.path,
            operator: a.operator || 'equal',
            // 后端中的 null 在表单里用空字符串展示，避免把 "null" 当成字符串
            expected: a.expected === null || a.expected === undefined ? '' : a.expected,
          }))
        : [],
      // 关联提取
      extractors: config.extractors ? JSON.stringify(config.extractors, null, 2) : '',
      // 高级配置
      timeout: config.timeout || 30,
      retry_count: config.retry_count || 0,
      pre_script: config.pre_script || '',
      post_script: config.post_script || '',
      // 高级配置 JSON
      advanced_config: '',
      // 数据驱动配置
      // 确保 is_data_driven 是布尔值，处理 null/undefined/0/1/'true'/'false' 等情况
      is_data_driven: record.is_data_driven === true || record.is_data_driven === 1 || record.is_data_driven === 'true',
      data_driver: record.data_driver 
        ? (typeof record.data_driver === 'string' 
            ? record.data_driver 
            : JSON.stringify(record.data_driver, null, 2))
        : JSON.stringify({ data: [] }, null, 2),
    })
    // 设置数据驱动状态
    const isDataDrivenValue = record.is_data_driven === true || record.is_data_driven === 1 || record.is_data_driven === 'true'
    setIsDataDriven(isDataDrivenValue)
    
    // 加载已关联的测试数据配置
    if (isDataDrivenValue) {
      loadAssociatedConfigs(record.id)
    } else {
      setAssociatedConfigs([])
    }
    
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await testCaseService.deleteTestCase(id)
      message.success('删除成功')
      setSelectedRowKeys(prev => prev.filter(key => key !== id))
      loadTestCases()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  // 断言可视化编辑 → JSON 同步
  const handleFormValuesChange = (_changedValues: any, allValues: any) => {
    // 监听数据驱动开关变化
    if (Object.prototype.hasOwnProperty.call(_changedValues, 'is_data_driven')) {
      setIsDataDriven(_changedValues.is_data_driven === true)
    }
    
    if (!Object.prototype.hasOwnProperty.call(_changedValues, 'assertions_list')) {
      return
    }
    const list = allValues.assertions_list || []
    const normalized = Array.isArray(list)
      ? list
          .filter((item: any) => item && item.type)
          .map((item: any) => {
            const base: any = { type: item.type }
            if (item.type === 'status_code') {
              if (item.expected !== undefined && item.expected !== null && item.expected !== '') {
                base.expected = Number.isNaN(Number(item.expected)) ? item.expected : Number(item.expected)
              }
            } else if (item.type === 'response_body') {
              if (item.path) base.path = item.path
              if (item.operator) base.operator = item.operator
              // 对于 JSON 字段，空字符串表示期望值为 null
              if (item.expected === '') {
                base.expected = null
              } else if (item.expected !== undefined && item.expected !== null) {
                base.expected = item.expected
              }
            } else {
              // 其他类型占位，原样透传
              Object.assign(base, item)
            }
            return base
          })
      : []

    if (normalized.length === 0) {
      form.setFieldsValue({ assertions: '' })
    } else {
      form.setFieldsValue({
        assertions: JSON.stringify(normalized, null, 2),
      })
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的测试用例')
      return
    }

    try {
      const deletePromises = selectedRowKeys.map(id => 
        testCaseService.deleteTestCase(Number(id))
      )
      await Promise.all(deletePromises)
      message.success(`成功删除 ${selectedRowKeys.length} 个测试用例`)
      setSelectedRowKeys([])
      loadTestCases()
    } catch (error: any) {
      message.error('批量删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const loadInterfaces = async () => {
    try {
      if (selectedProject) {
        const data = await interfaceService.getInterfaces({ project_id: selectedProject })
        setInterfaces(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('加载接口列表失败:', error)
      setInterfaces([])
    }
  }

  const handleInterfaceChange = (interfaceId?: number) => {
    form.setFieldValue('interface_id', interfaceId)
    if (!interfaceId) {
      return
    }
    const selectedInterface: Interface | undefined = Array.isArray(interfaces)
      ? (interfaces as Interface[]).find(i => i && i.id === interfaceId)
      : undefined
    if (!selectedInterface) {
      return
    }

    const requestConfig: any = {}
    if (selectedInterface.headers && Object.keys(selectedInterface.headers).length > 0) {
      requestConfig.headers = selectedInterface.headers
    }
    if (selectedInterface.query_params && Object.keys(selectedInterface.query_params).length > 0) {
      requestConfig.params = selectedInterface.query_params
    }
    if (selectedInterface.path_params && Object.keys(selectedInterface.path_params).length > 0) {
      requestConfig.path_params = selectedInterface.path_params
    }
    if (selectedInterface.body_params && Object.keys(selectedInterface.body_params).length > 0) {
      requestConfig.body = selectedInterface.body_params
    }
    if (selectedInterface.form_params && Object.keys(selectedInterface.form_params).length > 0) {
      requestConfig.form = selectedInterface.form_params
    }

    // 写回请求配置文本框
    if (Object.keys(requestConfig).length > 0) {
      form.setFieldsValue({
        request_config: JSON.stringify(requestConfig, null, 2),
      })
      message.success('已根据关联接口自动填充请求配置')
    }
  }

  const loadCollections = async () => {
    try {
      const params: any = {}
      if (selectedProject) {
        params.project_id = selectedProject
      }
      const data = await testCaseCollectionService.getCollections(params)
      setCollections(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载用例集列表失败:', error)
      setCollections([])
    }
  }

  const loadUsers = async () => {
    try {
      const data = await userService.getUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载用户列表失败:', error)
      setUsers([])
    }
  }

  const loadDirectories = async () => {
    if (!selectedProject) return
    try {
      const data = await directoryService.getDirectories({ project_id: selectedProject })
      setDirectories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载目录列表失败:', error)
      setDirectories([])
    }
  }

  const loadModules = async () => {
    if (!selectedProject) return
    try {
      const data = await moduleService.getModules({ project_id: selectedProject })
      setModules(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载模块列表失败:', error)
      setModules([])
    }
  }

  const loadDataSources = async () => {
    if (!selectedProject) return
    try {
      const data = await dataDriverService.getDataSources({ project_id: selectedProject })
      setDataSources(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载数据源列表失败:', error)
      setDataSources([])
    }
  }

  const loadDataTemplates = async () => {
    if (!selectedProject) return
    try {
      const data = await dataDriverService.getDataTemplates({ project_id: selectedProject })
      setDataTemplates(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载数据模板列表失败:', error)
      setDataTemplates([])
    }
  }

  const loadTestDataConfigs = async () => {
    if (!selectedProject) return
    try {
      const data = await testDataConfigService.getTestDataConfigs({ project_id: selectedProject })
      setTestDataConfigs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载测试数据配置列表失败:', error)
      setTestDataConfigs([])
    }
  }

  const loadAssociatedConfigs = async (testCaseId: number) => {
    try {
      setLoadingConfigs(true)
      const data = await testDataConfigService.getTestCaseConfigs(testCaseId)
      setAssociatedConfigs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('加载已关联配置失败:', error)
      setAssociatedConfigs([])
    } finally {
      setLoadingConfigs(false)
    }
  }

  const handleCreateCollection = () => {
    setEditingCollection(null)
    collectionForm.resetFields()
    setCollectionModalVisible(true)
  }

  const handleEditCollection = (collection: TestCaseCollection) => {
    setEditingCollection(collection)
    collectionForm.setFieldsValue({
      name: collection.name,
      description: collection.description,
      project_id: collection.project_id,
      test_case_ids: collection.test_case_ids || [],
      order: collection.order || 0,
      tags: collection.tags || [],
    })
    setCollectionModalVisible(true)
  }

  const handleDeleteCollection = async (id: number) => {
    try {
      await testCaseCollectionService.deleteCollection(id)
      message.success('删除成功')
      loadCollections()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleCloneCollection = async (collection: TestCaseCollection) => {
    try {
      const cloneData: TestCaseCollectionCreate = {
        name: `${collection.name} (副本)`,
        description: collection.description,
        project_id: collection.project_id,
        test_case_ids: collection.test_case_ids || [],
        order: collection.order || 0,
        tags: collection.tags || [],
      }
      await testCaseCollectionService.createCollection(cloneData)
      message.success('复制成功')
      loadCollections()
    } catch (error: any) {
      message.error('复制失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleCollectionSubmit = async () => {
    try {
      const values = await collectionForm.validateFields()
      if (editingCollection) {
        await testCaseCollectionService.updateCollection(editingCollection.id, values)
        message.success('更新成功')
      } else {
        await testCaseCollectionService.createCollection(values as TestCaseCollectionCreate)
        message.success('创建成功')
      }
      setCollectionModalVisible(false)
      collectionForm.resetFields()
      loadCollections()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error((editingCollection ? '更新' : '创建') + '失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleClone = async (record: TestCase) => {
    try {
      const cloneData: TestCaseCreate = {
        name: `${record.name} (副本)`,
        description: record.description,
        project_id: record.project_id,
        test_type: record.test_type,
        tags: record.tags || [],
        steps: record.steps || [],
        config: record.config || {},
        is_multi_interface: record.is_multi_interface,
        workflow: record.workflow,
        is_data_driven: record.is_data_driven,
        data_driver: record.data_driver,
      }
      await testCaseService.createTestCase(cloneData)
      message.success('克隆成功')
      loadTestCases()
    } catch (error: any) {
      message.error('克隆失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleCreateTemplate = async (record: TestCase) => {
    setReferencingCase(record)
    templateForm.resetFields()
    templateForm.setFieldsValue({
      name: record.name,
      description: record.description,
    })
    setTemplateModalVisible(true)
  }

  const handleTemplateSubmit = async () => {
    try {
      const values = await templateForm.validateFields()
      const updateData: TestCaseUpdate = {
        is_template: true,
        name: values.name,
        description: values.description,
      }
      if (referencingCase) {
        await testCaseService.updateTestCase(referencingCase.id, updateData)
        message.success('已保存为模板')
        setTemplateModalVisible(false)
        templateForm.resetFields()
        loadTestCases()
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error('保存模板失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleReferenceCase = async (record: TestCase) => {
    setReferencingCase(record)
    referenceForm.resetFields()
    setReferenceModalVisible(true)
  }

  const handleReferenceSubmit = async () => {
    try {
      const values = await referenceForm.validateFields()
      if (!values.referenced_case_id) {
        message.warning('请选择要引用的用例')
        return
      }
      
      // 获取被引用的用例
      const referencedCase = await testCaseService.getTestCase(values.referenced_case_id)
      
      // 创建新用例，引用原用例的配置
      const createData: TestCaseCreate = {
        name: values.name || `${referencedCase.name} (引用)`,
        description: values.description || `引用自: ${referencedCase.name}`,
        project_id: referencingCase?.project_id || values.project_id || projects[0]?.id,
        test_type: referencedCase.test_type,
        tags: values.tags || referencedCase.tags || [],
        steps: referencedCase.steps || [],
        config: {
          ...referencedCase.config,
          referenced_case_id: referencedCase.id, // 记录引用关系
        },
        is_multi_interface: referencedCase.is_multi_interface,
        workflow: referencedCase.workflow,
        is_data_driven: referencedCase.is_data_driven,
        data_driver: referencedCase.data_driver,
      }
      
      await testCaseService.createTestCase(createData)
      message.success('用例引用创建成功')
      setReferenceModalVisible(false)
      referenceForm.resetFields()
      loadTestCases()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error('创建引用失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleBatchReuse = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要复用的测试用例')
      return
    }

    try {
      message.loading(`正在批量复用 ${selectedRowKeys.length} 个测试用例...`, 0)
      const selectedCases = Array.isArray(testCases) ? testCases.filter(tc => tc && selectedRowKeys.includes(tc.id)) : []
      
      const reusePromises = selectedCases.map(async (testCase) => {
        const cloneData: TestCaseCreate = {
          name: `${testCase.name} (复用)`,
          description: testCase.description,
          project_id: testCase.project_id,
          test_type: testCase.test_type,
          tags: testCase.tags || [],
          steps: testCase.steps || [],
          config: testCase.config || {},
          is_multi_interface: testCase.is_multi_interface,
          workflow: testCase.workflow,
          is_data_driven: testCase.is_data_driven,
          data_driver: testCase.data_driver,
        }
        return testCaseService.createTestCase(cloneData)
      })
      
      await Promise.all(reusePromises)
      message.destroy()
      message.success(`成功复用 ${selectedRowKeys.length} 个测试用例`)
      setSelectedRowKeys([])
      loadTestCases()
    } catch (error: any) {
      message.destroy()
      message.error('批量复用失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleBatchImport = async (files: File[]) => {
    if (files.length === 0) {
      message.warning('请选择要导入的文件')
      return
    }

    try {
      let totalSuccess = 0
      let totalFail = 0
      const results: Array<{ fileName: string; success: number; fail: number }> = []

      for (const file of files) {
        try {
          const fileName = file.name.toLowerCase()
          let importedCases: any[] = []

          if (fileName.endsWith('.json')) {
            const text = await file.text()
            const data = JSON.parse(text)
            
            if (data.info && data.item) {
              importedCases = parsePostmanCollection(data)
            } else if (data.openapi || data.swagger) {
              importedCases = parseSwagger(data)
            } else if (Array.isArray(data)) {
              importedCases = data
            } else {
              results.push({ fileName: file.name, success: 0, fail: 0 })
              continue
            }
          } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            importedCases = await parseExcel(file)
          } else {
            results.push({ fileName: file.name, success: 0, fail: 0 })
            continue
          }

          let successCount = 0
          let failCount = 0

          for (const caseData of importedCases) {
            try {
              const createData: TestCaseCreate = {
                name: caseData.name || `导入用例_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                description: caseData.description,
                project_id: caseData.project_id || selectedProject || projects[0]?.id,
                test_type: caseData.test_type || 'api',
                tags: caseData.tags || [],
                steps: caseData.steps || (caseData.method && caseData.path ? [{
                  method: caseData.method,
                  path: caseData.path,
                  headers: caseData.headers || {},
                  params: caseData.params || {},
                  body: caseData.body || null,
                }] : []),
                config: {
                  ...caseData.config,
                  request: caseData.headers || caseData.params || caseData.body ? {
                    headers: caseData.headers || {},
                    params: caseData.params || {},
                    body: caseData.body || null,
                  } : undefined,
                  interface: caseData.method && caseData.path ? {
                    method: caseData.method,
                    path: caseData.path,
                  } : undefined,
                },
              }
              await testCaseService.createTestCase(createData)
              successCount++
              totalSuccess++
            } catch (error) {
              failCount++
              totalFail++
              console.error('导入用例失败:', caseData.name, error)
            }
          }

          results.push({ fileName: file.name, success: successCount, fail: failCount })
        } catch (error: any) {
          results.push({ fileName: file.name, success: 0, fail: 0 })
          totalFail++
          console.error(`导入文件 ${file.name} 失败:`, error)
        }
      }

      // 显示详细结果
      const resultMessage = results.map(r => 
        `${r.fileName}: 成功 ${r.success} 个，失败 ${r.fail} 个`
      ).join('\n')
      
      message.success(`批量导入完成：总计成功 ${totalSuccess} 个，失败 ${totalFail} 个\n${resultMessage}`, 10)
      setBatchImportVisible(false)
      loadTestCases()
    } catch (error: any) {
      message.error('批量导入失败: ' + (error.message || '未知错误'))
    }
  }

  const handleBatchSync = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要同步的测试用例')
      return
    }

    try {
      message.loading('正在同步测试用例...', 0)
      
      // 批量同步：更新用例的同步时间戳
      const selectedCases = Array.isArray(testCases) ? testCases.filter(tc => tc && selectedRowKeys.includes(tc.id)) : []
      const syncPromises = selectedCases.map(async (testCase) => {
        const updateData: TestCaseUpdate = {
          // 可以添加同步相关的字段，比如 sync_time, sync_status 等
          // 这里暂时只更新 updated_at
        }
        await testCaseService.updateTestCase(testCase.id, updateData)
      })
      
      await Promise.all(syncPromises)
      message.destroy()
      message.success(`成功同步 ${selectedRowKeys.length} 个测试用例`)
      setBatchSyncVisible(false)
      setSelectedRowKeys([])
      loadTestCases()
    } catch (error: any) {
      message.destroy()
      message.error('批量同步失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleVersionManage = (record: TestCase) => {
    setSelectedTestCaseForVersion(record)
    setVersionModalVisible(true)
    // 加载版本历史
    // TODO: 实现版本历史加载
    setVersions([])
  }

  const handleRestoreVersion = async (versionId: number) => {
    try {
      // TODO: 实现版本恢复功能
      message.success('版本恢复功能待实现')
    } catch (error: any) {
      message.error('恢复失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDeleteVersion = async (versionId: number) => {
    try {
      // TODO: 实现版本删除功能
      message.success('版本删除功能待实现')
      setVersions(prev => prev.filter(v => v.id !== versionId))
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleCreateVersion = async (values: any) => {
    try {
      if (!selectedTestCaseForVersion) {
        message.warning('请先选择测试用例')
        return
      }
      // TODO: 实现版本创建功能
      const newVersion = {
        id: Date.now(),
        version: values.version,
        name: values.name || values.version,
        test_case_id: selectedTestCaseForVersion.id,
        created_at: new Date().toISOString(),
        description: values.description || '',
      }
      setVersions(prev => [...prev, newVersion])
      versionForm.resetFields()
      message.success('版本创建成功')
    } catch (error: any) {
      message.error('创建版本失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleCompareVersions = async (versionId: number) => {
    try {
      // TODO: 实现版本对比功能
      const version = versions.find(v => v.id === versionId)
      if (!version) {
        message.warning('版本不存在')
        return
      }
      // 模拟对比结果
      setCompareResult({
        version: version.version,
        compare_with: 'current',
        differences: {
          name: { old: '旧名称', new: '新名称' },
          description: { old: '旧描述', new: '新描述' },
        },
      })
      setCompareModalVisible(true)
      message.info('版本对比功能待完善')
    } catch (error: any) {
      message.error('对比失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleFavorite = async (record: TestCase, isFavorite: boolean) => {
    try {
      const updateData: TestCaseUpdate = {
        is_favorite: isFavorite,
      }
      await testCaseService.updateTestCase(record.id, updateData)
      message.success(isFavorite ? '已收藏' : '已取消收藏')
      loadTestCases()
    } catch (error: any) {
      message.error('操作失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleExecute = async (testCase: TestCase) => {
    try {
      message.loading('正在执行测试用例...', 0)
      const execution = await testExecutionService.createTestExecution({
        test_case_id: testCase.id,
        project_id: testCase.project_id,
        environment: 'default',
        config: {},
      })
      message.destroy()
      message.success('测试用例执行已启动，执行ID: ' + execution.id)
      // 可以跳转到测试执行页面查看结果
      // window.location.href = `/api-testing/test-executions?execution_id=${execution.id}`
    } catch (error: any) {
      message.destroy()
      message.error('执行失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleBatchExecute = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要执行的测试用例')
      return
    }

    try {
      message.loading(`正在执行 ${selectedRowKeys.length} 个测试用例...`, 0)
      const executePromises = selectedRowKeys.map(id => {
        const testCase = Array.isArray(testCases) ? testCases.find(tc => tc && tc.id === Number(id)) : undefined
        if (testCase) {
          return testExecutionService.createTestExecution({
            test_case_id: testCase.id,
            project_id: testCase.project_id,
            environment: 'default',
            config: {},
          })
        }
        return Promise.resolve(null)
      })
      await Promise.all(executePromises)
      message.destroy()
      message.success(`成功启动 ${selectedRowKeys.length} 个测试用例的执行`)
      setSelectedRowKeys([])
    } catch (error: any) {
      message.destroy()
      message.error('批量执行失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleBatchEdit = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要编辑的测试用例')
      return
    }

    try {
      const values = await batchEditForm.validateFields()
      const updateData: TestCaseUpdate = {}
      
      if (values.tags !== undefined && values.tags.length > 0) {
        updateData.tags = values.tags
        // 更新allTags
        if (Array.isArray(values.tags)) {
          values.tags.forEach(tag => {
            if (tag && Array.isArray(allTags) && !allTags.includes(tag)) {
              setAllTags(prev => Array.isArray(prev) ? [...prev, tag].sort() : [tag])
            }
          })
        }
      }
      
      if (values.owner_id !== undefined && values.owner_id !== null) {
        updateData.owner_id = values.owner_id
      }
      
      if (values.status !== undefined && values.status !== null) {
        updateData.status = values.status
      }
      
      // 如果更新了优先级，需要更新config
      if (values.priority !== undefined && values.priority !== null) {
        const selectedCases = Array.isArray(testCases) ? testCases.filter(tc => tc && selectedRowKeys.includes(tc.id)) : []
        const configUpdates = selectedCases.map(tc => {
          const currentConfig = tc.config || {}
          return {
            ...currentConfig,
            priority: values.priority,
          }
        })
        
        // 批量更新config
        for (let i = 0; i < selectedRowKeys.length; i++) {
          const id = Number(selectedRowKeys[i])
          const caseConfig = configUpdates[i] || {}
          await testCaseService.updateTestCase(id, { config: caseConfig })
        }
      }
      
      // 如果有其他字段需要更新
      if (Object.keys(updateData).length > 0) {
        const updatePromises = selectedRowKeys.map(id => 
          testCaseService.updateTestCase(Number(id), updateData)
        )
        await Promise.all(updatePromises)
      }
      
      message.success(`成功更新 ${selectedRowKeys.length} 个测试用例`)
      setBatchEditVisible(false)
      batchEditForm.resetFields()
      setSelectedRowKeys([])
      loadTestCases()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error('批量编辑失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleBatchMove = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要移动的测试用例')
      return
    }

    try {
      const values = await batchMoveForm.validateFields()
      const updateData: TestCaseUpdate = {
        project_id: values.target_project_id,
      }
      
      if (values.target_module) {
        updateData.module = values.target_module
      }
      
      // 批量更新用例
      const updatePromises = selectedRowKeys.map(id => 
        testCaseService.updateTestCase(Number(id), updateData)
      )
      await Promise.all(updatePromises)
      
      // 如果指定了目录，需要更新用例的目录关联（这里需要后端支持，暂时跳过）
      // 如果指定了用例集，需要更新用例集的test_case_ids
      if (values.target_collection_id) {
        const collection = Array.isArray(collections) ? collections.find(c => c && c.id === values.target_collection_id) : undefined
        if (collection) {
          const existingIds = collection.test_case_ids || []
          const newIds = [...new Set([...existingIds, ...selectedRowKeys.map(k => Number(k))])]
          await testCaseCollectionService.updateCollection(collection.id, {
            test_case_ids: newIds
          })
        }
      }
      
      message.success(`成功移动 ${selectedRowKeys.length} 个测试用例`)
      setBatchMoveVisible(false)
      batchMoveForm.resetFields()
      setSelectedRowKeys([])
      // 使用 setTimeout 确保状态更新完成后再刷新
      setTimeout(() => {
        loadTestCases()
        loadCollections()
      }, 0)
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error('批量移动失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleBatchCopy = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要复制的测试用例')
      return
    }

    try {
      const values = await batchCopyForm.validateFields()
      const selectedCases = Array.isArray(testCases) ? testCases.filter(tc => tc && selectedRowKeys.includes(tc.id)) : []
      
      // 批量复制用例
      const copyPromises = selectedCases.map(async (testCase) => {
        const cloneData: TestCaseCreate = {
          name: `${testCase.name} (副本)`,
          description: testCase.description,
          project_id: values.target_project_id || testCase.project_id,
          test_type: testCase.test_type,
          tags: testCase.tags || [],
          steps: testCase.steps || [],
          config: testCase.config || {},
          module: values.target_module || testCase.module,
          status: testCase.status || 'active',
          is_multi_interface: testCase.is_multi_interface,
          workflow: testCase.workflow,
          is_data_driven: testCase.is_data_driven,
          data_driver: testCase.data_driver,
        }
        return testCaseService.createTestCase(cloneData)
      })
      
      await Promise.all(copyPromises)
      message.success(`成功复制 ${selectedRowKeys.length} 个测试用例`)
      setBatchCopyVisible(false)
      batchCopyForm.resetFields()
      setSelectedRowKeys([])
      loadTestCases()
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      message.error('批量复制失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleExport = async (format: 'json' | 'postman' | 'excel' | 'html' = 'json') => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要导出的测试用例')
      return
    }

    try {
      const selectedCases = Array.isArray(testCases) ? testCases.filter(tc => tc && selectedRowKeys.includes(tc.id)) : []
      
      if (format === 'json') {
        const dataStr = JSON.stringify(selectedCases, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `test_cases_${new Date().getTime()}.json`
        link.click()
        URL.revokeObjectURL(url)
        message.success('导出成功')
      } else if (format === 'postman') {
        const postmanCollection = convertToPostmanCollection(selectedCases.map(tc => ({
          name: tc.name,
          description: tc.description,
          test_type: tc.test_type,
          method: tc.config?.interface?.method || 'GET',
          path: tc.config?.interface?.path || '',
          headers: tc.config?.request?.headers || {},
          params: tc.config?.request?.params || {},
          body: tc.config?.request?.body || null,
          config: tc.config,
        })))
        const dataStr = JSON.stringify(postmanCollection, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `postman_collection_${new Date().getTime()}.json`
        link.click()
        URL.revokeObjectURL(url)
        message.success('导出为Postman格式成功')
      } else if (format === 'excel') {
        try {
          const excelBlob = await convertToExcel(selectedCases.map(tc => ({
            name: tc.name,
            description: tc.description,
            test_type: tc.test_type,
            method: tc.config?.interface?.method || 'GET',
            path: tc.config?.interface?.path || '',
            headers: tc.config?.request?.headers || {},
            params: tc.config?.request?.params || {},
            body: tc.config?.request?.body || null,
            tags: tc.tags || [],
            config: tc.config,
          })))
          const url = URL.createObjectURL(excelBlob)
          const link = document.createElement('a')
          link.href = url
          link.download = `test_cases_${new Date().getTime()}.xlsx`
          link.click()
          URL.revokeObjectURL(url)
          message.success('导出为Excel格式成功')
        } catch (error: any) {
          message.error('Excel导出失败: ' + (error.message || '未知错误'))
        }
      } else if (format === 'html') {
        const html = convertToHTML(selectedCases.map(tc => ({
          name: tc.name,
          description: tc.description,
          test_type: tc.test_type,
          method: tc.config?.interface?.method || 'GET',
          path: tc.config?.interface?.path || '',
          headers: tc.config?.request?.headers || {},
          params: tc.config?.request?.params || {},
          body: tc.config?.request?.body || null,
          tags: tc.tags || [],
          config: tc.config,
        })))
        const dataBlob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `test_cases_${new Date().getTime()}.html`
        link.click()
        URL.revokeObjectURL(url)
        message.success('导出为HTML格式成功')
      }
    } catch (error: any) {
      message.error('导出失败: ' + (error.message || '未知错误'))
    }
  }

  const handleImport = async (file: File) => {
    try {
      const fileName = file.name.toLowerCase()
      let importedCases: any[] = []

      // 根据文件扩展名判断格式
      if (fileName.endsWith('.json')) {
        const text = await file.text()
        const data = JSON.parse(text)
        
        // 判断是Postman Collection格式还是普通JSON数组
        if (data.info && data.item) {
          // Postman Collection格式
          importedCases = parsePostmanCollection(data)
        } else if (data.openapi || data.swagger) {
          // Swagger/OpenAPI格式
          importedCases = parseSwagger(data)
        } else if (Array.isArray(data)) {
          // 普通JSON数组格式
          importedCases = data
        } else {
          message.error('不支持的JSON格式')
          return
        }
      } else if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
        // Swagger YAML格式（需要yaml解析库，这里先提示）
        message.warning('YAML格式导入需要安装yaml库，请先转换为JSON格式')
        return
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Excel格式
        importedCases = await parseExcel(file)
      } else {
        message.error('不支持的文件格式，请使用JSON、Excel或Postman Collection格式')
        return
      }

      if (!Array.isArray(importedCases) || importedCases.length === 0) {
        message.error('导入文件为空或格式错误')
        return
      }

      let successCount = 0
      let failCount = 0

      for (const caseData of importedCases) {
        try {
          const createData: TestCaseCreate = {
            name: caseData.name || `导入用例_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            description: caseData.description,
            project_id: caseData.project_id || selectedProject || projects[0]?.id,
            test_type: caseData.test_type || 'api',
            tags: caseData.tags || [],
            steps: caseData.steps || (caseData.method && caseData.path ? [{
              method: caseData.method,
              path: caseData.path,
              headers: caseData.headers || {},
              params: caseData.params || {},
              body: caseData.body || null,
            }] : []),
            config: {
              ...caseData.config,
              request: caseData.headers || caseData.params || caseData.body ? {
                headers: caseData.headers || {},
                params: caseData.params || {},
                body: caseData.body || null,
              } : undefined,
              interface: caseData.method && caseData.path ? {
                method: caseData.method,
                path: caseData.path,
              } : undefined,
            },
          }
          await testCaseService.createTestCase(createData)
          successCount++
        } catch (error) {
          failCount++
          console.error('导入用例失败:', caseData.name, error)
        }
      }

      message.success(`导入完成：成功 ${successCount} 个，失败 ${failCount} 个`)
      loadTestCases()
    } catch (error: any) {
      message.error('导入失败: ' + (error.message || '文件格式错误'))
    }
  }

  const parseJsonField = (value: string): any => {
    if (!value || value.trim() === '') return []
    try {
      return JSON.parse(value)
    } catch (e) {
      throw new Error('JSON格式错误: ' + value)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // 以旧 config 为基础做增量更新，避免未在当前表单展示的配置被覆盖掉
      const baseConfig: any =
        editingCase && editingCase.config && typeof editingCase.config === 'object'
          ? { ...(editingCase.config as any) }
          : {}

      const config: any = {
        ...baseConfig,
        timeout: values.timeout || 30,
        retry_count: values.retry_count || 0,
        pre_script: values.pre_script || '',
        post_script: values.post_script || '',
        interface_id: values.interface_id,
        priority: values.priority || 'medium',
      }

      // 如果选择了接口，自动填充接口信息
      if (values.interface_id) {
        const selectedInterface = Array.isArray(interfaces)
          ? (interfaces as Interface[]).find(i => i && i.id === values.interface_id)
          : undefined
        if (selectedInterface) {
          config.interface = {
            id: selectedInterface.id,
            name: selectedInterface.name,
            method: selectedInterface.method,
            path: selectedInterface.path,
          }
        }
      }

      // 解析断言配置
      const hasVisualAssertions =
        Array.isArray(values.assertions_list) &&
        values.assertions_list.some((item: any) => item && item.type)
      if (values.assertions && values.assertions.trim()) {
        try {
          config.assertions = JSON.parse(values.assertions)
        } catch (e) {
          message.error('断言配置JSON格式错误')
          return
        }
      } else if (!hasVisualAssertions) {
        // 可视化列表和 JSON 都为空时，认为用户希望清空断言
        delete config.assertions
      }

      // 解析关联提取配置（同样仅在有值时更新）
      if (values.extractors && values.extractors.trim()) {
        try {
          config.extractors = JSON.parse(values.extractors)
        } catch (e) {
          message.error('关联提取配置JSON格式错误')
          return
        }
      }
      
      // 解析高级配置 JSON（如果存在其他高级配置，可以在这里处理）
      // 注意：token_config已迁移到Token管理功能，不再在此处理
      if (values.advanced_config && values.advanced_config.trim()) {
        try {
          const advancedConfig = JSON.parse(values.advanced_config)
          // 可以在这里添加其他高级配置的处理
          // 注意：token_config已迁移到Token管理功能，不再在此处理
        } catch (e) {
          message.error('高级配置JSON格式错误')
          return
        }
      }

      // 解析请求配置（只在文本框有值时更新；避免误把已有请求配置清空）
      if (values.request_config && values.request_config.trim()) {
        try {
          config.request = JSON.parse(values.request_config)
        } catch (e) {
          message.error('请求配置JSON格式错误')
          return
        }
      }

      // 解析流程编排配置（多接口用例）
      let workflow = null
      if (values.workflow && values.is_multi_interface) {
        try {
          workflow = JSON.parse(values.workflow)
        } catch (e) {
          message.error('流程编排配置JSON格式错误')
          return
        }
      }

      // 解析数据驱动配置
      let data_driver = null
      // 确保 is_data_driven 是布尔值，而不是字符串或其他类型
      const is_data_driven = values.is_data_driven === true || values.is_data_driven === 'true' || values.is_data_driven === 1
      
      if (is_data_driven) {
        // 如果启用了数据驱动
        if (values.data_driver) {
          try {
            const parsed = typeof values.data_driver === 'string' 
              ? JSON.parse(values.data_driver) 
              : values.data_driver
            // 确保data字段存在且为数组
            if (!parsed.data || !Array.isArray(parsed.data)) {
              if (parsed.data && !Array.isArray(parsed.data)) {
                message.error('数据驱动配置中的data字段必须是数组格式')
                return
              }
              // 如果没有data字段，创建一个空数组
              parsed.data = []
            }
            data_driver = parsed
          } catch (e: any) {
            message.error('数据驱动配置JSON格式错误: ' + (e.message || '未知错误'))
            return
          }
        } else {
          // 如果启用了数据驱动但没有配置，创建一个默认配置
          data_driver = { data: [] }
        }
      } else {
        // 如果禁用了数据驱动，在更新时保留原有数据，创建时设为null
        if (editingCase && editingCase.data_driver) {
          // 更新时保留原有数据驱动配置
          data_driver = editingCase.data_driver
        } else {
          // 创建时设为null
          data_driver = null
        }
      }

      if (editingCase) {
        const updateData: TestCaseUpdate = {
          name: values.name,
          description: values.description,
          test_type: values.test_type,
          tags: values.tags || [],
          module: values.module,
          directory_id: values.directory_id,
          status: values.status,
          project_id: values.project_id,
          is_multi_interface: values.is_multi_interface || false,
          workflow: workflow,
          is_data_driven: is_data_driven,
          data_driver: data_driver,
          config: config,
        } as any
        
        // 如果更新了标签，需要更新allTags
        if (values.tags && Array.isArray(values.tags)) {
          values.tags.forEach(tag => {
            if (tag && Array.isArray(allTags) && !allTags.includes(tag)) {
              setAllTags(prev => Array.isArray(prev) ? [...prev, tag].sort() : [tag])
            }
          })
        }
        
        console.log('[调试] 保存测试用例，数据：', updateData)
        console.log('[调试] config:', config)
        console.log('[调试] values.advanced_config:', values.advanced_config)
        console.log('[调试] config.interface_id:', config.interface_id)
        console.log('[调试] is_data_driven:', is_data_driven)
        console.log('[调试] data_driver:', data_driver)
        
        await testCaseService.updateTestCase(editingCase.id, updateData)
        message.success('更新成功')
        // 如果项目发生了变化，需要更新selectedProject状态
        if (values.project_id && values.project_id !== editingCase.project_id) {
          setSelectedProject(values.project_id)
        }
      } else {
        const createData: TestCaseCreate = {
          name: values.name,
          description: values.description,
          project_id: values.project_id,
          test_type: values.test_type,
          tags: values.tags || [],
          module: values.module,
          directory_id: values.directory_id,
          status: values.status || 'active',
          is_multi_interface: values.is_multi_interface || false,
          workflow: workflow,
          is_data_driven: is_data_driven,
          data_driver: data_driver,
          steps: [],
          config: config,
        } as any
        const newCase = await testCaseService.createTestCase(createData)
        message.success('创建成功')
        
        // 如果创建时选择了关联配置，创建关联关系
        if (is_data_driven && associatedConfigs.length > 0 && newCase.id) {
          try {
            for (const config of associatedConfigs) {
              await testDataConfigService.associateTestCase(newCase.id, config.id)
            }
            message.success(`已关联 ${associatedConfigs.length} 个测试数据配置`)
          } catch (error: any) {
            console.error('关联配置失败:', error)
            // 不阻止保存，只提示
            message.warning('用例创建成功，但关联配置失败: ' + (error.response?.data?.detail || error.message))
          }
        }
      }
      setModalVisible(false)
      form.resetFields()
      setAssociatedConfigs([])
      // 确保刷新列表
      await loadTestCases()
    } catch (error: any) {
      if (error.errorFields) {
        return // 表单验证错误
      }
      console.error('测试用例操作失败:', error)
      message.error((editingCase ? '更新' : '创建') + '失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const columns = [
    {
      title: '用例名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '用例类型',
      key: 'case_type',
      render: (_: any, record: TestCase) => (
        <Space direction="vertical" size="small">
          <Tag color={record.is_multi_interface ? 'purple' : 'blue'}>
            {record.is_multi_interface ? '多接口' : '单接口'}
          </Tag>
          <Tag color={record.test_type === 'api' ? 'blue' : record.test_type === 'ui' ? 'green' : 'default'}>
            {record.test_type === 'api' ? 'API' : record.test_type === 'ui' ? 'UI' : record.test_type}
          </Tag>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'test_type',
      key: 'test_type',
      render: (type: string) => {
        const colors: Record<string, string> = {
          api: 'blue',
          ui: 'green',
          performance: 'orange',
          mobile: 'purple',
          security: 'red',
          compatibility: 'cyan',
        }
        const labels: Record<string, string> = {
          api: 'API',
          ui: 'UI',
          performance: '性能',
          mobile: '移动端',
          security: '安全',
          compatibility: '兼容性',
        }
        return <Tag color={colors[type] || 'default'}>{labels[type] || type}</Tag>
      },
    },
    {
      title: '项目',
      dataIndex: 'project_id',
      key: 'project',
      render: (projectId: number) => {
        const project = Array.isArray(projects) ? projects.find(p => p && p.id === projectId) : undefined
        return project?.name || projectId
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[] | null | undefined) => {
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
          return '-'
        }
        return (
          <Space wrap>
            {tags.filter(Boolean).map((tag, index) => (
              <Tag key={index} color="blue">{tag}</Tag>
            ))}
          </Space>
        )
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '类型标签',
      key: 'type_tags',
      render: (_: any, record: TestCase) => (
        <Space>
          {record.is_template && <Tag color="purple">模板</Tag>}
          {record.is_shared && <Tag color="blue">共享</Tag>}
          {record.is_common && <Tag color="orange">常用</Tag>}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: TestCase) => {
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
            key: 'reference',
            label: '引用',
            icon: <LinkOutlined />,
            onClick: () => handleReferenceCase(record),
          },
          {
            key: 'template',
            label: '创建模板',
            icon: <FileTextOutlined />,
            onClick: () => handleCreateTemplate(record),
          },
          {
            key: 'versions',
            label: '版本管理',
            icon: <HistoryOutlined />,
            onClick: () => handleVersionManage(record),
          },
          {
            key: 'execute',
            label: '执行',
            icon: <PlayCircleOutlined />,
            onClick: () => handleExecute(record),
          },
          {
            key: 'favorite',
            label: record.is_favorite && Array.isArray(record.is_favorite) && record.is_favorite.length > 0 ? '取消收藏' : '收藏',
            icon: record.is_favorite && Array.isArray(record.is_favorite) && record.is_favorite.length > 0 ? <StarFilled /> : <StarOutlined />,
            onClick: () => handleFavorite(record, !(record.is_favorite && Array.isArray(record.is_favorite) && record.is_favorite.length > 0)),
          },
          {
            type: 'divider',
          },
          {
            key: 'delete',
            label: (
              <Popconfirm
                title="确定要删除这个测试用例吗？"
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
    <div style={{ 
      padding: '16px', 
      height: 'calc(100vh - 88px)', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
    }}>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'cases' | 'collections')}
        style={{ marginBottom: 16, flexShrink: 0 }}
        items={[
          {
            key: 'cases',
            label: '测试用例',
            children: null,
          },
          {
            key: 'collections',
            label: '用例集管理',
            children: null,
          },
        ]}
      />
      {activeTab === 'cases' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <h2 style={{ margin: 0 }}>测试用例</h2>
        <Space>
          <Popconfirm
            title={selectedRowKeys.length > 0 ? `确定要删除选中的 ${selectedRowKeys.length} 个测试用例吗？` : '请先选择要删除的测试用例'}
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
          <Button 
            icon={<PlayCircleOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={handleBatchExecute}
          >
            批量执行{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
          </Button>
          <Button 
            icon={<EditOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={() => setBatchEditVisible(true)}
          >
            批量编辑{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
          </Button>
          <Button 
            icon={<CopyOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={() => setBatchCopyVisible(true)}
          >
            批量复制{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
          </Button>
          <Button 
            disabled={selectedRowKeys.length === 0}
            onClick={() => setBatchMoveVisible(true)}
          >
            批量移动{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
          </Button>
          <Button 
            disabled={selectedRowKeys.length === 0}
            onClick={handleBatchReuse}
          >
            批量复用{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'export-json',
                  label: '导出为JSON',
                  icon: <DownloadOutlined />,
                  onClick: () => handleExport('json'),
                },
                {
                  key: 'export-postman',
                  label: '导出为Postman',
                  icon: <DownloadOutlined />,
                  onClick: () => handleExport('postman'),
                },
                {
                  key: 'export-excel',
                  label: '导出为Excel',
                  icon: <DownloadOutlined />,
                  onClick: () => handleExport('excel'),
                },
                {
                  key: 'export-html',
                  label: '导出为HTML',
                  icon: <DownloadOutlined />,
                  onClick: () => handleExport('html'),
                },
              ],
            }}
            disabled={selectedRowKeys.length === 0}
          >
            <Button icon={<ExportOutlined />} disabled={selectedRowKeys.length === 0}>
              导出{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
            </Button>
          </Dropdown>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'json',
                  label: '导入JSON',
                  onClick: () => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.json'
                    input.onchange = (e: any) => {
                      const file = e.target.files[0]
                      if (file) handleImport(file)
                    }
                    input.click()
                  },
                },
                {
                  key: 'postman',
                  label: '导入Postman',
                  onClick: () => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.json'
                    input.onchange = (e: any) => {
                      const file = e.target.files[0]
                      if (file) handleImport(file)
                    }
                    input.click()
                  },
                },
                {
                  key: 'swagger',
                  label: '导入Swagger',
                  onClick: () => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.json,.yaml,.yml'
                    input.onchange = (e: any) => {
                      const file = e.target.files[0]
                      if (file) handleImport(file)
                    }
                    input.click()
                  },
                },
                {
                  key: 'excel',
                  label: '导入Excel',
                  onClick: () => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.xlsx,.xls'
                    input.onchange = (e: any) => {
                      const file = e.target.files[0]
                      if (file) handleImport(file)
                    }
                    input.click()
                  },
                },
                {
                  type: 'divider',
                },
                {
                  key: 'batch-import',
                  label: '批量导入',
                  onClick: () => setBatchImportVisible(true),
                },
              ],
            }}
          >
            <Button icon={<ImportOutlined />}>
              导入
            </Button>
          </Dropdown>
          <Button 
            icon={<DownloadOutlined />}
            onClick={() => setBatchSyncVisible(true)}
            disabled={selectedRowKeys.length === 0}
          >
            批量同步{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建用例
          </Button>
        </Space>
      </div>
      <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Space style={{ marginBottom: 16, width: '100%', flexShrink: 0 }} direction="vertical" size="middle">
          <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
            <Radio.Button value="all">全部用例</Radio.Button>
            <Radio.Button value="my_created">我创建的</Radio.Button>
            <Radio.Button value="my_owned">我负责的</Radio.Button>
            <Radio.Button value="my_favorite">我收藏的</Radio.Button>
            <Radio.Button value="templates">系统模板</Radio.Button>
            <Radio.Button value="shared">共享用例</Radio.Button>
            <Radio.Button value="common">常用用例</Radio.Button>
          </Radio.Group>
          <Space wrap>
            <Select
              placeholder="选择项目"
              allowClear
              style={{ width: 200 }}
              value={selectedProject}
              onChange={setSelectedProject}
            >
              {Array.isArray(projects) ? projects.map(project => (
                project && (
                  <Option key={project.id} value={project.id}>
                    {project.name}
                  </Option>
                )
              )).filter(Boolean) : []}
            </Select>
            <Select
              placeholder="选择类型"
              allowClear
              style={{ width: 150 }}
              value={selectedType}
              onChange={setSelectedType}
            >
              <Option value="api">API</Option>
              <Option value="ui">UI</Option>
              <Option value="performance">性能</Option>
              <Option value="mobile">移动端</Option>
              <Option value="security">安全</Option>
              <Option value="compatibility">兼容性</Option>
            </Select>
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: 120 }}
              value={selectedStatus}
              onChange={setSelectedStatus}
            >
              <Option value="active">活跃</Option>
              <Option value="inactive">未激活</Option>
              <Option value="archived">已归档</Option>
            </Select>
            <Select
              placeholder="选择模块"
              allowClear
              style={{ width: 150 }}
              value={selectedModule}
              onChange={setSelectedModule}
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {Array.isArray(modules) ? modules.map(module => (
                module && (
                  <Option key={module.id} value={module.name}>
                    {module.name}
                  </Option>
                )
              )).filter(Boolean) : []}
            </Select>
            <Select
              placeholder="选择目录"
              allowClear
              style={{ width: 150 }}
              value={selectedDirectory}
              onChange={setSelectedDirectory}
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {Array.isArray(directories) ? (() => {
                // 扁平化目录列表用于显示
                const flattenDirectories = (dirs: Directory[]): Directory[] => {
                  const result: Directory[] = []
                  const traverse = (d: Directory[]) => {
                    d.forEach(dir => {
                      result.push(dir)
                      if (dir.children && dir.children.length > 0) {
                        traverse(dir.children)
                      }
                    })
                  }
                  traverse(dirs)
                  return result
                }
                return flattenDirectories(directories)
              })().map(dir => (
                dir && (
                  <Option key={dir.id} value={dir.id}>
                    {dir.name}
                  </Option>
                )
              )).filter(Boolean) : []}
            </Select>
            <Select
              placeholder="选择标签"
              allowClear
              style={{ width: 150 }}
              value={selectedTag}
              onChange={setSelectedTag}
            >
              {Array.isArray(allTags) ? allTags.map(tag => (
                tag && (
                  <Option key={tag} value={tag}>
                    {tag}
                  </Option>
                )
              )).filter(Boolean) : []}
            </Select>
            <DatePicker.RangePicker
              style={{ width: 240 }}
              value={dateRange ? [dateRange[0] ? dayjs(dateRange[0]) : null, dateRange[1] ? dayjs(dateRange[1]) : null] : null}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')])
                } else {
                  setDateRange(null)
                }
              }}
              placeholder={['开始日期', '结束日期']}
            />
            <Input
              placeholder="搜索用例"
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Space>
        </Space>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            columns={columns}
            dataSource={Array.isArray(testCases) ? testCases : []}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20 }}
            scroll={{ y: 'calc(100vh - 450px)' }}
            rowSelection={{
              selectedRowKeys,
              onChange: (selectedKeys) => {
                setSelectedRowKeys(selectedKeys)
              },
              getCheckboxProps: (record) => ({
                name: record?.name || '',
                disabled: !record || !record.id,
              }),
            }}
          />
        </div>
      </Card>
      </div>
      )}

       <Modal
         title={editingCase ? '编辑测试用例' : '新建测试用例'}
         open={modalVisible}
         onOk={handleSubmit}
         onCancel={() => {
           setModalVisible(false)
           form.resetFields()
           setIsDataDriven(false)
         }}
         width={1000}
         style={{ top: 10 }}
         bodyStyle={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingBottom: 24 }}
         destroyOnClose={false}
         forceRender={true}
       >
        <Form form={form} layout="vertical" onValuesChange={handleFormValuesChange} preserve={true}>
          <Tabs 
            defaultActiveKey="basic" 
            type="card" 
            destroyInactiveTabPane={false}
            style={{ minHeight: '500px' }}
            items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <>
                  <Form.Item
                    name="name"
                    label="用例名称"
                    rules={[{ required: true, message: '请输入用例名称' }]}
                  >
                    <Input placeholder="请输入用例名称" />
                  </Form.Item>
                  <Form.Item
                    name="project_id"
                    label="项目"
                    rules={[{ required: true, message: '请选择项目' }]}
                  >
                    <Select
                      placeholder="请选择项目"
                      onChange={(value) => {
                        setSelectedProject(value)
                      }}
                    >
                      {projects.map(project => (
                        <Option key={project.id} value={project.id}>
                          {project.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="test_type"
                    label="测试类型"
                    rules={[{ required: true, message: '请选择测试类型' }]}
                  >
                    <Select placeholder="请选择测试类型">
                      <Option value="api">API</Option>
                      <Option value="ui">UI</Option>
                      <Option value="performance">性能</Option>
                      <Option value="mobile">移动端</Option>
                      <Option value="security">安全</Option>
                      <Option value="compatibility">兼容性</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item name="description" label="描述">
                    <TextArea rows={3} placeholder="请输入用例描述" />
                  </Form.Item>
                  <Form.Item name="module" label="模块">
                    <Select 
                      placeholder="请选择模块（可选）" 
                      allowClear
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {Array.isArray(modules) ? modules.map(module => (
                        module && (
                          <Option key={module.id} value={module.name}>
                            {module.name}
                          </Option>
                        )
                      )).filter(Boolean) : []}
                    </Select>
                  </Form.Item>
                  <Form.Item name="directory_id" label="目录">
                    <Select 
                      placeholder="请选择目录（可选）" 
                      allowClear
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {Array.isArray(directories) ? (() => {
                        // 扁平化目录列表用于显示
                        const flattenDirectories = (dirs: Directory[]): Directory[] => {
                          const result: Directory[] = []
                          const traverse = (d: Directory[]) => {
                            d.forEach(dir => {
                              result.push(dir)
                              if (dir.children && dir.children.length > 0) {
                                traverse(dir.children)
                              }
                            })
                          }
                          traverse(dirs)
                          return result
                        }
                        return flattenDirectories(directories)
                      })().map(dir => (
                        dir && (
                          <Option key={dir.id} value={dir.id}>
                            {dir.name}
                          </Option>
                        )
                      )).filter(Boolean) : []}
                    </Select>
                  </Form.Item>
                  <Form.Item name="tags" label="标签">
                    <Select mode="tags" placeholder="输入标签后按回车" />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'case_type',
              label: '用例类型',
              children: (
                <>
                  <Form.Item name="is_multi_interface" label="用例类型" initialValue={false}>
                    <Select placeholder="请选择用例类型">
                      <Option value={false}>单接口用例</Option>
                      <Option value={true}>多接口用例</Option>
                    </Select>
                  </Form.Item>
                  <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, marginTop: 16, color: '#1f2937' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#111827' }}>说明：</p>
                    <ul style={{ marginTop: 8, marginBottom: 0, color: '#374151' }}>
                      <li>单接口用例：测试单个接口的功能</li>
                      <li>多接口用例：测试多个接口的流程编排，支持数据传递和异常处理</li>
                    </ul>
                  </div>
                  <Form.Item name="is_data_driven" label="数据驱动" initialValue={false} style={{ marginTop: 24 }}>
                    <Select 
                      placeholder="是否启用数据驱动"
                      onChange={(value) => {
                        setIsDataDriven(value === true)
                        // 如果禁用数据驱动，清空关联配置
                        if (value === false) {
                          setAssociatedConfigs([])
                        } else if (editingCase) {
                          // 如果启用数据驱动，加载已关联的配置
                          loadAssociatedConfigs(editingCase.id)
                        }
                      }}
                    >
                      <Option value={false}>否</Option>
                      <Option value={true}>是</Option>
                    </Select>
                  </Form.Item>
                  
                  {isDataDriven && (
                    <div style={{ marginTop: 24, padding: 16, background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>
                      <h4 style={{ marginTop: 0, marginBottom: 12, color: '#0c4a6e' }}>关联测试数据配置</h4>
                      <p style={{ margin: '0 0 12px 0', color: '#0c4a6e', fontSize: 13 }}>
                        选择已创建的测试数据配置，系统会自动使用配置中的数据执行测试。配置可在"数据驱动配置" → "测试数据配置"中管理。
                      </p>
                      <Form.Item 
                        label="测试数据配置"
                        tooltip="选择一个或多个测试数据配置，执行时会使用这些配置中的所有数据"
                      >
                        <Select
                          mode="multiple"
                          placeholder="选择测试数据配置"
                          loading={loadingConfigs}
                          value={associatedConfigs.map(c => c.id)}
                          onChange={async (configIds: number[]) => {
                            if (!editingCase) {
                              // 创建新用例时，只更新本地状态，保存时再关联
                              const selectedConfigs = testDataConfigs.filter(c => configIds.includes(c.id))
                              setAssociatedConfigs(selectedConfigs.map(c => ({
                                id: c.id,
                                name: c.name,
                                description: c.description,
                                project_id: c.project_id,
                                data: [],
                                is_active: c.is_active
                              })))
                              return
                            }
                            
                            // 获取当前已关联的配置ID
                            const currentIds = associatedConfigs.map(c => c.id)
                            
                            // 找出新增和删除的配置
                            const toAdd = configIds.filter(id => !currentIds.includes(id))
                            const toRemove = currentIds.filter(id => !configIds.includes(id))
                            
                            try {
                              // 添加新关联
                              for (const configId of toAdd) {
                                await testDataConfigService.associateTestCase(editingCase.id, configId)
                              }
                              
                              // 删除关联
                              for (const configId of toRemove) {
                                await testDataConfigService.disassociateTestCase(editingCase.id, configId)
                              }
                              
                              // 重新加载关联配置
                              await loadAssociatedConfigs(editingCase.id)
                              message.success('关联更新成功')
                            } catch (error: any) {
                              message.error('更新关联失败: ' + (error.response?.data?.detail || error.message))
                              // 恢复原值
                              await loadAssociatedConfigs(editingCase.id)
                            }
                          }}
                          style={{ width: '100%' }}
                          showSearch
                          filterOption={(input, option) =>
                            (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                          }
                        >
                          {testDataConfigs
                            .filter(config => config.is_active)
                            .map(config => (
                              <Option key={config.id} value={config.id}>
                                {config.name} ({config.data_count} 条数据)
                              </Option>
                            ))}
                        </Select>
                      </Form.Item>
                      {associatedConfigs.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ marginBottom: 8, color: '#0c4a6e', fontWeight: 'bold' }}>已关联的配置：</div>
                          {associatedConfigs.map(config => (
                            <div key={config.id} style={{ 
                              marginBottom: 8, 
                              padding: '8px 12px', 
                              background: '#fff', 
                              borderRadius: 4,
                              border: '1px solid #d1d5db'
                            }}>
                              <div style={{ fontWeight: 'bold', color: '#111827' }}>{config.name}</div>
                              {config.description && (
                                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{config.description}</div>
                              )}
                              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                                数据行数: {config.data?.length || 0}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, marginTop: 16, color: '#1f2937' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#111827' }}>数据驱动说明：</p>
                    <ul style={{ marginTop: 8, marginBottom: 0, color: '#374151' }}>
                      <li>数据驱动用例：通过外部数据源驱动用例执行，支持数据模板和循环策略</li>
                      <li>启用后，可以在上方选择已创建的测试数据配置</li>
                    </ul>
                  </div>
                </>
              ),
            },
            {
              key: 'workflow',
              label: '流程编排（多接口用例）',
              children: (
                <>
                   <Form.Item 
                     name="workflow" 
                     label="流程编排配置（JSON格式）"
                     tooltip='多接口用例的流程编排，包含步骤顺序、数据传递、异常处理等，例如: {"steps": [{"step_id": 1, "interface_id": 1, "name": "登录", "data_mapping": {"username": "$var.user"}, "on_error": "stop"}], "data_flow": {"user": {"from": 1, "extract": "$.data.user"}}}'
                   >
                     <TextArea 
                       rows={10}
                       placeholder='{"steps": [{"step_id": 1, "interface_id": 1, "name": "步骤1", "data_mapping": {}, "on_error": "stop"}], "data_flow": {}}' 
                       style={{ fontFamily: 'monospace', minHeight: '240px' }}
                     />
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
                    name="interface_id"
                    label="关联接口"
                    tooltip="选择已在接口管理中配置好的接口，系统会自动填充请求配置"
                    preserve={true}
                  >
                    <Select
                      allowClear
                      showSearch
                      placeholder="请选择关联接口（可搜索名称/路径）"
                      optionFilterProp="children"
                      onChange={(value) => handleInterfaceChange(value)}
                      getPopupContainer={(trigger) => trigger.parentElement || document.body}
                    >
                      {Array.isArray(interfaces) && (interfaces as Interface[]).map(iface => (
                        <Option key={iface.id} value={iface.id}>
                          {iface.name} ({iface.method} {iface.path})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                   <Form.Item 
                     name="request_config" 
                     label="请求配置（JSON格式）"
                     tooltip='JSON格式，包含headers、params、body等。支持使用变量，例如: $userId 或 ${extracted_token}。如果已选择关联接口，系统会自动填充配置'
                     preserve={true}
                   >
                     <TextArea 
                       rows={10}
                       placeholder='{"headers": {"Content-Type": "application/json"}, "params": {"page": 1}, "body": {"name": "test"}}' 
                       style={{ fontFamily: 'monospace', minHeight: '240px' }}
                     />
                   </Form.Item>
                </>
              ),
            },
            {
              key: 'assertions',
              label: '断言配置',
              children: (
                <>
                  <Form.Item label="可视化断言列表">
                    <Form.List name="assertions_list">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map((field) => (
                            <Space
                              key={field.key}
                              align="baseline"
                              style={{ display: 'flex', marginBottom: 8 }}
                            >
                              <Form.Item
                                {...field}
                                name={[field.name, 'type']}
                                fieldKey={[field.fieldKey, 'type']}
                                rules={[{ required: true, message: '请选择断言类型' }]}
                              >
                                <Select placeholder="断言类型" style={{ width: 140 }}>
                                  <Option value="status_code">状态码</Option>
                                  <Option value="response_body">JSON字段</Option>
                                  <Option value="node">节点断言</Option>
                                </Select>
                              </Form.Item>
                              <Form.Item
                                noStyle
                                shouldUpdate={(prev, cur) =>
                                  prev.assertions_list !== cur.assertions_list
                                }
                              >
                                {({ getFieldValue }) => {
                                  const list = getFieldValue('assertions_list') || []
                                  const current = list[field.name] || {}
                                  if (current.type === 'response_body') {
                                    return (
                                      <>
                                        <Form.Item
                                          {...field}
                                          name={[field.name, 'path']}
                                          fieldKey={[field.fieldKey, 'path']}
                                          rules={[{ required: true, message: '请输入JSON路径' }]}
                                        >
                                          <Input
                                            placeholder="JSONPath，例如 $.data.code"
                                            style={{ width: 220 }}
                                          />
                                        </Form.Item>
                                        <Form.Item
                                          {...field}
                                          name={[field.name, 'operator']}
                                          fieldKey={[field.fieldKey, 'operator']}
                                          initialValue="equal"
                                        >
                                          <Select placeholder="运算符" style={{ width: 120 }}>
                                            <Option value="equal">=</Option>
                                            <Option value="not_equal">≠</Option>
                                            <Option value="contains">包含</Option>
                                            <Option value="not_contains">不包含</Option>
                                            <Option value="gt">&gt;</Option>
                                            <Option value="lt">&lt;</Option>
                                          </Select>
                                        </Form.Item>
                                      </>
                                    )
                                  }
                                  if (current.type === 'node') {
                                    return (
                                      <>
                                        <Form.Item
                                          {...field}
                                          name={[field.name, 'path']}
                                          fieldKey={[field.fieldKey, 'path']}
                                          rules={[{ required: true, message: '请输入节点路径' }]}
                                        >
                                          <Input
                                            placeholder="节点路径，例如 $.data"
                                            style={{ width: 200 }}
                                          />
                                        </Form.Item>
                                        <Form.Item
                                          {...field}
                                          name={[field.name, 'mode']}
                                          fieldKey={[field.fieldKey, 'mode']}
                                          initialValue="all_fields"
                                        >
                                          <Select placeholder="断言模式" style={{ width: 120 }}>
                                            <Option value="all_fields">所有字段</Option>
                                            <Option value="template">模板模式</Option>
                                            <Option value="auto_generate">自动生成</Option>
                                            <Option value="smart">智能模式</Option>
                                          </Select>
                                        </Form.Item>
                                      </>
                                    )
                                  }
                                  // 默认视为状态码断言，仅需期望值
                                  return null
                                }}
                              </Form.Item>
                              <Form.Item
                                noStyle
                                shouldUpdate={(prev, cur) =>
                                  prev.assertions_list !== cur.assertions_list
                                }
                              >
                                {({ getFieldValue }) => {
                                  const list = getFieldValue('assertions_list') || []
                                  const current = list[field.name] || {}
                                  
                                  // 节点断言使用 TextArea 输入 expected（JSON对象）
                                  if (current.type === 'node') {
                                    return (
                                      <Form.Item
                                        {...field}
                                        name={[field.name, 'expected']}
                                        fieldKey={[field.fieldKey, 'expected']}
                                        tooltip='JSON对象格式，例如: {"user_id": 1001, "username": "user1"}'
                                      >
                                        <TextArea 
                                          placeholder='{"user_id": 1001, "username": "user1"}' 
                                          style={{ width: 350, fontFamily: 'monospace', fontSize: '12px', minHeight: '240px' }} 
                                          rows={10}
                                        />
                                      </Form.Item>
                                    )
                                  }
                                  
                                  // 其他类型使用 Input
                                  return (
                                    <Form.Item
                                      {...field}
                                      name={[field.name, 'expected']}
                                      fieldKey={[field.fieldKey, 'expected']}
                                    >
                                      <Input placeholder="期望值" style={{ width: 160 }} />
                                    </Form.Item>
                                  )
                                }}
                              </Form.Item>
                              <Button
                                size="small"
                                danger
                                type="link"
                                onClick={() => remove(field.name)}
                              >
                                删除
                              </Button>
                            </Space>
                          ))}
                          <Space>
                            <Button
                              type="dashed"
                              size="small"
                              onClick={() =>
                                add({
                                  type: 'status_code',
                                  expected: 200,
                                })
                              }
                            >
                              添加状态码断言
                            </Button>
                            <Button
                              type="dashed"
                              size="small"
                              onClick={() =>
                                add({
                                  type: 'node',
                                  path: '$.data',
                                  mode: 'all_fields',
                                  expected: '{}',
                                })
                              }
                            >
                              添加节点断言
                            </Button>
                          </Space>
                        </>
                      )}
                    </Form.List>
                  </Form.Item>
                   <Form.Item 
                     name="assertions" 
                     label="断言规则"
                     tooltip='JSON格式，例如: [{"type": "status_code", "expected": 200}, {"type": "response_body", "path": "$.code", "expected": 0}]'
                   >
                     <TextArea 
                       rows={10}
                       placeholder='[{"type": "status_code", "expected": 200}, {"type": "response_body", "path": "$.code", "expected": 0}]' 
                       style={{ fontFamily: 'monospace', minHeight: '240px' }}
                      onChange={(e) => {
                        // 实时验证断言语法
                        const value = e.target.value
                        if (value && value.trim()) {
                          try {
                            const parsed = JSON.parse(value)
                            if (Array.isArray(parsed)) {
                              // 语法检查通过
                              form.setFields([
                                {
                                  name: 'assertions',
                                  errors: [],
                                },
                              ])
                            } else {
                              form.setFields([
                                {
                                  name: 'assertions',
                                  errors: ['断言配置必须是数组格式'],
                                },
                              ])
                            }
                          } catch (error: any) {
                            form.setFields([
                              {
                                name: 'assertions',
                                errors: ['JSON格式错误: ' + error.message],
                              },
                            ])
                          }
                        }
                      }}
                    />
                  </Form.Item>
                  <Space style={{ marginBottom: 16 }}>
                    <Button 
                      size="small"
                      onClick={() => {
                        const assertions = form.getFieldValue('assertions')
                        if (!assertions) {
                          message.warning('请先输入断言配置')
                          return
                        }
                        try {
                          const parsed = JSON.parse(assertions)
                          if (!Array.isArray(parsed)) {
                            message.error('断言配置必须是数组格式')
                            return
                          }
                          // 语法检查
                          let hasError = false
                          const errors: string[] = []
                          parsed.forEach((assertion: any, index: number) => {
                            if (!assertion.type) {
                              errors.push(`断言 ${index + 1}: 缺少type字段`)
                              hasError = true
                            }
                            if (assertion.type === 'status_code' && !assertion.expected) {
                              errors.push(`断言 ${index + 1}: status_code类型需要expected字段`)
                              hasError = true
                            }
                            if (assertion.type === 'response_body' && (!assertion.path || !assertion.expected)) {
                              errors.push(`断言 ${index + 1}: response_body类型需要path和expected字段`)
                              hasError = true
                            }
                            if (assertion.type === 'script' && !assertion.script) {
                              errors.push(`断言 ${index + 1}: script类型需要script字段`)
                              hasError = true
                            }
                            if (assertion.type === 'combined' && (!assertion.assertions || !assertion.logic)) {
                              errors.push(`断言 ${index + 1}: combined类型需要assertions数组和logic字段`)
                              hasError = true
                            }
                          })
                          if (hasError) {
                            message.error('断言验证失败:\n' + errors.join('\n'))
                          } else {
                            message.success('断言语法检查通过')
                          }
                        } catch (error: any) {
                          message.error('断言验证失败: ' + error.message)
                        }
                      }}
                    >
                      语法检查
                    </Button>
                    <Button 
                      size="small"
                      onClick={() => {
                        const assertions = form.getFieldValue('assertions')
                        if (!assertions) {
                          message.warning('请先输入断言配置')
                          return
                        }
                        try {
                          const parsed = JSON.parse(assertions)
                          // 逻辑验证
                          let hasError = false
                          const errors: string[] = []
                          parsed.forEach((assertion: any, index: number) => {
                            if (assertion.type === 'combined') {
                              if (!Array.isArray(assertion.assertions) || assertion.assertions.length === 0) {
                                errors.push(`断言 ${index + 1}: combined类型的assertions数组不能为空`)
                                hasError = true
                              }
                              if (assertion.logic !== 'and' && assertion.logic !== 'or') {
                                errors.push(`断言 ${index + 1}: combined类型的logic必须是and或or`)
                                hasError = true
                              }
                            }
                            if (assertion.type === 'script') {
                              try {
                                // 尝试解析脚本
                                new Function(assertion.script)
                              } catch (e: any) {
                                errors.push(`断言 ${index + 1}: 脚本语法错误: ${e.message}`)
                                hasError = true
                              }
                            }
                          })
                          if (hasError) {
                            message.error('逻辑验证失败:\n' + errors.join('\n'))
                          } else {
                            message.success('逻辑验证通过')
                          }
                        } catch (error: any) {
                          message.error('逻辑验证失败: ' + error.message)
                        }
                      }}
                    >
                      逻辑验证
                    </Button>
                    <Button 
                      size="small"
                      onClick={() => {
                        const assertions = form.getFieldValue('assertions')
                        if (!assertions) {
                          message.warning('请先输入断言配置')
                          return
                        }
                        try {
                          const parsed = JSON.parse(assertions)
                          // 性能评估
                          let totalComplexity = 0
                          parsed.forEach((assertion: any) => {
                            if (assertion.type === 'status_code') {
                              totalComplexity += 1
                            } else if (assertion.type === 'response_body') {
                              totalComplexity += 2
                            } else if (assertion.type === 'database') {
                              totalComplexity += 5
                            } else if (assertion.type === 'script') {
                              totalComplexity += 3
                            } else if (assertion.type === 'combined') {
                              totalComplexity += assertion.assertions?.length || 0
                            }
                          })
                          let performanceLevel = '低'
                          if (totalComplexity > 10) {
                            performanceLevel = '高'
                          } else if (totalComplexity > 5) {
                            performanceLevel = '中'
                          }
                          message.info(`性能评估: ${performanceLevel} (复杂度: ${totalComplexity})`)
                        } catch (error: any) {
                          message.error('性能评估失败: ' + error.message)
                        }
                      }}
                    >
                      性能评估
                    </Button>
                  </Space>
                  
                  
                </>
              ),
            },
            {
              key: 'extractors',
              label: '关联提取',
              children: (
                <>
                   <Form.Item 
                     name="extractors" 
                     label="提取规则"
                     tooltip='JSON格式，例如: [{"name": "token", "type": "json", "path": "$.data.token"}, {"name": "userId", "type": "regex", "pattern": "userId=(\\d+)"}]'
                   >
                     <TextArea 
                       rows={10}
                       placeholder='[{"name": "token", "type": "json", "path": "$.data.token"}, {"name": "userId", "type": "regex", "pattern": "userId=(\\d+)"}]' 
                       style={{ fontFamily: 'monospace', minHeight: '240px' }}
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
                    tooltip="请求超时时间，单位：秒"
                  >
                    <InputNumber min={1} max={300} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item 
                    name="retry_count" 
                    label="重试次数"
                    tooltip="失败后自动重试的次数"
                  >
                    <InputNumber min={0} max={10} style={{ width: '100%' }} />
                  </Form.Item>
                   <Form.Item 
                     name="pre_script" 
                     label="前置脚本"
                     tooltip="执行前运行的JavaScript脚本"
                   >
                     <TextArea 
                       rows={10}
                       placeholder="// 前置脚本示例&#10;console.log('执行前置脚本');" 
                       style={{ fontFamily: 'monospace', minHeight: '240px' }}
                     />
                   </Form.Item>
                   <Form.Item 
                     name="post_script" 
                     label="后置脚本"
                     tooltip="执行后运行的JavaScript脚本"
                   >
                     <TextArea 
                       rows={10}
                       placeholder="// 后置脚本示例&#10;console.log('执行后置脚本');" 
                       style={{ fontFamily: 'monospace', minHeight: '240px' }}
                     />
                   </Form.Item>
                  
                  <Form.Item 
                    name="advanced_config" 
                    label="高级配置（JSON）"
                    tooltip="其他高级配置（JSON格式）"
                  >
                    <TextArea 
                      rows={6}
                      placeholder={`{
  "custom_config": {
    // 其他自定义配置
  }
}`}
                      style={{ fontFamily: 'monospace', fontSize: '12px', minHeight: '120px' }}
                    />
                  </Form.Item>
                </>
              ),
            },
          ]} />
        </Form>
      </Modal>

      <Modal
        title={`批量编辑 (${selectedRowKeys.length} 个用例)`}
        open={batchEditVisible}
        onOk={handleBatchEdit}
        onCancel={() => {
          setBatchEditVisible(false)
          batchEditForm.resetFields()
        }}
        width={600}
      >
        <Form form={batchEditForm} layout="vertical">
          <Form.Item name="tags" label="标签">
            <Select 
              mode="tags" 
              placeholder="输入标签后按回车，将应用到所有选中的用例"
              options={Array.isArray(allTags) ? allTags.map(tag => tag ? ({ label: tag, value: tag }) : null).filter(Boolean) as Array<{ label: string; value: string }> : []}
            />
          </Form.Item>
          <Form.Item name="priority" label="优先级">
            <Select placeholder="选择优先级，将应用到所有选中的用例" allowClear>
              <Option value="low">低</Option>
              <Option value="medium">中</Option>
              <Option value="high">高</Option>
              <Option value="critical">紧急</Option>
            </Select>
          </Form.Item>
          <Form.Item name="owner_id" label="负责人">
            <Select placeholder="选择负责人，将应用到所有选中的用例" allowClear>
              {Array.isArray(users) ? users.map(user => (
                user && (
                  <Option key={user.id} value={user.id}>
                    {user.username}
                  </Option>
                )
              )).filter(Boolean) : []}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="选择状态，将应用到所有选中的用例" allowClear>
              <Option value="active">活跃</Option>
              <Option value="inactive">非活跃</Option>
              <Option value="archived">已归档</Option>
            </Select>
          </Form.Item>
          <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, marginTop: 16, color: '#1f2937' }}>
            <p style={{ margin: 0, color: '#374151' }}>
              提示：批量编辑只会更新已填写的字段，未填写的字段将保持不变。
            </p>
          </div>
        </Form>
      </Modal>

      <Modal
        title={`批量移动 (${selectedRowKeys.length} 个用例)`}
        open={batchMoveVisible}
        onOk={handleBatchMove}
        onCancel={() => {
          setBatchMoveVisible(false)
          batchMoveForm.resetFields()
        }}
        width={600}
      >
        <Form form={batchMoveForm} layout="vertical">
          <Form.Item
            name="target_project_id"
            label="目标项目"
            rules={[{ required: true, message: '请选择目标项目' }]}
          >
            <Select placeholder="请选择目标项目" onChange={(value) => {
              batchMoveForm.setFieldsValue({ target_directory_id: undefined, target_collection_id: undefined })
              setSelectedProject(value)
            }}>
              {Array.isArray(projects) ? projects.map(project => (
                project && (
                  <Option key={project.id} value={project.id}>
                    {project.name}
                  </Option>
                )
              )).filter(Boolean) : []}
            </Select>
          </Form.Item>
          <Form.Item name="target_module" label="目标模块（可选）">
            <Select 
              placeholder="请选择目标模块" 
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {Array.isArray(modules) ? modules.map(module => (
                module && (
                  <Option key={module.id} value={module.name}>
                    {module.name}
                  </Option>
                )
              )).filter(Boolean) : []}
            </Select>
          </Form.Item>
          <Form.Item name="target_directory_id" label="目标目录（可选）">
            <Select placeholder="请选择目标目录" allowClear>
              {Array.isArray(directories) ? directories.map(dir => (
                dir && (
                  <Option key={dir.id} value={dir.id}>
                    {dir.name}
                  </Option>
                )
              )).filter(Boolean) : []}
            </Select>
          </Form.Item>
          <Form.Item name="target_collection_id" label="目标用例集（可选）">
            <Select placeholder="请选择目标用例集" allowClear>
              {Array.isArray(collections) ? collections.map(collection => (
                collection && (
                  <Option key={collection.id} value={collection.id}>
                    {collection.name}
                  </Option>
                )
              )).filter(Boolean) : []}
            </Select>
          </Form.Item>
          <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, marginTop: 16, color: '#1f2937' }}>
            <p style={{ margin: 0, color: '#374151' }}>
              提示：批量移动会将选中的用例移动到指定的项目、模块、目录或用例集。
            </p>
          </div>
        </Form>
      </Modal>

      <Modal
        title={`批量复制 (${selectedRowKeys.length} 个用例)`}
        open={batchCopyVisible}
        onOk={handleBatchCopy}
        onCancel={() => {
          setBatchCopyVisible(false)
          batchCopyForm.resetFields()
        }}
        width={600}
      >
        <Form form={batchCopyForm} layout="vertical">
          <Form.Item
            name="target_project_id"
            label="目标项目（可选，不选择则保留原项目）"
          >
            <Select placeholder="请选择目标项目（可选）" allowClear>
              {Array.isArray(projects) ? projects.map(project => (
                project && (
                  <Option key={project.id} value={project.id}>
                    {project.name}
                  </Option>
                )
              )).filter(Boolean) : []}
            </Select>
          </Form.Item>
          <Form.Item name="target_module" label="目标模块（可选）">
            <Select 
              placeholder="请选择目标模块" 
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {Array.isArray(modules) ? modules.map(module => (
                module && (
                  <Option key={module.id} value={module.name}>
                    {module.name}
                  </Option>
                )
              )).filter(Boolean) : []}
            </Select>
          </Form.Item>
          <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, marginTop: 16, color: '#1f2937' }}>
            <p style={{ margin: 0, color: '#374151' }}>
              提示：批量复制会创建选中用例的副本，名称会自动添加"(副本)"后缀。
            </p>
          </div>
        </Form>
      </Modal>

      <Modal
        title="批量导入"
        open={batchImportVisible}
        onCancel={() => setBatchImportVisible(false)}
        footer={null}
        width={700}
      >
        <Upload.Dragger
          multiple
          accept=".json,.xlsx,.xls"
          beforeUpload={(file) => {
            return false // 阻止自动上传
          }}
          onChange={(info) => {
            if (info.fileList.length > 0) {
              const files = info.fileList.map(item => item.originFileObj).filter(Boolean) as File[]
              if (files.length > 0) {
                handleBatchImport(files)
              }
            }
          }}
          fileList={[]}
        >
          <p className="ant-upload-drag-icon">
            <ImportOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持批量导入多个文件，格式包括：JSON、Postman Collection、Swagger/OpenAPI、Excel
          </p>
        </Upload.Dragger>
        
      </Modal>

      <Modal
        title={`批量同步 (${selectedRowKeys.length} 个用例)`}
        open={batchSyncVisible}
        onOk={handleBatchSync}
        onCancel={() => setBatchSyncVisible(false)}
        width={600}
      >
        <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, marginBottom: 16, color: '#1f2937' }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#111827' }}>批量同步说明：</p>
          <ul style={{ marginTop: 8, marginBottom: 0, color: '#374151' }}>
            <li>批量同步会更新选中用例的同步时间戳</li>
            <li>用于标记用例已同步到外部系统</li>
            <li>同步操作会更新用例的 updated_at 字段</li>
          </ul>
        </div>
        <div style={{ padding: 12, background: '#e6f7ff', borderRadius: 4, color: '#1f2937' }}>
          <p style={{ margin: 0, color: '#111827', fontWeight: 500 }}>
            即将同步 {selectedRowKeys.length} 个测试用例
          </p>
        </div>
      </Modal>

      <Modal
        title="用例引用"
        open={referenceModalVisible}
        onOk={handleReferenceSubmit}
        onCancel={() => {
          setReferenceModalVisible(false)
          referenceForm.resetFields()
          setReferencingCase(null)
        }}
        width={600}
      >
        <Form form={referenceForm} layout="vertical">
          <Form.Item
            name="referenced_case_id"
            label="选择要引用的用例"
            rules={[{ required: true, message: '请选择要引用的用例' }]}
          >
            <Select
              placeholder="请选择要引用的用例"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {testCases
                .filter(tc => tc.id !== referencingCase?.id)
                .map(tc => (
                  <Option key={tc.id} value={tc.id} label={tc.name}>
                    {tc.name} ({tc.test_type})
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="name"
            label="新用例名称"
            rules={[{ required: true, message: '请输入用例名称' }]}
          >
            <Input placeholder="请输入新用例名称" />
          </Form.Item>
          <Form.Item
            name="project_id"
            label="所属项目"
            rules={[{ required: true, message: '请选择项目' }]}
          >
            <Select placeholder="请选择项目">
              {Array.isArray(projects) ? projects.map(project => (
                project && (
                  <Option key={project.id} value={project.id}>
                    {project.name}
                  </Option>
                )
              )).filter(Boolean) : []}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="用例描述">
            <TextArea rows={3} placeholder="请输入用例描述" />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="输入标签后按回车" />
          </Form.Item>
          <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, marginTop: 16, color: '#1f2937' }}>
            <p style={{ margin: 0, color: '#374151' }}>
              提示：用例引用会创建一个新用例，引用原用例的所有配置。当原用例更新时，引用用例不会自动更新。
            </p>
          </div>
        </Form>
      </Modal>

      <Modal
        title="创建模板"
        open={templateModalVisible}
        onOk={handleTemplateSubmit}
        onCancel={() => {
          setTemplateModalVisible(false)
          templateForm.resetFields()
          setReferencingCase(null)
        }}
        width={600}
      >
        <Form form={templateForm} layout="vertical">
          <Form.Item
            name="name"
            label="模板名称"
            rules={[{ required: true, message: '请输入模板名称' }]}
          >
            <Input placeholder="请输入模板名称" />
          </Form.Item>
          <Form.Item name="description" label="模板描述">
            <TextArea rows={3} placeholder="请输入模板描述" />
          </Form.Item>
          <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, marginTop: 16, color: '#1f2937' }}>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#111827' }}>模板说明：</p>
            <ul style={{ marginTop: 8, marginBottom: 0, color: '#374151' }}>
              <li>创建模板后，该用例会被标记为系统模板</li>
              <li>模板用例可以在"系统模板"视图中查看</li>
              <li>其他用户可以基于模板快速创建新用例</li>
            </ul>
          </div>
        </Form>
      </Modal>
      {activeTab === 'collections' && (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>用例集管理</h2>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateCollection}>
              新建用例集
            </Button>
          </div>
          <Card>
            <Table
              columns={[
                {
                  title: '用例集名称',
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: '项目',
                  dataIndex: 'project_id',
                  key: 'project',
                  render: (projectId: number) => {
                    const project = Array.isArray(projects) ? projects.find(p => p && p.id === projectId) : undefined
                    return project?.name || projectId
                  },
                },
                {
                  title: '用例数量',
                  dataIndex: 'test_case_ids',
                  key: 'case_count',
                  render: (ids: number[]) => ids?.length || 0,
                },
                {
                  title: '排序',
                  dataIndex: 'order',
                  key: 'order',
                },
                {
                  title: '标签',
                  dataIndex: 'tags',
                  key: 'tags',
                  render: (tags: string[]) => {
                    if (!tags || !Array.isArray(tags) || tags.length === 0) {
                      return '-'
                    }
                    return (
                      <Space wrap>
                        {Array.isArray(tags) ? tags.filter(Boolean).map((tag, index) => (
                          <Tag key={index} color="blue">{tag}</Tag>
                        )) : null}
                      </Space>
                    )
                  },
                },
                {
                  title: '操作',
                  key: 'action',
                  render: (_: any, record: TestCaseCollection) => (
                    <Space size="middle">
                      <Button type="link" icon={<EditOutlined />} onClick={() => handleEditCollection(record)}>
                        编辑
                      </Button>
                      <Button type="link" icon={<CopyOutlined />} onClick={() => handleCloneCollection(record)}>
                        复制
                      </Button>
                      <Popconfirm
                        title="确定要删除这个用例集吗？"
                        onConfirm={() => handleDeleteCollection(record.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button type="link" danger icon={<DeleteOutlined />}>
                          删除
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
              dataSource={collections}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 20 }}
            />
          </Card>
          <Modal
            title={editingCollection ? '编辑用例集' : '新建用例集'}
            open={collectionModalVisible}
            onOk={handleCollectionSubmit}
            onCancel={() => {
              setCollectionModalVisible(false)
              collectionForm.resetFields()
            }}
            width={700}
          >
            <Form form={collectionForm} layout="vertical">
              <Form.Item
                name="name"
                label="用例集名称"
                rules={[{ required: true, message: '请输入用例集名称' }]}
              >
                <Input placeholder="请输入用例集名称" />
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
                <TextArea rows={3} placeholder="请输入用例集描述" />
              </Form.Item>
              <Form.Item
                name="test_case_ids"
                label="测试用例"
                tooltip="选择要包含在用例集中的测试用例"
              >
                <Select
                  mode="multiple"
                  placeholder="请选择测试用例"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {Array.isArray(testCases) ? testCases.map(testCase => (
                    testCase && (
                      <Option key={testCase.id} value={testCase.id}>
                        {testCase.name}
                      </Option>
                    )
                  )).filter(Boolean) : []}
                </Select>
              </Form.Item>
              <Form.Item name="order" label="排序" initialValue={0}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="tags" label="标签">
                <Select mode="tags" placeholder="输入标签后按回车" />
              </Form.Item>
            </Form>
          </Modal>
        </>
      )}

      {/* 版本管理Modal */}
      <Modal
        title={`版本管理 - ${selectedTestCaseForVersion?.name || ''}`}
        open={versionModalVisible}
        onCancel={() => {
          setVersionModalVisible(false)
          setSelectedTestCaseForVersion(null)
          setVersions([])
          versionForm.resetFields()
        }}
        width={900}
        footer={null}
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              versionForm.resetFields()
              versionForm.setFieldsValue({
                version: `v${versions.length + 1}`,
              })
            }}
          >
            创建新版本
          </Button>
        </div>

        <Form form={versionForm} layout="inline" onFinish={handleCreateVersion} style={{ marginBottom: 16 }}>
          <Form.Item
            name="version"
            label="版本号"
            rules={[{ required: true, message: '请输入版本号' }]}
          >
            <Input placeholder="如: v1.0.0" style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="name" label="版本名称">
            <Input placeholder="版本名称（可选）" style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="description" label="版本备注">
            <Input placeholder="版本备注（可选）" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              创建
            </Button>
          </Form.Item>
        </Form>

        <Table
          columns={[
            {
              title: '版本号',
              dataIndex: 'version',
              key: 'version',
            },
            {
              title: '版本名称',
              dataIndex: 'name',
              key: 'name',
            },
            {
              title: '备注',
              dataIndex: 'description',
              key: 'description',
              ellipsis: true,
            },
            {
              title: '创建时间',
              dataIndex: 'created_at',
              key: 'created_at',
              render: (text: string) => text ? new Date(text).toLocaleString() : '-',
            },
            {
              title: '操作',
              key: 'action',
              render: (_: any, record: any) => (
                <Space>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleCompareVersions(record.id)}
                  >
                    对比
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleRestoreVersion(record.id)}
                  >
                    恢复
                  </Button>
                  <Popconfirm
                    title="确定要删除这个版本吗？"
                    onConfirm={() => handleDeleteVersion(record.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="link" danger size="small">
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          dataSource={versions}
          rowKey="id"
          pagination={false}
        />
      </Modal>

      {/* 版本对比Modal */}
      <Modal
        title="版本对比"
        open={compareModalVisible}
        onCancel={() => {
          setCompareModalVisible(false)
          setCompareResult(null)
        }}
        width={800}
        footer={null}
      >
        {compareResult && (
          <div>
            <p>对比版本: {compareResult.version} vs {compareResult.compare_with}</p>
            <Table
              columns={[
                {
                  title: '字段',
                  dataIndex: 'field',
                  key: 'field',
                },
                {
                  title: '版本值',
                  dataIndex: 'version',
                  key: 'version',
                  render: (text: any) => (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text)}
                    </pre>
                  ),
                },
                {
                  title: '对比值',
                  dataIndex: 'compare',
                  key: 'compare',
                  render: (text: any) => (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text)}
                    </pre>
                  ),
                },
              ]}
              dataSource={Object.entries(compareResult.differences || {}).map(([field, diff]: [string, any]) => ({
                key: field,
                field,
                version: diff.version,
                compare: diff.compare,
              }))}
              pagination={false}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

export default TestCases
