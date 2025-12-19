"""
预设断言库相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class AssertionLibraryBase(BaseModel):
    """预设断言库基础模型"""
    name: str = Field(..., min_length=1, max_length=200, description="断言名称")
    description: Optional[str] = Field(None, description="断言描述")
    type: str = Field(..., description="断言类型")
    project_id: Optional[int] = Field(None, description="项目ID，null表示全局")
    config: Optional[Dict[str, Any]] = Field(None, description="断言配置")
    example: Optional[str] = Field(None, description="使用示例")
    is_public: Optional[bool] = Field(default=False, description="是否公开")


class AssertionLibraryCreate(AssertionLibraryBase):
    """创建预设断言库模型"""
    pass


class AssertionLibraryUpdate(BaseModel):
    """更新预设断言库模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    type: Optional[str] = None
    project_id: Optional[int] = None
    config: Optional[Dict[str, Any]] = None
    example: Optional[str] = None
    is_public: Optional[bool] = None


class AssertionLibraryResponse(AssertionLibraryBase):
    """预设断言库响应模型"""
    id: int
    usage_count: int
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

