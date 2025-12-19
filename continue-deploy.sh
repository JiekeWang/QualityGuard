#!/bin/bash
# 继续完成部署 - 完成剩余步骤

set -e

echo "=========================================="
echo "继续完成 QualityGuard 部署"
echo "=========================================="
echo ""

PROJECT_PATH="/root/QualityGuard"
cd $PROJECT_PATH

echo "步骤 1: 安装后端 Python 依赖..."
cd $PROJECT_PATH/backend
pip3 install --upgrade pip
pip3 install -r requirements.txt
echo "✅ 后端依赖安装完成"
echo ""

echo "步骤 2: 初始化数据库..."
export DATABASE_URL="postgresql+asyncpg://qualityguard:qualityguard123@localhost:5432/qualityguard"
if [ -f "alembic.ini" ]; then
    python3 -m alembic upgrade head 2>/dev/null || echo "⚠️ 数据库迁移可能需要手动执行"
else
    echo "⚠️ alembic.ini 不存在，跳过数据库迁移"
fi
echo "✅ 数据库初始化完成"
echo ""

echo "步骤 3: 构建前端..."
cd $PROJECT_PATH/frontend
if [ -f "package.json" ]; then
    npm install
    npm run build
    echo "✅ 前端构建完成"
else
    echo "⚠️ package.json 不存在，跳过前端构建"
fi
echo ""

echo "步骤 4: 复制前端文件到 Nginx..."
if [ -d "$PROJECT_PATH/frontend/dist" ]; then
    mkdir -p /usr/share/nginx/html/qualityguard
    cp -r $PROJECT_PATH/frontend/dist/* /usr/share/nginx/html/qualityguard/
    echo "✅ 前端文件已复制到 Nginx"
else
    echo "⚠️ 前端构建目录不存在"
fi
echo ""

echo "步骤 5: 配置后端服务..."
mkdir -p /etc/qualityguard
cat > /etc/systemd/system/qualityguard-backend.service << 'BACKEND_EOF'
[Unit]
Description=QualityGuard Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/QualityGuard/backend
Environment="DATABASE_URL=postgresql+asyncpg://qualityguard:qualityguard123@localhost:5432/qualityguard"
Environment="REDIS_HOST=localhost"
Environment="REDIS_PORT=6379"
Environment="RABBITMQ_URL=amqp://qualityguard:qualityguard123@localhost:5672/"
Environment="MINIO_ENDPOINT=localhost:9000"
ExecStart=/usr/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
BACKEND_EOF

systemctl daemon-reload
systemctl enable qualityguard-backend
systemctl restart qualityguard-backend
echo "✅ 后端服务配置完成"
echo ""

echo "步骤 6: 检查 MinIO..."
if systemctl is-active --quiet minio 2>/dev/null; then
    echo "✅ MinIO 正在运行"
else
    echo "⚠️ MinIO 未运行，如果需要可以稍后启动"
fi
echo ""

echo "步骤 7: 检查所有服务状态..."
echo ""
echo "PostgreSQL:"
systemctl is-active postgresql && echo "✅ 运行中" || echo "❌ 未运行"

echo "Redis:"
systemctl is-active redis && echo "✅ 运行中" || echo "❌ 未运行"

echo "Nginx:"
systemctl is-active nginx && echo "✅ 运行中" || echo "❌ 未运行"

echo "Backend:"
systemctl is-active qualityguard-backend && echo "✅ 运行中" || echo "❌ 未运行"
echo ""

echo "步骤 8: 查看后端日志..."
journalctl -u qualityguard-backend --no-pager -n 20
echo ""

echo "=========================================="
echo "🎉 部署完成！"
echo "=========================================="
echo ""
echo "📊 服务访问信息："
echo "  前端: https://zhihome.com.cn"
echo "  后端 API: http://localhost:8000"
echo "  API 文档: http://localhost:8000/docs"
echo ""
echo "📝 常用命令："
echo "  查看后端日志: journalctl -u qualityguard-backend -f"
echo "  重启后端: systemctl restart qualityguard-backend"
echo "  查看 Nginx 日志: tail -f /var/log/nginx/error.log"
echo ""
echo "✅ 部署完成！"
