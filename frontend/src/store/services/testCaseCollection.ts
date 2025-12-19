import { api } from './api'

export interface TestCaseCollection {
  id: number
  name: string
  description?: string
  project_id: number
  test_case_ids?: number[]
  order?: number
  tags?: string[]
  created_at?: string
  updated_at?: string
}

export interface TestCaseCollectionCreate {
  name: string
  description?: string
  project_id: number
  test_case_ids?: number[]
  order?: number
  tags?: string[]
}

export interface TestCaseCollectionUpdate {
  name?: string
  description?: string
  test_case_ids?: number[]
  order?: number
  tags?: string[]
}

export const testCaseCollectionService = {
  async getCollections(params?: { project_id?: number; skip?: number; limit?: number }): Promise<TestCaseCollection[]> {
    const response = await api.get('/test-case-collections/', { params })
    return Array.isArray(response.data) ? response.data : []
  },

  async getCollection(id: number): Promise<TestCaseCollection> {
    const response = await api.get(`/test-case-collections/${id}`)
    return response.data
  },

  async createCollection(data: TestCaseCollectionCreate): Promise<TestCaseCollection> {
    const response = await api.post('/test-case-collections/', data)
    return response.data
  },

  async updateCollection(id: number, data: TestCaseCollectionUpdate): Promise<TestCaseCollection> {
    const response = await api.put(`/test-case-collections/${id}`, data)
    return response.data
  },

  async deleteCollection(id: number): Promise<void> {
    await api.delete(`/test-case-collections/${id}`)
  },
}

