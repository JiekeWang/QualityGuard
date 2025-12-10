"""
测试用例模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class TestType(str, enum.Enum):
    """测试类型枚举"""
    UI = "ui"
    API = "api"
    PERFORMANCE = "performance"
    MOBILE = "mobile"
    SECURITY = "security"
    COMPATIBILITY = "compatibility"


class TestCase(Base):
    """测试用例模型"""
    __tablename__ = "test_cases"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    test_type = Column(Enum(TestType), nullable=False)
    steps = Column(JSON)  # 测试步骤
    config = Column(JSON)  # 测试配置
    tags = Column(JSON)  # 标签
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    project = relationship("Project", backref="test_cases")

