#!/bin/bash

echo "=========================================="
echo "QualityGuard 自动化测试平台启动脚本"
echo "=========================================="

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "错误: Docker未运行，请先启动Docker"
    exit 1
fi

# 启动基础设施
echo "正在启动基础设施服务..."
docker-compose up -d

# 等待服务就绪
echo "等待服务就绪..."
sleep 5

# 检查服务状态
echo "检查服务状态..."
docker-compose ps

echo ""
echo "=========================================="
echo "服务启动完成！"
echo "=========================================="
echo "PostgreSQL: localhost:5432"
echo "Redis: localhost:6379"
echo "RabbitMQ: http://localhost:15672"
echo "MinIO: http://localhost:9001"
echo ""
echo "下一步："
echo "1. 启动后端: cd backend && uvicorn app.main:app --reload"
echo "2. 启动前端: cd frontend && npm run dev"
echo "=========================================="

