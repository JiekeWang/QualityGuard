"""
测试执行相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from app.models.test_execution import ExecutionStatus


class TestExecutionBase(BaseModel):
    """测试执行基础模型"""
    test_case_id: int = Field(..., description="测试用例ID")
    project_id: int = Field(..., description="项目ID")


class TestExecutionCreate(TestExecutionBase):
    """创建测试执行模型"""
    config: Optional[Dict[str, Any]] = Field(default={}, description="执行配置")
    environment: Optional[str] = Field(None, description="执行环境")


class TestExecutionResponse(TestExecutionBase):
    """测试执行响应模型"""
    id: int
    status: ExecutionStatus
    result: Optional[Dict[str, Any]] = None
    logs: Optional[str] = None
    config: Dict[str, Any] = {}
    environment: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

