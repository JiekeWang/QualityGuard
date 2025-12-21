"""
Token配置模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class TokenConfig(Base):
    """Token配置模型"""
    __tablename__ = "token_configs"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    
    # Token配置内容（JSON格式）
    # 包含: url, method, headers, body, params, extractors, retry_status_codes
    config = Column(JSON, nullable=False)
    
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    project = relationship("Project", backref="token_configs")
    creator = relationship("User", foreign_keys=[created_by], backref="created_token_configs")

