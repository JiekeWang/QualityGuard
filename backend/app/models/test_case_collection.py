"""
测试用例集模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class TestCaseCollection(Base):
    """测试用例集模型"""
    __tablename__ = "test_case_collections"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    test_case_ids = Column(JSON)  # 测试用例ID列表
    order = Column(Integer, default=0)  # 排序
    tags = Column(JSON)  # 标签
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    project = relationship("Project", backref="test_case_collections")

