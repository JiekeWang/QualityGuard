"""
测试用例相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.test_case import TestType


class TestCaseBase(BaseModel):
    """测试用例基础模型"""
    name: str = Field(..., min_length=1, max_length=200, description="用例名称")
    description: Optional[str] = Field(None, description="用例描述")
    project_id: int = Field(..., description="项目ID")
    test_type: TestType = Field(..., description="测试类型")
    module: Optional[str] = Field(None, max_length=100, description="模块")
    status: Optional[str] = Field(default='active', description="状态")
    owner_id: Optional[int] = Field(None, description="负责人ID")
    is_template: Optional[bool] = Field(default=False, description="是否为系统模板")
    is_shared: Optional[bool] = Field(default=False, description="是否共享")
    is_common: Optional[bool] = Field(default=False, description="是否为常用用例")


class TestCaseCreate(TestCaseBase):
    """创建测试用例模型"""
    steps: Optional[List[Dict[str, Any]]] = Field(default=[], description="测试步骤（单接口用例）或流程步骤（多接口用例）")
    config: Optional[Dict[str, Any]] = Field(default={}, description="测试配置")
    tags: Optional[List[str]] = Field(default=[], description="标签")
    workflow: Optional[Dict[str, Any]] = Field(default=None, description="流程编排（多接口用例）")
    is_multi_interface: Optional[bool] = Field(default=False, description="是否为多接口用例")


class TestCaseUpdate(BaseModel):
    """更新测试用例模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    test_type: Optional[TestType] = None
    steps: Optional[List[Dict[str, Any]]] = None
    config: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    module: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = None
    owner_id: Optional[int] = None
    project_id: Optional[int] = None
    is_template: Optional[bool] = None
    is_shared: Optional[bool] = None
    is_common: Optional[bool] = None
    workflow: Optional[Dict[str, Any]] = None
    is_multi_interface: Optional[bool] = None
    data_driver: Optional[Dict[str, Any]] = None
    is_data_driven: Optional[bool] = None


class TestCaseResponse(TestCaseBase):
    """测试用例响应模型"""
    id: int
    steps: List[Dict[str, Any]] = []
    config: Dict[str, Any] = {}
    tags: List[str] = []
    workflow: Optional[Dict[str, Any]] = None
    is_multi_interface: Optional[bool] = False
    data_driver: Optional[Dict[str, Any]] = None
    is_data_driven: Optional[bool] = False
    created_by: Optional[int] = None
    owner_id: Optional[int] = None
    is_favorite: Optional[List[int]] = []
    is_template: Optional[bool] = False
    is_shared: Optional[bool] = False
    is_common: Optional[bool] = False
    usage_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

