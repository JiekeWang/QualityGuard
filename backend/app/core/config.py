"""
应用配置
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """应用配置类"""
    
    # 应用基础配置
    APP_NAME: str = "QualityGuard"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # API配置
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS配置
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    
    # 数据库配置
    DATABASE_URL: str = "postgresql+asyncpg://qualityguard:qualityguard123@localhost:5432/qualityguard"
    DATABASE_ECHO: bool = False
    
    # Redis配置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""
    
    # RabbitMQ配置
    RABBITMQ_URL: str = "amqp://qualityguard:qualityguard123@localhost:5672/"
    
    # MinIO配置
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "qualityguard"
    MINIO_SECRET_KEY: str = "qualityguard123"
    MINIO_BUCKET: str = "qualityguard"
    MINIO_SECURE: bool = False
    
    # JWT配置
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # 测试引擎配置
    TEST_TIMEOUT: int = 3600  # 测试超时时间（秒）
    MAX_CONCURRENT_TESTS: int = 10  # 最大并发测试数
    
    # 文件存储
    UPLOAD_DIR: str = "./uploads"
    REPORT_DIR: str = "./reports"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

