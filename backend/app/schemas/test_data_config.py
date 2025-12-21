"""
测试数据配置相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class TestDataItem(BaseModel):
    """测试数据项模型（每行数据）"""
    request: Dict[str, Any] = Field(default_factory=dict, description="接口入参")
    assertions: List[Dict[str, Any]] = Field(default_factory=list, description="断言配置")


class TestDataConfigBase(BaseModel):
    """测试数据配置基础模型"""
    name: str = Field(..., min_length=1, max_length=200, description="配置名称")
    description: Optional[str] = Field(None, description="描述")
    project_id: Optional[int] = Field(None, description="项目ID")
    data: List[TestDataItem] = Field(default_factory=list, description="测试数据数组")
    is_active: Optional[bool] = Field(default=True, description="是否激活")


class TestDataConfigCreate(TestDataConfigBase):
    """创建测试数据配置模型"""
    pass


class TestDataConfigUpdate(BaseModel):
    """更新测试数据配置模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    project_id: Optional[int] = None
    data: Optional[List[TestDataItem]] = None
    is_active: Optional[bool] = None


class TestDataConfigResponse(TestDataConfigBase):
    """测试数据配置响应模型"""
    id: int
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TestDataConfigListResponse(BaseModel):
    """测试数据配置列表响应模型（包含统计信息）"""
    id: int
    name: str
    description: Optional[str] = None
    project_id: Optional[int] = None
    is_active: bool
    data_count: int = Field(description="数据行数")
    associated_case_count: int = Field(default=0, description="关联用例数")
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TestCaseAssociationRequest(BaseModel):
    """关联测试用例请求模型"""
    test_data_config_id: int = Field(..., description="测试数据配置ID")


class TestCaseAssociationResponse(BaseModel):
    """关联测试用例响应模型"""
    test_case_id: int
    test_case_name: str
    test_data_config_id: int
    test_data_config_name: str
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UsageInfoResponse(BaseModel):
    """使用情况响应模型"""
    test_case_id: int
    test_case_name: str
    project_id: int
    project_name: Optional[str] = None
    associated_at: Optional[datetime] = None

