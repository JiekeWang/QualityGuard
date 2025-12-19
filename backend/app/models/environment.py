"""
环境模型
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class Environment(Base):
    """测试环境配置模型"""

    __tablename__ = "environments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    key = Column(String(50), nullable=False, unique=True, index=True)  # 用于引用的环境标识，如 dev/test/prod
    description = Column(Text)
    base_url = Column(String(255), nullable=True)  # 该环境下的后端基础地址
    is_active = Column(Boolean, default=True)

    # 默认请求配置
    default_headers = Column(JSON, nullable=True)
    default_params = Column(JSON, nullable=True)
    variables = Column(JSON, nullable=True)  # 业务变量，如 tenantId、locale 等

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


