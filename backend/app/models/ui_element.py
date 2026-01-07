"""
UI元素模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class LocatorType(str, enum.Enum):
    """定位策略枚举"""
    ID = "id"
    CSS = "css"
    XPATH = "xpath"
    TEXT = "text"
    LINK_TEXT = "link_text"
    PARTIAL_LINK_TEXT = "partial_link_text"
    TAG_NAME = "tag_name"
    NAME = "name"
    CLASS_NAME = "class_name"
    COMBINED = "combined"  # 组合定位


class ElementType(str, enum.Enum):
    """元素类型枚举"""
    BUTTON = "button"
    INPUT = "input"
    SELECT = "select"
    CHECKBOX = "checkbox"
    RADIO = "radio"
    LINK = "link"
    IMAGE = "image"
    TEXT = "text"
    DIV = "div"
    SPAN = "span"
    OTHER = "other"


class UIElement(Base):
    """UI元素模型"""
    __tablename__ = "ui_elements"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    page_object_id = Column(Integer, ForeignKey("page_objects.id"), nullable=False)
    
    # 定位信息
    locator_type = Column(Enum(LocatorType), nullable=False)  # 定位策略
    locator_value = Column(String(500), nullable=False)  # 定位值
    locator_alternative = Column(JSON)  # 备用定位策略列表
    
    # 元素属性
    element_type = Column(Enum(ElementType))  # 元素类型
    is_required = Column(Boolean, default=False)  # 是否必填
    default_value = Column(String(500))  # 默认值
    
    # 等待策略
    wait_strategy = Column(JSON)  # 等待策略配置：显式等待、隐式等待、自定义等待条件
    
    # 操作封装
    operations = Column(JSON)  # 操作封装：点击、输入、选择等操作配置
    
    # 元数据
    tags = Column(JSON)  # 标签
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # 关系
    page_object = relationship("PageObject", back_populates="elements")
    creator = relationship("User", backref="created_ui_elements")

