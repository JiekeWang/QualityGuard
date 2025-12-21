"""
Token配置Schema
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class TokenConfigExtractor(BaseModel):
    """Token提取器配置"""
    name: str = Field(..., description="提取器名称")
    type: str = Field(..., description="提取器类型: json, regex, xpath等")
    path: str = Field(..., description="提取路径（JSONPath、正则表达式等）")


class TokenConfigContent(BaseModel):
    """Token配置内容"""
    url: str = Field(..., description="Token获取接口URL")
    method: str = Field(default="POST", description="请求方法")
    headers: Optional[Dict[str, str]] = Field(default=None, description="请求头")
    body: Optional[Dict[str, Any]] = Field(default=None, description="请求体")
    params: Optional[Dict[str, str]] = Field(default=None, description="URL参数")
    extractors: List[TokenConfigExtractor] = Field(default_factory=list, description="Token提取器列表")
    retry_status_codes: Optional[List[int]] = Field(default=[401, 403], description="需要重试的状态码")


class TokenConfigBase(BaseModel):
    """Token配置基础Schema"""
    name: str = Field(..., min_length=1, max_length=200, description="Token配置名称")
    description: Optional[str] = Field(None, description="描述")
    project_id: Optional[int] = Field(None, description="所属项目ID")
    config: TokenConfigContent = Field(..., description="Token配置内容")
    is_active: bool = Field(default=True, description="是否启用")


class TokenConfigCreate(TokenConfigBase):
    """创建Token配置Schema"""
    pass


class TokenConfigUpdate(BaseModel):
    """更新Token配置Schema"""
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Token配置名称")
    description: Optional[str] = Field(None, description="描述")
    project_id: Optional[int] = Field(None, description="所属项目ID")
    config: Optional[TokenConfigContent] = Field(None, description="Token配置内容")
    is_active: Optional[bool] = Field(None, description="是否启用")


class TokenConfigResponse(TokenConfigBase):
    """Token配置响应Schema"""
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TokenConfigListResponse(BaseModel):
    """Token配置列表响应Schema"""
    total: int
    items: List[TokenConfigResponse]

