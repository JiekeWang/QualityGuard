"""
测试引擎基类
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from enum import Enum


class TestStatus(Enum):
    """测试状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"


class BaseTestEngine(ABC):
    """测试引擎基类"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.status = TestStatus.PENDING
    
    @abstractmethod
    async def execute(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        """执行测试用例"""
        pass
    
    @abstractmethod
    async def validate(self, test_case: Dict[str, Any]) -> bool:
        """验证测试用例配置"""
        pass
    
    async def cleanup(self):
        """清理资源"""
        pass
    
    def get_status(self) -> TestStatus:
        """获取当前状态"""
        return self.status

