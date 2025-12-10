"""
测试引擎工厂
"""
from typing import Dict, Any
from app.engines.base_engine import BaseTestEngine
from app.engines.ui_engine import UIEngine
from app.engines.api_engine import APIEngine
from app.engines.performance_engine import PerformanceEngine


class EngineFactory:
    """测试引擎工厂类"""
    
    _engines = {
        "ui": UIEngine,
        "api": APIEngine,
        "performance": PerformanceEngine,
    }
    
    @classmethod
    def create_engine(cls, engine_type: str, config: Dict[str, Any]) -> BaseTestEngine:
        """创建测试引擎实例"""
        engine_class = cls._engines.get(engine_type.lower())
        if not engine_class:
            raise ValueError(f"Unknown engine type: {engine_type}")
        
        return engine_class(config)
    
    @classmethod
    def get_available_engines(cls) -> list:
        """获取可用的引擎类型列表"""
        return list(cls._engines.keys())

