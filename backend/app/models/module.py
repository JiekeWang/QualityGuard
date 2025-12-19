"""
模块模型
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Module(Base):
    """模块模型"""
    __tablename__ = "modules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    parent_id = Column(Integer, ForeignKey("modules.id"), nullable=True)  # 支持层级结构
    order = Column(Integer, default=0)  # 排序
    is_active = Column(Boolean, default=True)  # 是否激活
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # 创建人
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    project = relationship("Project", backref="modules")
    parent = relationship("Module", remote_side=[id], backref="children")
    creator = relationship("User", foreign_keys=[created_by], backref="created_modules")

