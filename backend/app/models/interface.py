"""
接口模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class HttpMethod(str, enum.Enum):
    """HTTP方法枚举"""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"
    HEAD = "HEAD"
    OPTIONS = "OPTIONS"


class InterfaceStatus(str, enum.Enum):
    """接口状态枚举"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPRECATED = "deprecated"


class Interface(Base):
    """接口模型"""
    __tablename__ = "interfaces"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    method = Column(Enum(HttpMethod), nullable=False)
    path = Column(String(500), nullable=False)
    description = Column(Text)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    status = Column(Enum(InterfaceStatus), default=InterfaceStatus.ACTIVE)
    
    # 请求配置
    headers = Column(JSON)  # Headers配置
    query_params = Column(JSON)  # Query参数
    path_params = Column(JSON)  # Path参数
    body_params = Column(JSON)  # Body参数
    form_params = Column(JSON)  # Form参数
    
    # 响应配置
    response_schema = Column(JSON)  # 响应Schema
    response_example = Column(JSON)  # 响应示例
    
    # 高级配置
    timeout = Column(Integer, default=30)  # 超时时间（秒）
    retry_strategy = Column(JSON)  # 重试策略
    pre_script = Column(Text)  # 前置脚本
    post_script = Column(Text)  # 后置脚本
    
    # 元数据
    tags = Column(JSON)  # 标签
    module = Column(String(100))  # 模块
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    project = relationship("Project", backref="interfaces")
    creator = relationship("User", backref="created_interfaces")

