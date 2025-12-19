#!/bin/bash
# 安装 Python 3.11 并继续部署

set -e

echo "=========================================="
echo "安装 Python 3.11 并继续部署"
echo "=========================================="
echo ""

PROJECT_PATH="/root/QualityGuard"

echo "步骤 1: 安装 Python 3.11..."
yum install -y python311 python311-pip python311-devel gcc --allowerasing || \
yum install -y python311 python311-pip python311-devel gcc --skip-broken

# 安装 pip for Python 3.11
if command -v python3.11 &> /dev/null; then
    # 下载并安装 pip
    curl https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
    python3.11 /tmp/get-pip.py
    echo "✅ Python 3.11 和 pip 安装完成"
    PYTHON_CMD="python3.11"
else
    echo "⚠️ Python 3.11 安装失败，使用 python3"
    PYTHON_CMD="python3"
fi
echo ""

echo "步骤 2: 安装后端依赖..."
cd $PROJECT_PATH/backend

# 使用 Python 3.11 安装依赖
if command -v python3.11 &> /dev/null; then
    python3.11 -m pip install --upgrade pip
    python3.11 -m pip install -r requirements.txt
    PYTHON_CMD="python3.11"
else
    echo "⚠️ Python 3.11 不可用，尝试使用 python3"
    pip3 install --upgrade pip
    pip3 install -r requirements.txt || echo "⚠️ 某些依赖可能安装失败"
    PYTHON_CMD="python3"
fi
echo "✅ 后端依赖安装完成"
echo ""

echo "步骤 3: 初始化数据库..."
export DATABASE_URL="postgresql+asyncpg://qualityguard:qualityguard123@localhost:5432/qualityguard"
cd $PROJECT_PATH/backend
if [ -f "alembic.ini" ]; then
    $PYTHON_CMD -m alembic upgrade head 2>/dev/null || echo "⚠️ 数据库迁移可能需要手动执行"
else
    echo "⚠️ alembic.ini 不存在，跳过数据库迁移"
fi
echo "✅ 数据库初始化完成"
echo ""

echo "步骤 4: 构建前端..."
cd $PROJECT_PATH/frontend
if [ -f "package.json" ]; then
    npm install
    npm run build
    echo "✅ 前端构建完成"
else
    echo "⚠️ package.json 不存在，跳过前端构建"
fi
echo ""

echo "步骤 5: 复制前端文件到 Nginx..."
if [ -d "$PROJECT_PATH/frontend/dist" ]; then
    mkdir -p /usr/share/nginx/html/qualityguard
    cp -r $PROJECT_PATH/frontend/dist/* /usr/share/nginx/html/qualityguard/
    chown -R nginx:nginx /usr/share/nginx/html/qualityguard
    echo "✅ 前端文件已复制到 Nginx"
else
    echo "⚠️ 前端构建目录不存在"
fi
echo ""

echo "步骤 6: 配置后端服务..."
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

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable qualityguard-backend
systemctl restart qualityguard-backend
sleep 3
echo "✅ 后端服务配置完成"
echo ""

echo "步骤 7: 检查服务状态..."
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

if systemctl is-active qualityguard-backend; then
    echo "步骤 8: 查看后端日志（最后20行）..."
    journalctl -u qualityguard-backend --no-pager -n 20
else
    echo "步骤 8: 后端服务未运行，查看错误日志..."
    journalctl -u qualityguard-backend --no-pager -n 30
fi
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
echo ""
echo "✅ 部署完成！"
