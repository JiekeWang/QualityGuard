"""
数据驱动配置模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class DataSource(Base):
    """数据源模型"""
    __tablename__ = "data_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)  # 数据源名称
    description = Column(Text)  # 描述
    type = Column(String(50), nullable=False)  # 数据源类型：csv, excel, json, database, api
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)  # 项目ID，null表示全局
    config = Column(JSON)  # 数据源配置（根据类型不同，配置不同）
    is_active = Column(Boolean, default=True)  # 是否激活
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # 创建人
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    project = relationship("Project", backref="data_sources")
    creator = relationship("User", foreign_keys=[created_by], backref="created_data_sources")


class DataTemplate(Base):
    """数据模板模型"""
    __tablename__ = "data_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)  # 模板名称
    description = Column(Text)  # 描述
    data_source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False)  # 关联的数据源
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)  # 项目ID
    mapping = Column(JSON)  # 数据映射配置（将数据源字段映射到用例参数）
    filters = Column(JSON)  # 数据过滤条件
    loop_strategy = Column(String(50), default='all')  # 循环策略：all, random, once
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # 创建人
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    data_source = relationship("DataSource", backref="templates")
    project = relationship("Project", backref="data_templates")
    creator = relationship("User", foreign_keys=[created_by], backref="created_data_templates")


class DataGenerator(Base):
    """数据生成器模型"""
    __tablename__ = "data_generators"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)  # 生成器名称
    description = Column(Text)  # 描述
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)  # 项目ID
    type = Column(String(50), nullable=False)  # 生成器类型：random, sequence, faker, custom
    config = Column(JSON)  # 生成器配置
    is_active = Column(Boolean, default=True)  # 是否激活
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # 创建人
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    project = relationship("Project", backref="data_generators")
    creator = relationship("User", foreign_keys=[created_by], backref="created_data_generators")

