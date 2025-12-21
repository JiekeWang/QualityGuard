"""
测试数据配置模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class TestDataConfig(Base):
    """测试数据配置模型"""
    __tablename__ = "test_data_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)  # 配置名称
    description = Column(Text)  # 描述
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)  # 项目ID，null表示全局
    
    # 测试数据列表，每行包含 request 和 assertions
    # 格式: [{"request": {...}, "assertions": [...]}, ...]
    data = Column(JSON, nullable=False, default=list)  # 测试数据数组
    
    # 元数据
    is_active = Column(Boolean, default=True)  # 是否激活
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # 创建人
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    project = relationship("Project", backref="test_data_configs")
    creator = relationship("User", foreign_keys=[created_by], backref="created_test_data_configs")
    test_case_relations = relationship("TestCaseTestDataConfig", back_populates="test_data_config", cascade="all, delete-orphan")


class TestCaseTestDataConfig(Base):
    """测试用例与测试数据配置的关联表（支持多对多）"""
    __tablename__ = "test_case_test_data_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False)
    test_data_config_id = Column(Integer, ForeignKey("test_data_configs.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    test_case = relationship("TestCase", backref="test_data_config_relations")
    test_data_config = relationship("TestDataConfig", back_populates="test_case_relations")
    
    # 唯一约束：一个用例可以关联多个配置，但不能重复关联
    __table_args__ = (
        UniqueConstraint('test_case_id', 'test_data_config_id', name='uq_test_case_config'),
    )

