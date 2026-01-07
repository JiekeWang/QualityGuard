"""
页面对象模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class PageObjectStatus(str, enum.Enum):
    """页面对象状态枚举"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPRECATED = "deprecated"


class PageObject(Base):
    """页面对象模型"""
    __tablename__ = "page_objects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    url = Column(String(500))  # 页面URL或路径
    description = Column(Text)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    status = Column(Enum(PageObjectStatus), default=PageObjectStatus.ACTIVE)
    
    # 页面配置
    page_config = Column(JSON)  # 页面配置：等待策略、验证规则等
    
    # 元数据
    tags = Column(JSON)  # 标签
    module = Column(String(100))  # 模块
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    project = relationship("Project", backref="page_objects")
    creator = relationship("User", backref="created_page_objects")
    elements = relationship("UIElement", back_populates="page_object", cascade="all, delete-orphan")

