#!/bin/bash
# 直接安装部署脚本 - 不依赖 Docker 镜像拉取
# Direct installation deployment - no Docker image pulling required

set -e

echo "=========================================="
echo "QualityGuard 直接安装部署"
echo "=========================================="
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用 root 用户执行此脚本"
    exit 1
fi

PROJECT_PATH="/root/QualityGuard"

cd $PROJECT_PATH

echo "步骤 1: 安装系统依赖..."
yum update -y
yum install -y epel-release
yum install -y python3 python3-pip nodejs npm postgresql postgresql-server redis rabbitmq-server nginx wget curl

echo "✅ 系统依赖安装完成"
echo ""

echo "步骤 2: 配置 PostgreSQL..."
if [ ! -d "/var/lib/pgsql/data" ] || [ -z "$(ls -A /var/lib/pgsql/data)" ]; then
    postgresql-setup --initdb
fi
systemctl enable postgresql
systemctl start postgresql

# 创建数据库和用户
sudo -u postgres psql << EOF
CREATE USER qualityguard WITH PASSWORD 'qualityguard123';
CREATE DATABASE qualityguard OWNER qualityguard;
GRANT ALL PRIVILEGES ON DATABASE qualityguard TO qualityguard;
\q
EOF

echo "✅ PostgreSQL 配置完成"
echo ""

echo "步骤 3: 配置 Redis..."
systemctl enable redis
systemctl start redis
echo "✅ Redis 配置完成"
echo ""

echo "步骤 4: 配置 RabbitMQ..."
systemctl enable rabbitmq-server
systemctl start rabbitmq-server
rabbitmqctl add_user qualityguard qualityguard123
rabbitmqctl set_user_tags qualityguard administrator
rabbitmqctl set_permissions -p / qualityguard ".*" ".*" ".*"
echo "✅ RabbitMQ 配置完成"
echo ""

echo "步骤 5: 安装 MinIO..."
if [ ! -f "/usr/local/bin/minio" ]; then
    wget https://dl.min.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio
    chmod +x /usr/local/bin/minio
fi

# 创建 MinIO 数据目录
mkdir -p /data/minio
mkdir -p /etc/minio

# 创建 MinIO 服务文件
cat > /etc/systemd/system/minio.service << 'MINIO_EOF'
[Unit]
Description=MinIO Object Storage
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/minio server /data/minio --console-address ":9001"
Environment="MINIO_ROOT_USER=qualityguard"
Environment="MINIO_ROOT_PASSWORD=qualityguard123"
Restart=always

[Install]
WantedBy=multi-user.target
MINIO_EOF

systemctl daemon-reload
systemctl enable minio
systemctl start minio
echo "✅ MinIO 配置完成"
echo ""

echo "步骤 6: 安装后端 Python 依赖..."
cd $PROJECT_PATH/backend
pip3 install --upgrade pip
pip3 install -r requirements.txt
echo "✅ 后端依赖安装完成"
echo ""

echo "步骤 7: 初始化数据库..."
cd $PROJECT_PATH/backend
export DATABASE_URL="postgresql+asyncpg://qualityguard:qualityguard123@localhost:5432/qualityguard"
python3 -m alembic upgrade head 2>/dev/null || echo "⚠️ 数据库迁移可能需要手动执行"
echo "✅ 数据库初始化完成"
echo ""

echo "步骤 8: 构建前端..."
cd $PROJECT_PATH/frontend
npm install
npm run build
echo "✅ 前端构建完成"
echo ""

echo "步骤 9: 配置后端服务..."
mkdir -p /etc/qualityguard
cat > /etc/systemd/system/qualityguard-backend.service << 'BACKEND_EOF'
[Unit]
Description=QualityGuard Backend API
After=network.target postgresql.service redis.service rabbitmq-server.service minio.service

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

[Install]
WantedBy=multi-user.target
BACKEND_EOF

systemctl daemon-reload
systemctl enable qualityguard-backend
systemctl start qualityguard-backend
echo "✅ 后端服务配置完成"
echo ""

echo "步骤 10: 配置 Nginx..."
# 复制前端构建文件
mkdir -p /usr/share/nginx/html/qualityguard
cp -r $PROJECT_PATH/frontend/dist/* /usr/share/nginx/html/qualityguard/

# 配置 Nginx
cat > /etc/nginx/conf.d/qualityguard.conf << 'NGINX_EOF'
server {
    listen 80;
    server_name zhihome.com.cn;

    # 前端静态文件
    location / {
        root /usr/share/nginx/html/qualityguard;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 支持
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX_EOF

# 如果有 SSL 证书，配置 HTTPS
if [ -f "$PROJECT_PATH/nginx/ssl/cert.pem" ] && [ -f "$PROJECT_PATH/nginx/ssl/key.pem" ]; then
    cat >> /etc/nginx/conf.d/qualityguard.conf << 'SSL_EOF'

server {
    listen 443 ssl http2;
    server_name zhihome.com.cn;

    ssl_certificate /root/QualityGuard/nginx/ssl/cert.pem;
    ssl_certificate_key /root/QualityGuard/nginx/ssl/key.pem;

    # 前端静态文件
    location / {
        root /usr/share/nginx/html/qualityguard;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 支持
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
SSL_EOF
fi

# 测试 Nginx 配置
nginx -t
systemctl enable nginx
systemctl restart nginx
echo "✅ Nginx 配置完成"
echo ""

echo "步骤 11: 检查服务状态..."
echo ""
echo "PostgreSQL:"
systemctl status postgresql --no-pager -l | head -3
echo ""
echo "Redis:"
systemctl status redis --no-pager -l | head -3
echo ""
echo "RabbitMQ:"
systemctl status rabbitmq-server --no-pager -l | head -3
echo ""
echo "MinIO:"
systemctl status minio --no-pager -l | head -3
echo ""
echo "Backend:"
systemctl status qualityguard-backend --no-pager -l | head -3
echo ""
echo "Nginx:"
systemctl status nginx --no-pager -l | head -3
echo ""

echo "=========================================="
echo "🎉 部署完成！"
echo "=========================================="
echo ""

echo "📊 服务访问信息："
echo "  前端: http://zhihome.com.cn"
if [ -f "$PROJECT_PATH/nginx/ssl/cert.pem" ]; then
    echo "  前端 (HTTPS): https://zhihome.com.cn"
fi
echo "  后端 API: http://localhost:8000"
echo "  API 文档: http://localhost:8000/docs"
echo "  MinIO 控制台: http://localhost:9001"
echo "  RabbitMQ 管理: http://localhost:15672"
echo ""

echo "📝 常用命令："
echo "  查看后端日志: journalctl -u qualityguard-backend -f"
echo "  重启后端: systemctl restart qualityguard-backend"
echo "  查看 Nginx 日志: tail -f /var/log/nginx/error.log"
echo "  重启 Nginx: systemctl restart nginx"
echo ""

echo "✅ 直接安装部署完成！"
echo "所有服务已使用系统包管理器安装，不依赖 Docker 镜像。"
