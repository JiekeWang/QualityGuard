"""
标签相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TagBase(BaseModel):
    """标签基础模型"""
    name: str = Field(..., min_length=1, max_length=100, description="标签名称")
    color: Optional[str] = Field(default='blue', description="标签颜色")
    category: Optional[str] = Field(None, max_length=50, description="标签分类")
    description: Optional[str] = Field(None, max_length=500, description="标签描述")
    project_id: Optional[int] = Field(None, description="项目ID，null表示全局标签")


class TagCreate(TagBase):
    """创建标签模型"""
    pass


class TagUpdate(BaseModel):
    """更新标签模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = None
    category: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    project_id: Optional[int] = None


class TagResponse(TagBase):
    """标签响应模型"""
    id: int
    usage_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TagStatsResponse(BaseModel):
    """标签统计响应模型"""
    tag_id: int
    tag_name: str
    usage_count: int
    category: Optional[str] = None

