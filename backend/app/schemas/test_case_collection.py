"""
测试用例集相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TestCaseCollectionBase(BaseModel):
    """测试用例集基础模型"""
    name: str = Field(..., min_length=1, max_length=200, description="用例集名称")
    description: Optional[str] = Field(None, description="用例集描述")
    project_id: int = Field(..., description="项目ID")
    test_case_ids: Optional[List[int]] = Field(default=[], description="测试用例ID列表")
    order: Optional[int] = Field(default=0, description="排序")
    tags: Optional[List[str]] = Field(default=[], description="标签")


class TestCaseCollectionCreate(TestCaseCollectionBase):
    """创建测试用例集模型"""
    pass


class TestCaseCollectionUpdate(BaseModel):
    """更新测试用例集模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    test_case_ids: Optional[List[int]] = None
    order: Optional[int] = None
    tags: Optional[List[str]] = None


class TestCaseCollectionResponse(TestCaseCollectionBase):
    """测试用例集响应模型"""
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

