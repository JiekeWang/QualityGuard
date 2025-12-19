"""
测试用例模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Enum, Boolean
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
    steps = Column(JSON)  # 测试步骤（单接口用例）或流程步骤（多接口用例）
    config = Column(JSON)  # 测试配置
    workflow = Column(JSON)  # 流程编排（多接口用例）：包含步骤顺序、数据传递、异常处理
    is_multi_interface = Column(Boolean, default=False)  # 是否为多接口用例
    data_driver = Column(JSON)  # 数据驱动配置：包含数据源、数据模板、循环策略
    is_data_driven = Column(Boolean, default=False)  # 是否为数据驱动用例
    tags = Column(JSON)  # 标签
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # 创建人
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # 负责人
    status = Column(String(50), default='active')  # 状态：active, inactive, archived
    module = Column(String(100))  # 模块
    is_favorite = Column(JSON)  # 收藏人列表 [user_id1, user_id2]
    is_template = Column(Boolean, default=False)  # 是否为系统模板
    is_shared = Column(Boolean, default=False)  # 是否共享
    is_common = Column(Boolean, default=False)  # 是否为常用用例
    usage_count = Column(Integer, default=0)  # 使用次数
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    project = relationship("Project", backref="test_cases")
    creator = relationship("User", foreign_keys=[created_by], backref="created_test_cases")
    owner = relationship("User", foreign_keys=[owner_id], backref="owned_test_cases")

