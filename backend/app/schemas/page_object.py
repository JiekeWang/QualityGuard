"""
页面对象相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.models.page_object import PageObjectStatus


class PageObjectBase(BaseModel):
    """页面对象基础模型"""
    name: str = Field(..., min_length=1, max_length=200, description="页面对象名称")
    url: Optional[str] = Field(None, max_length=500, description="页面URL或路径")
    description: Optional[str] = Field(None, description="页面描述")
    project_id: int = Field(..., description="项目ID")
    status: PageObjectStatus = Field(default=PageObjectStatus.ACTIVE, description="页面对象状态")
    module: Optional[str] = Field(None, max_length=100, description="模块")
    tags: Optional[List[str]] = Field(default=[], description="标签")


class PageObjectCreate(PageObjectBase):
    """创建页面对象模型"""
    page_config: Optional[Dict[str, Any]] = Field(default={}, description="页面配置")


class PageObjectUpdate(BaseModel):
    """更新页面对象模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    url: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    project_id: Optional[int] = None
    status: Optional[PageObjectStatus] = None
    module: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = None
    page_config: Optional[Dict[str, Any]] = None


class PageObjectResponse(PageObjectBase):
    """页面对象响应模型"""
    id: int
    page_config: Optional[Dict[str, Any]] = {}
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

