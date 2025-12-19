import { api } from './api'

export type ReviewStatus = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'revised'

export interface TestCaseReview {
  id: number
  test_case_id: number
  project_id: number
  title: string
  description?: string
  status: ReviewStatus
  reviewer_ids: number[]
  created_by: number
  reviewed_by?: number
  review_comments: Array<{
    commenter_id: number
    commenter_name?: string
    content: string
    type: string
    created_at: string
  }>
  created_at?: string
  updated_at?: string
  reviewed_at?: string
  test_case_name?: string
  creator_name?: string
  reviewer_name?: string
}

export interface TestCaseReviewCreate {
  test_case_id: number
  project_id: number
  title: string
  description?: string
  reviewer_ids?: number[]
}

export interface TestCaseReviewUpdate {
  title?: string
  description?: string
  status?: ReviewStatus
  reviewer_ids?: number[]
  reviewed_by?: number
}

export interface ReviewComment {
  id: number
  review_id: number
  commenter_id: number
  commenter_name?: string
  content: string
  type: string
  created_at?: string
}

export interface ReviewCommentCreate {
  content: string
  type?: string
}

export interface TestCaseReviewListParams {
  project_id?: number
  test_case_id?: number
  status?: ReviewStatus
  reviewer_id?: number
  created_by?: number
  skip?: number
  limit?: number
}

export const testCaseReviewService = {
  async getReviews(params?: TestCaseReviewListParams): Promise<TestCaseReview[]> {
    const response = await api.get<TestCaseReview[]>('/test-case-reviews', { params })
    return response.data
  },

  async getReview(id: number): Promise<TestCaseReview> {
    const response = await api.get<TestCaseReview>(`/test-case-reviews/${id}`)
    return response.data
  },

  async createReview(data: TestCaseReviewCreate): Promise<TestCaseReview> {
    const response = await api.post<TestCaseReview>('/test-case-reviews', data)
    return response.data
  },

  async updateReview(id: number, data: TestCaseReviewUpdate): Promise<TestCaseReview> {
    const response = await api.put<TestCaseReview>(`/test-case-reviews/${id}`, data)
    return response.data
  },

  async deleteReview(id: number): Promise<void> {
    await api.delete(`/test-case-reviews/${id}`)
  },

  async getComments(review_id: number): Promise<ReviewComment[]> {
    const response = await api.get<ReviewComment[]>(`/test-case-reviews/${review_id}/comments`)
    return response.data
  },

  async createComment(review_id: number, data: ReviewCommentCreate): Promise<ReviewComment> {
    const response = await api.post<ReviewComment>(`/test-case-reviews/${review_id}/comments`, data)
    return response.data
  },

  async approveReview(review_id: number, comment?: string): Promise<TestCaseReview> {
    const response = await api.post<TestCaseReview>(`/test-case-reviews/${review_id}/approve`, null, {
      params: comment ? { comment } : {}
    })
    return response.data
  },

  async rejectReview(review_id: number, comment: string): Promise<TestCaseReview> {
    const response = await api.post<TestCaseReview>(`/test-case-reviews/${review_id}/reject`, null, {
      params: { comment }
    })
    return response.data
  },
}

