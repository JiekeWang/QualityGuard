"""
QualityGuard 主应用入口
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.v1 import api_router
from app.core.database import init_db

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="QualityGuard API",
    description="自动化测试平台API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """应用启动时初始化"""
    from app.core.redis_client import init_redis
    from app.services.scheduled_execution_scheduler import get_scheduler
    await init_db()
    await init_redis()
    # 启动定时任务调度器
    try:
        scheduler = await get_scheduler()
        await scheduler.start()
        logger.info("定时任务调度器启动成功")
    except Exception as e:
        logger.error(f"启动定时任务调度器失败: {e}", exc_info=True)


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时清理"""
    from app.core.redis_client import close_redis
    from app.services.scheduled_execution_scheduler import get_scheduler
    # 停止定时任务调度器
    scheduler = await get_scheduler()
    await scheduler.stop()
    await close_redis()


@app.get("/")
async def root():
    """根路径"""
    return JSONResponse({
        "message": "QualityGuard API",
        "version": "1.0.0",
        "status": "running"
    })


@app.get("/health")
async def health_check():
    """健康检查"""
    return JSONResponse({
        "status": "healthy",
        "service": "QualityGuard API"
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

