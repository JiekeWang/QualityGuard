"""
项目相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ProjectBase(BaseModel):
    """项目基础模型"""
    name: str = Field(..., min_length=1, max_length=100, description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")


class ProjectCreate(ProjectBase):
    """创建项目模型"""
    pass


class ProjectUpdate(BaseModel):
    """更新项目模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class ProjectResponse(ProjectBase):
    """项目响应模型"""
    id: int
    owner_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

