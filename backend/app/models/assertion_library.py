"""
预设断言库模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class AssertionLibrary(Base):
    """预设断言库模型"""
    __tablename__ = "assertion_libraries"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)  # 断言名称
    description = Column(Text)  # 断言描述
    type = Column(String(50), nullable=False)  # 断言类型：status_code, response_body, response_headers, response_time, database, script, combined
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)  # 项目ID，null表示全局
    config = Column(JSON)  # 断言配置（根据类型不同，配置不同）
    example = Column(Text)  # 使用示例
    is_public = Column(Boolean, default=False)  # 是否公开（全局可用）
    usage_count = Column(Integer, default=0)  # 使用次数
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # 创建人
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    project = relationship("Project", backref="assertion_libraries")
    creator = relationship("User", foreign_keys=[created_by], backref="created_assertion_libraries")

