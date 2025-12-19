"""
环境相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Dict, Any
from datetime import datetime


class EnvironmentBase(BaseModel):
  """环境基础模型"""
  name: str = Field(..., min_length=1, max_length=100, description="环境名称")
  key: str = Field(..., min_length=1, max_length=50, description="环境标识，例如 dev/test/staging/prod")
  description: Optional[str] = Field(None, description="环境描述")
  base_url: Optional[str] = Field(None, description="基础URL，例如 https://api-test.example.com")
  is_active: bool = Field(default=True, description="是否启用")
  default_headers: Optional[Dict[str, Any]] = Field(
    default=None, description="默认请求头，例如 Authorization、X-Env 等"
  )
  default_params: Optional[Dict[str, Any]] = Field(
    default=None, description="默认查询参数"
  )
  variables: Optional[Dict[str, Any]] = Field(
    default=None, description="环境变量/业务变量，例如 tenantId、locale 等"
  )


class EnvironmentCreate(EnvironmentBase):
  """创建环境模型"""
  pass


class EnvironmentUpdate(BaseModel):
  """更新环境模型"""
  name: Optional[str] = Field(None, min_length=1, max_length=100)
  key: Optional[str] = Field(None, min_length=1, max_length=50)
  description: Optional[str] = None
  base_url: Optional[str] = None
  is_active: Optional[bool] = None
  default_headers: Optional[Dict[str, Any]] = None
  default_params: Optional[Dict[str, Any]] = None
  variables: Optional[Dict[str, Any]] = None


class EnvironmentResponse(EnvironmentBase):
  """环境响应模型"""
  id: int
  created_at: Optional[datetime] = None
  updated_at: Optional[datetime] = None

  class Config:
    from_attributes = True


