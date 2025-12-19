"""
数据驱动配置相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


# 数据源相关模型
class DataSourceBase(BaseModel):
    """数据源基础模型"""
    name: str = Field(..., min_length=1, max_length=200, description="数据源名称")
    description: Optional[str] = Field(None, description="描述")
    type: str = Field(..., description="数据源类型")
    project_id: Optional[int] = Field(None, description="项目ID")
    config: Optional[Dict[str, Any]] = Field(None, description="数据源配置")
    is_active: Optional[bool] = Field(default=True, description="是否激活")


class DataSourceCreate(DataSourceBase):
    """创建数据源模型"""
    pass


class DataSourceUpdate(BaseModel):
    """更新数据源模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    type: Optional[str] = None
    project_id: Optional[int] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class DataSourceResponse(DataSourceBase):
    """数据源响应模型"""
    id: int
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# 数据模板相关模型
class DataTemplateBase(BaseModel):
    """数据模板基础模型"""
    name: str = Field(..., min_length=1, max_length=200, description="模板名称")
    description: Optional[str] = Field(None, description="描述")
    data_source_id: int = Field(..., description="关联的数据源ID")
    project_id: Optional[int] = Field(None, description="项目ID")
    mapping: Optional[Dict[str, Any]] = Field(None, description="数据映射配置")
    filters: Optional[Dict[str, Any]] = Field(None, description="数据过滤条件")
    loop_strategy: Optional[str] = Field(default='all', description="循环策略")


class DataTemplateCreate(DataTemplateBase):
    """创建数据模板模型"""
    pass


class DataTemplateUpdate(BaseModel):
    """更新数据模板模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    data_source_id: Optional[int] = None
    project_id: Optional[int] = None
    mapping: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    loop_strategy: Optional[str] = None


class DataTemplateResponse(DataTemplateBase):
    """数据模板响应模型"""
    id: int
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# 数据生成器相关模型
class DataGeneratorBase(BaseModel):
    """数据生成器基础模型"""
    name: str = Field(..., min_length=1, max_length=200, description="生成器名称")
    description: Optional[str] = Field(None, description="描述")
    project_id: Optional[int] = Field(None, description="项目ID")
    type: str = Field(..., description="生成器类型")
    config: Optional[Dict[str, Any]] = Field(None, description="生成器配置")
    is_active: Optional[bool] = Field(default=True, description="是否激活")


class DataGeneratorCreate(DataGeneratorBase):
    """创建数据生成器模型"""
    pass


class DataGeneratorUpdate(BaseModel):
    """更新数据生成器模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    project_id: Optional[int] = None
    type: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class DataGeneratorResponse(DataGeneratorBase):
    """数据生成器响应模型"""
    id: int
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

