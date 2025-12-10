"""
测试计划模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class TestPlan(Base):
    """测试计划模型"""
    __tablename__ = "test_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    test_case_ids = Column(JSON)  # 测试用例ID列表
    config = Column(JSON)  # 执行配置
    schedule = Column(JSON)  # 调度配置
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    project = relationship("Project", backref="test_plans")

