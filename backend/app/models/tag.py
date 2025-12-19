"""
标签模型
"""
from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Tag(Base):
    """标签模型"""
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    color = Column(String(20), default='blue')  # 标签颜色
    category = Column(String(50))  # 标签分类/分组
    description = Column(String(500))  # 标签描述
    usage_count = Column(Integer, default=0)  # 使用次数统计
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)  # 项目ID，null表示全局标签
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    project = relationship("Project", backref="tags")

