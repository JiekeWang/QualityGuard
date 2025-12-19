"""
测试执行模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class ExecutionStatus(str, enum.Enum):
    """执行状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    ERROR = "error"


class TestExecution(Base):
    """测试执行模型"""
    __tablename__ = "test_executions"
    
    id = Column(Integer, primary_key=True, index=True)
    test_plan_id = Column(Integer, ForeignKey("test_plans.id"), nullable=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    status = Column(Enum(ExecutionStatus), default=ExecutionStatus.PENDING)
    result = Column(JSON)  # 执行结果
    logs = Column(Text)  # 执行日志
    config = Column(JSON)  # 执行配置
    environment = Column(String(100))  # 执行环境
    started_at = Column(DateTime(timezone=True))
    finished_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    test_plan = relationship("TestPlan", backref="executions")
    test_case = relationship("TestCase", backref="executions")
    project = relationship("Project", backref="executions")

