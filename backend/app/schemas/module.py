"""
模块相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ModuleBase(BaseModel):
    """模块基础模型"""
    name: str = Field(..., min_length=1, max_length=100, description="模块名称")
    description: Optional[str] = Field(None, description="模块描述")
    project_id: int = Field(..., description="项目ID")
    parent_id: Optional[int] = Field(None, description="父模块ID")
    order: Optional[int] = Field(default=0, description="排序")
    is_active: Optional[bool] = Field(default=True, description="是否激活")


class ModuleCreate(ModuleBase):
    """创建模块模型"""
    pass


class ModuleUpdate(BaseModel):
    """更新模块模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    project_id: Optional[int] = None
    parent_id: Optional[int] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class ModuleResponse(ModuleBase):
    """模块响应模型"""
    id: int
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    children: Optional[List['ModuleResponse']] = []  # 子模块列表
    
    class Config:
        from_attributes = True


# 更新前向引用
ModuleResponse.model_rebuild()

