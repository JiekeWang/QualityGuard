@echo off
echo ==========================================
echo QualityGuard 自动化测试平台启动脚本
echo ==========================================

REM 检查Docker是否运行
docker info >nul 2>&1
if errorlevel 1 (
    echo 错误: Docker未运行，请先启动Docker
    exit /b 1
)

REM 启动基础设施
echo 正在启动基础设施服务...
docker-compose up -d

REM 等待服务就绪
echo 等待服务就绪...
timeout /t 5 /nobreak >nul

REM 检查服务状态
echo 检查服务状态...
docker-compose ps

echo.
echo ==========================================
echo 服务启动完成！
echo ==========================================
echo PostgreSQL: localhost:5432
echo Redis: localhost:6379
echo RabbitMQ: http://localhost:15672
echo MinIO: http://localhost:9001
echo.
echo 下一步：
echo 1. 启动后端: cd backend ^&^& uvicorn app.main:app --reload
echo 2. 启动前端: cd frontend ^&^& npm run dev
echo ==========================================
pause

