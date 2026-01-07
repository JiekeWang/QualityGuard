"""
UI元素相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.models.ui_element import LocatorType, ElementType


class UIElementBase(BaseModel):
    """UI元素基础模型"""
    name: str = Field(..., min_length=1, max_length=200, description="元素名称")
    description: Optional[str] = Field(None, description="元素描述")
    page_object_id: int = Field(..., description="页面对象ID")
    locator_type: LocatorType = Field(..., description="定位策略")
    locator_value: str = Field(..., min_length=1, max_length=500, description="定位值")
    element_type: Optional[ElementType] = Field(None, description="元素类型")
    is_required: Optional[bool] = Field(default=False, description="是否必填")
    default_value: Optional[str] = Field(None, max_length=500, description="默认值")
    tags: Optional[List[str]] = Field(default=[], description="标签")


class UIElementCreate(UIElementBase):
    """创建UI元素模型"""
    locator_alternative: Optional[List[Dict[str, Any]]] = Field(default=[], description="备用定位策略列表")
    wait_strategy: Optional[Dict[str, Any]] = Field(default={}, description="等待策略配置")
    operations: Optional[Dict[str, Any]] = Field(default={}, description="操作封装配置")


class UIElementUpdate(BaseModel):
    """更新UI元素模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    page_object_id: Optional[int] = None
    locator_type: Optional[LocatorType] = None
    locator_value: Optional[str] = Field(None, min_length=1, max_length=500)
    locator_alternative: Optional[List[Dict[str, Any]]] = None
    element_type: Optional[ElementType] = None
    is_required: Optional[bool] = None
    default_value: Optional[str] = Field(None, max_length=500)
    wait_strategy: Optional[Dict[str, Any]] = None
    operations: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None


class UIElementResponse(UIElementBase):
    """UI元素响应模型"""
    id: int
    locator_alternative: Optional[List[Dict[str, Any]]] = []
    wait_strategy: Optional[Dict[str, Any]] = {}
    operations: Optional[Dict[str, Any]] = {}
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

