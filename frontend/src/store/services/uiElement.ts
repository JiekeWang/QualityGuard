import { api } from './api'

export interface UIElement {
  id: number
  name: string
  description?: string
  page_object_id: number
  locator_type: 'id' | 'css' | 'xpath' | 'text' | 'link_text' | 'partial_link_text' | 'tag_name' | 'name' | 'class_name' | 'combined'
  locator_value: string
  locator_alternative?: Array<Record<string, any>>
  element_type?: 'button' | 'input' | 'select' | 'checkbox' | 'radio' | 'link' | 'image' | 'text' | 'div' | 'span' | 'other'
  is_required?: boolean
  default_value?: string
  wait_strategy?: Record<string, any>
  operations?: Record<string, any>
  tags?: string[]
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface UIElementCreate {
  name: string
  description?: string
  page_object_id: number
  locator_type: 'id' | 'css' | 'xpath' | 'text' | 'link_text' | 'partial_link_text' | 'tag_name' | 'name' | 'class_name' | 'combined'
  locator_value: string
  locator_alternative?: Array<Record<string, any>>
  element_type?: 'button' | 'input' | 'select' | 'checkbox' | 'radio' | 'link' | 'image' | 'text' | 'div' | 'span' | 'other'
  is_required?: boolean
  default_value?: string
  wait_strategy?: Record<string, any>
  operations?: Record<string, any>
  tags?: string[]
}

export interface UIElementUpdate {
  name?: string
  description?: string
  page_object_id?: number
  locator_type?: 'id' | 'css' | 'xpath' | 'text' | 'link_text' | 'partial_link_text' | 'tag_name' | 'name' | 'class_name' | 'combined'
  locator_value?: string
  locator_alternative?: Array<Record<string, any>>
  element_type?: 'button' | 'input' | 'select' | 'checkbox' | 'radio' | 'link' | 'image' | 'text' | 'div' | 'span' | 'other'
  is_required?: boolean
  default_value?: string
  wait_strategy?: Record<string, any>
  operations?: Record<string, any>
  tags?: string[]
}

export interface UIElementListParams {
  page_object_id?: number
  locator_type?: string
  element_type?: string
  search?: string
  skip?: number
  limit?: number
}

export const uiElementService = {
  // 获取UI元素列表
  async getUIElements(params?: UIElementListParams): Promise<UIElement[]> {
    const response = await api.get<UIElement[]>('/ui-elements', { params })
    return response.data
  },

  // 获取UI元素详情
  async getUIElement(id: number): Promise<UIElement> {
    const response = await api.get<UIElement>(`/ui-elements/${id}`)
    return response.data
  },

  // 创建UI元素
  async createUIElement(data: UIElementCreate): Promise<UIElement> {
    const response = await api.post<UIElement>('/ui-elements', data)
    return response.data
  },

  // 更新UI元素
  async updateUIElement(id: number, data: UIElementUpdate): Promise<UIElement> {
    const response = await api.put<UIElement>(`/ui-elements/${id}`, data)
    return response.data
  },

  // 删除UI元素
  async deleteUIElement(id: number): Promise<void> {
    await api.delete(`/ui-elements/${id}`)
  },
}

