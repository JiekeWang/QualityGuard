"""
测试用例版本相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class TestCaseVersionBase(BaseModel):
    """测试用例版本基础模型"""
    test_case_id: int = Field(..., description="测试用例ID")
    version: str = Field(..., min_length=1, max_length=50, description="版本号")
    name: Optional[str] = Field(None, max_length=200, description="版本名称")
    description: Optional[str] = Field(None, description="版本备注")
    content: Optional[Dict[str, Any]] = Field(None, description="版本内容（完整的测试用例数据快照）")


class TestCaseVersionCreate(TestCaseVersionBase):
    """创建测试用例版本模型"""
    pass


class TestCaseVersionUpdate(BaseModel):
    """更新测试用例版本模型"""
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None


class TestCaseVersionResponse(TestCaseVersionBase):
    """测试用例版本响应模型"""
    id: int
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

