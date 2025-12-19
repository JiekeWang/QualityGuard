#!/bin/bash
# 完成部署的最后步骤：构建前端、配置服务、启动应用

set -e

echo "=========================================="
echo "完成部署的最后步骤"
echo "=========================================="
echo ""

PROJECT_PATH="/root/QualityGuard"
PYTHON_CMD="python3.11"

cd $PROJECT_PATH

echo "步骤 1: 构建前端..."
cd $PROJECT_PATH/frontend

if [ -f "package.json" ]; then
    echo "安装前端依赖..."
    npm install
    
    echo "构建前端应用..."
    npm run build
    
    if [ -d "dist" ]; then
        echo "✅ 前端构建完成"
    else
        echo "❌ 前端构建失败，dist 目录不存在"
        exit 1
    fi
else
    echo "❌ package.json 不存在"
    exit 1
fi
echo ""

echo "步骤 2: 部署前端文件到 Nginx..."
if [ -d "$PROJECT_PATH/frontend/dist" ]; then
    mkdir -p /usr/share/nginx/html/qualityguard
    cp -r $PROJECT_PATH/frontend/dist/* /usr/share/nginx/html/qualityguard/
    
    # 设置正确的权限
    chown -R nginx:nginx /usr/share/nginx/html/qualityguard 2>/dev/null || \
    chown -R root:root /usr/share/nginx/html/qualityguard
    
    echo "✅ 前端文件已部署到 Nginx"
    
    # 列出部署的文件
    FILE_COUNT=$(find /usr/share/nginx/html/qualityguard -type f | wc -l)
    echo "   部署了 $FILE_COUNT 个文件"
else
    echo "❌ 前端构建目录不存在"
    exit 1
fi
echo ""

echo "步骤 3: 配置后端服务..."
cat > /etc/systemd/system/qualityguard-backend.service << EOF
[Unit]
Description=QualityGuard Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_PATH/backend
Environment="DATABASE_URL=postgresql+asyncpg://qualityguard:qualityguard123@localhost:5432/qualityguard"
Environment="REDIS_HOST=localhost"
Environment="REDIS_PORT=6379"
Environment="RABBITMQ_URL=amqp://qualityguard:qualityguard123@localhost:5672/"
Environment="MINIO_ENDPOINT=localhost:9000"
ExecStart=/usr/bin/$PYTHON_CMD -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable qualityguard-backend

echo "✅ 后端服务配置完成"
echo ""

echo "步骤 4: 启动后端服务..."
systemctl restart qualityguard-backend
sleep 5

if systemctl is-active qualityguard-backend; then
    echo "✅ 后端服务启动成功"
else
    echo "❌ 后端服务启动失败，查看日志："
    journalctl -u qualityguard-backend --no-pager -n 30
    exit 1
fi
echo ""

echo "步骤 5: 验证服务..."
echo ""
sleep 3

# 测试后端 API
if curl -s http://localhost:8000/docs >/dev/null 2>&1; then
    echo "✅ 后端 API 可访问 (http://localhost:8000/docs)"
else
    echo "⚠️ 后端 API 暂时不可访问，查看日志："
    journalctl -u qualityguard-backend --no-pager -n 20
fi

# 测试前端
if [ -f "/usr/share/nginx/html/qualityguard/index.html" ]; then
    echo "✅ 前端文件已部署"
else
    echo "⚠️ 前端 index.html 不存在"
fi

echo ""

echo "步骤 6: 查看服务状态..."
systemctl status qualityguard-backend --no-pager -l | head -15
echo ""

echo "=========================================="
echo "🎉 部署完成！"
echo "=========================================="
echo ""
echo "📊 访问地址："
echo "  前端: https://zhihome.com.cn"
echo "  API 文档: https://zhihome.com.cn/docs"
echo "  后端 API: http://localhost:8000"
echo "  直接访问 API 文档: http://localhost:8000/docs"
echo ""
echo "📝 常用命令："
echo "  查看后端日志: journalctl -u qualityguard-backend -f"
echo "  重启后端: systemctl restart qualityguard-backend"
echo "  查看状态: systemctl status qualityguard-backend"
echo "  查看前端日志: tail -f /var/log/nginx/error.log"
echo ""
echo "✅ 所有服务已启动！"
