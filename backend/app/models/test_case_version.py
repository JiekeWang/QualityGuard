"""
测试用例版本模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class TestCaseVersion(Base):
    """测试用例版本模型"""
    __tablename__ = "test_case_versions"
    
    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=False)
    version = Column(String(50), nullable=False, index=True)  # 版本号，如 "1.0.0", "v1", "2024-01-01"
    name = Column(String(200))  # 版本名称
    description = Column(Text)  # 版本备注
    content = Column(JSON)  # 版本内容（完整的测试用例数据快照）
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # 创建人
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    test_case = relationship("TestCase", backref="versions")
    creator = relationship("User", foreign_keys=[created_by], backref="created_test_case_versions")

