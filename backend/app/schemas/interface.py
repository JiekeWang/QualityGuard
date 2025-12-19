"""
接口相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Union
from datetime import datetime
from app.models.interface import HttpMethod, InterfaceStatus


class InterfaceBase(BaseModel):
    """接口基础模型"""
    name: str = Field(..., min_length=1, max_length=200, description="接口名称")
    method: HttpMethod = Field(..., description="请求方法")
    path: str = Field(..., min_length=1, max_length=500, description="接口路径")
    description: Optional[str] = Field(None, description="接口描述")
    project_id: int = Field(..., description="项目ID")
    status: InterfaceStatus = Field(default=InterfaceStatus.ACTIVE, description="接口状态")
    module: Optional[str] = Field(None, max_length=100, description="模块")
    tags: Optional[List[str]] = Field(default=[], description="标签")


class InterfaceCreate(InterfaceBase):
    """创建接口模型"""
    headers: Optional[Dict[str, Any]] = Field(default={}, description="Headers配置")
    query_params: Optional[Dict[str, Any]] = Field(default={}, description="Query参数")
    path_params: Optional[Dict[str, Any]] = Field(default={}, description="Path参数")
    body_params: Optional[Union[Dict[str, Any], List[Any]]] = Field(default={}, description="Body参数（支持对象或数组）")
    form_params: Optional[Dict[str, Any]] = Field(default={}, description="Form参数")
    response_schema: Optional[Dict[str, Any]] = Field(default={}, description="响应Schema")
    response_example: Optional[Dict[str, Any]] = Field(default={}, description="响应示例")
    timeout: Optional[int] = Field(default=30, description="超时时间（秒）")
    retry_strategy: Optional[Dict[str, Any]] = Field(default={}, description="重试策略")
    pre_script: Optional[str] = Field(None, description="前置脚本")
    post_script: Optional[str] = Field(None, description="后置脚本")


class InterfaceUpdate(BaseModel):
    """更新接口模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    method: Optional[HttpMethod] = None
    path: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[InterfaceStatus] = None
    module: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = None
    headers: Optional[Dict[str, Any]] = None
    query_params: Optional[Dict[str, Any]] = None
    path_params: Optional[Dict[str, Any]] = None
    body_params: Optional[Union[Dict[str, Any], List[Any]]] = None
    form_params: Optional[Dict[str, Any]] = None
    response_schema: Optional[Dict[str, Any]] = None
    response_example: Optional[Dict[str, Any]] = None
    timeout: Optional[int] = None
    retry_strategy: Optional[Dict[str, Any]] = None
    pre_script: Optional[str] = None
    post_script: Optional[str] = None


class InterfaceResponse(InterfaceBase):
    """接口响应模型"""
    id: int
    headers: Optional[Dict[str, Any]] = {}
    query_params: Optional[Dict[str, Any]] = {}
    path_params: Optional[Dict[str, Any]] = {}
    body_params: Optional[Union[Dict[str, Any], List[Any]]] = {}
    form_params: Optional[Dict[str, Any]] = {}
    response_schema: Optional[Dict[str, Any]] = {}
    response_example: Optional[Dict[str, Any]] = {}
    timeout: Optional[int] = 30
    retry_strategy: Optional[Dict[str, Any]] = {}
    pre_script: Optional[str] = None
    post_script: Optional[str] = None
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

