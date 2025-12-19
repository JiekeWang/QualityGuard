import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Card,
  Descriptions,
  Timeline,
  Avatar,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import {
  testCaseReviewService,
  TestCaseReview,
  TestCaseReviewCreate,
  TestCaseReviewUpdate,
  ReviewComment,
  ReviewCommentCreate,
} from '../store/services/testCaseReview'
import { projectService, Project } from '../store/services/project'
import { testCaseService, TestCase } from '../store/services/testCase'
import { userService } from '../store/services/user'

const { TextArea } = Input
const { Option } = Select

const TestCaseReviews: React.FC = () => {
  const [reviews, setReviews] = useState<TestCaseReview[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [editingReview, setEditingReview] = useState<TestCaseReview | null>(null)
  const [selectedReview, setSelectedReview] = useState<TestCaseReview | null>(null)
  const [selectedProject, setSelectedProject] = useState<number | undefined>()
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>()
  const [searchText, setSearchText] = useState('')
  const [form] = Form.useForm()
  const [commentForm] = Form.useForm()

  const statusOptions = [
    { value: 'pending', label: '待评审', color: 'orange' },
    { value: 'reviewing', label: '评审中', color: 'blue' },
    { value: 'approved', label: '已通过', color: 'green' },
    { value: 'rejected', label: '已拒绝', color: 'red' },
    { value: 'revised', label: '已修订', color: 'purple' },
  ]

  useEffect(() => {
    loadProjects()
    loadUsers()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadTestCases()
    }
  }, [selectedProject])

  useEffect(() => {
    loadReviews()
  }, [selectedProject, selectedStatus, searchText])

  const loadProjects = async () => {
    try {
      const data = await projectService.getProjects()
      setProjects(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error('加载项目列表失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const loadTestCases = async () => {
    if (!selectedProject) return
    try {
      const data = await testCaseService.getTestCases({ project_id: selectedProject })
      setTestCases(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error('加载测试用例列表失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const loadUsers = async () => {
    try {
      // 这里需要实现获取用户列表的API，暂时使用空数组
      setUsers([])
    } catch (error: any) {
      console.error('加载用户列表失败:', error)
    }
  }

  const loadReviews = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedProject) params.project_id = selectedProject
      if (selectedStatus) params.status = selectedStatus
      if (searchText) {
        // 搜索功能可以通过后端实现，这里暂时不传
      }
      const data = await testCaseReviewService.getReviews(params)
      setReviews(Array.isArray(data) ? data : [])
    } catch (error: any) {
      message.error('加载评审列表失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingReview(null)
    form.resetFields()
    form.setFieldsValue({ project_id: selectedProject })
    setModalVisible(true)
  }

  const handleEdit = (review: TestCaseReview) => {
    setEditingReview(review)
    form.setFieldsValue({
      title: review.title,
      description: review.description,
      test_case_id: review.test_case_id,
      project_id: review.project_id,
      reviewer_ids: review.reviewer_ids,
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await testCaseReviewService.deleteReview(id)
      message.success('删除成功')
      loadReviews()
    } catch (error: any) {
      message.error('删除失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingReview) {
        await testCaseReviewService.updateReview(editingReview.id, values)
        message.success('更新成功')
      } else {
        await testCaseReviewService.createReview(values)
        message.success('创建成功')
      }
      setModalVisible(false)
      form.resetFields()
      loadReviews()
    } catch (error: any) {
      if (error.errorFields) return
      message.error((editingReview ? '更新' : '创建') + '失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleViewDetail = async (review: TestCaseReview) => {
    try {
      const detail = await testCaseReviewService.getReview(review.id)
      setSelectedReview(detail)
      setDetailModalVisible(true)
    } catch (error: any) {
      message.error('加载评审详情失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleApprove = async (reviewId: number) => {
    try {
      await testCaseReviewService.approveReview(reviewId)
      message.success('评审已通过')
      setDetailModalVisible(false)
      loadReviews()
    } catch (error: any) {
      message.error('操作失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleReject = async (reviewId: number, comment: string) => {
    try {
      await testCaseReviewService.rejectReview(reviewId, comment)
      message.success('评审已拒绝')
      setDetailModalVisible(false)
      loadReviews()
    } catch (error: any) {
      message.error('操作失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleAddComment = async () => {
    if (!selectedReview) return
    try {
      const values = await commentForm.validateFields()
      await testCaseReviewService.createComment(selectedReview.id, values)
      message.success('评论已添加')
      commentForm.resetFields()
      const detail = await testCaseReviewService.getReview(selectedReview.id)
      setSelectedReview(detail)
      loadReviews()
    } catch (error: any) {
      message.error('添加评论失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const columns = [
    {
      title: '评审标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '测试用例',
      dataIndex: 'test_case_name',
      key: 'test_case_name',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusObj = statusOptions.find(s => s.value === status)
        return <Tag color={statusObj?.color}>{statusObj?.label || status}</Tag>
      },
    },
    {
      title: '创建人',
      dataIndex: 'creator_name',
      key: 'creator_name',
    },
    {
      title: '评审人',
      dataIndex: 'reviewer_name',
      key: 'reviewer_name',
      render: (name: string, record: TestCaseReview) => {
        if (record.reviewer_ids && record.reviewer_ids.length > 0) {
          return record.reviewer_ids.length + '人'
        }
        return '-'
      },
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
      width: 200,
      render: (_: any, record: TestCaseReview) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            查看
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <span>项目：</span>
            <Select
              placeholder="全部项目"
              style={{ width: 200 }}
              allowClear
              value={selectedProject}
              onChange={(value) => setSelectedProject(value)}
            >
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
            <span>状态：</span>
            <Select
              placeholder="全部状态"
              style={{ width: 150 }}
              allowClear
              value={selectedStatus}
              onChange={(value) => setSelectedStatus(value)}
            >
              {statusOptions.map(status => (
                <Option key={status.value} value={status.value}>
                  {status.label}
                </Option>
              ))}
            </Select>
            <Input
              placeholder="搜索评审标题"
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            disabled={!selectedProject}
          >
            新建评审
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={reviews}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      {/* 创建/编辑Modal */}
      <Modal
        title={editingReview ? '编辑评审' : '新建评审'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="评审标题" rules={[{ required: true, message: '请输入评审标题' }]}>
            <Input placeholder="请输入评审标题" />
          </Form.Item>
          <Form.Item name="description" label="评审描述">
            <TextArea rows={3} placeholder="请输入评审描述" />
          </Form.Item>
          <Form.Item name="project_id" label="项目" rules={[{ required: true, message: '请选择项目' }]}>
            <Select placeholder="请选择项目" disabled={!!editingReview}>
              {projects.map(project => (
                <Option key={project.id} value={project.id}>
                  {project.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="test_case_id" label="测试用例" rules={[{ required: true, message: '请选择测试用例' }]}>
            <Select placeholder="请选择测试用例" disabled={!!editingReview}>
              {testCases.map(testCase => (
                <Option key={testCase.id} value={testCase.id}>
                  {testCase.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="reviewer_ids" label="评审人">
            <Select mode="multiple" placeholder="请选择评审人">
              {/* 这里需要从用户列表中选择，暂时留空 */}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情Modal */}
      <Modal
        title="评审详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedReview(null)
          commentForm.resetFields()
        }}
        width={900}
        footer={null}
      >
        {selectedReview && (
          <div>
            <Descriptions column={2} bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="评审标题">{selectedReview.title}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusOptions.find(s => s.value === selectedReview.status)?.color}>
                  {statusOptions.find(s => s.value === selectedReview.status)?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="测试用例">{selectedReview.test_case_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="创建人">{selectedReview.creator_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="评审人">
                {selectedReview.reviewer_ids && selectedReview.reviewer_ids.length > 0
                  ? `${selectedReview.reviewer_ids.length}人`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {selectedReview.created_at ? new Date(selectedReview.created_at).toLocaleString() : '-'}
              </Descriptions.Item>
              {selectedReview.description && (
                <Descriptions.Item label="描述" span={2}>
                  {selectedReview.description}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ marginBottom: 24 }}>
              <h4>评审意见</h4>
              <Timeline>
                {selectedReview.review_comments && selectedReview.review_comments.length > 0 ? (
                  selectedReview.review_comments.map((comment: any, index: number) => (
                    <Timeline.Item
                      key={index}
                      color={
                        comment.type === 'approve' ? 'green' :
                        comment.type === 'reject' ? 'red' : 'blue'
                      }
                    >
                      <div>
                        <Space>
                          <Avatar size="small">{comment.commenter_name?.[0] || 'U'}</Avatar>
                          <strong>{comment.commenter_name || '未知用户'}</strong>
                          <Tag color={
                            comment.type === 'approve' ? 'green' :
                            comment.type === 'reject' ? 'red' : 'default'
                          }>
                            {comment.type === 'approve' ? '通过' :
                             comment.type === 'reject' ? '拒绝' : '评论'}
                          </Tag>
                          <span style={{ color: '#999', fontSize: '12px' }}>
                            {comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}
                          </span>
                        </Space>
                        <div style={{ marginTop: 8, marginLeft: 32 }}>{comment.content}</div>
                      </div>
                    </Timeline.Item>
                  ))
                ) : (
                  <Timeline.Item>暂无评审意见</Timeline.Item>
                )}
              </Timeline>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4>添加评论</h4>
              <Form form={commentForm} onFinish={handleAddComment}>
                <Form.Item name="content" rules={[{ required: true, message: '请输入评论内容' }]}>
                  <TextArea rows={3} placeholder="请输入评论内容" />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">提交评论</Button>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => {
                        commentForm.setFieldsValue({ content: '评审通过' })
                        handleApprove(selectedReview.id)
                      }}
                    >
                      通过
                    </Button>
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => {
                        const comment = commentForm.getFieldValue('content')
                        if (!comment) {
                          message.warning('请先输入拒绝原因')
                          return
                        }
                        handleReject(selectedReview.id, comment)
                      }}
                    >
                      拒绝
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default TestCaseReviews

