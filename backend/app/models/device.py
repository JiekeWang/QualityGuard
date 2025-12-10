"""
设备模型
"""
from sqlalchemy import Column, Integer, String, JSON, DateTime, Enum
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class DeviceType(str, enum.Enum):
    """设备类型枚举"""
    MOBILE = "mobile"
    BROWSER = "browser"
    DESKTOP = "desktop"


class DeviceStatus(str, enum.Enum):
    """设备状态枚举"""
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"


class Device(Base):
    """设备模型"""
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    device_type = Column(Enum(DeviceType), nullable=False)
    platform = Column(String(50), nullable=False)
    version = Column(String(50))
    status = Column(Enum(DeviceStatus), default=DeviceStatus.AVAILABLE)
    config = Column(JSON)  # 设备配置
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

