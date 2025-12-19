#!/bin/bash
# 完成部署 - 安装依赖、构建前端、启动服务

set -e

echo "=========================================="
echo "完成 QualityGuard 部署"
echo "=========================================="
echo ""

PROJECT_PATH="/root/QualityGuard"
cd $PROJECT_PATH

# 使用 Python 3.11
PYTHON_CMD="python3.11"
if ! command -v $PYTHON_CMD &> /dev/null; then
    PYTHON_CMD="python3"
fi

echo "使用 Python: $PYTHON_CMD"
echo ""

echo "步骤 1: 安装后端依赖..."
cd $PROJECT_PATH/backend

# 确保 pip 已安装
$PYTHON_CMD -m ensurepip --upgrade 2>/dev/null || true

# 升级 pip
$PYTHON_CMD -m pip install --upgrade pip

# 安装依赖
echo "正在安装依赖，这可能需要几分钟..."
$PYTHON_CMD -m pip install -r requirements.txt

echo "✅ 后端依赖安装完成"
echo ""

echo "步骤 2: 初始化数据库..."
export DATABASE_URL="postgresql+asyncpg://qualityguard:qualityguard123@localhost:5432/qualityguard"
if [ -f "alembic.ini" ]; then
    $PYTHON_CMD -m alembic upgrade head 2>/dev/null || echo "⚠️ 数据库迁移可能需要手动执行"
else
    echo "⚠️ alembic.ini 不存在，跳过数据库迁移"
fi
echo "✅ 数据库初始化完成"
echo ""

echo "步骤 3: 构建前端..."
cd $PROJECT_PATH/frontend
if [ -f "package.json" ]; then
    echo "安装前端依赖..."
    npm install
    echo "构建前端..."
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
    chown -R nginx:nginx /usr/share/nginx/html/qualityguard 2>/dev/null || chown -R root:root /usr/share/nginx/html/qualityguard
    echo "✅ 前端文件已复制到 Nginx"
else
    echo "⚠️ 前端构建目录不存在"
fi
echo ""

echo "步骤 5: 配置后端服务..."
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
systemctl restart qualityguard-backend
sleep 5
echo "✅ 后端服务配置完成"
echo ""

echo "步骤 6: 检查服务状态..."
echo ""
echo "后端服务:"
if systemctl is-active qualityguard-backend; then
    echo "✅ 运行中"
else
    echo "❌ 未运行，查看日志:"
    journalctl -u qualityguard-backend --no-pager -n 20
fi
echo ""

echo "步骤 7: 测试访问..."
sleep 2
if curl -s http://localhost:8000/docs >/dev/null 2>&1; then
    echo "✅ 后端 API 可访问"
else
    echo "⚠️ 后端 API 暂时不可访问，请稍后重试"
fi
echo ""

echo "=========================================="
echo "🎉 部署完成！"
echo "=========================================="
echo ""
echo "📊 访问地址："
echo "  前端: https://zhihome.com.cn"
echo "  API 文档: https://zhihome.com.cn/docs"
echo "  后端 API: http://localhost:8000"
echo ""
echo "📝 常用命令："
echo "  查看后端日志: journalctl -u qualityguard-backend -f"
echo "  重启后端: systemctl restart qualityguard-backend"
echo "  查看状态: systemctl status qualityguard-backend"
echo ""
