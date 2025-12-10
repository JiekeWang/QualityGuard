#!/bin/bash
# Direct deployment script (without Docker)
# 直接部署脚本（不使用 Docker）

set -e

echo "=========================================="
echo "QualityGuard Direct Deployment"
echo "=========================================="
echo ""

# Project path
PROJECT_PATH="/root/QualityGuard"
BACKEND_PATH="$PROJECT_PATH/backend"
FRONTEND_PATH="$PROJECT_PATH/frontend"

echo "Project path: $PROJECT_PATH"
echo "Backend path: $BACKEND_PATH"
echo "Frontend path: $FRONTEND_PATH"
echo ""

# Step 1: Install system packages
echo "Step 1: Installing system packages..."
yum install -y python3 python3-pip postgresql-server postgresql postgresql-contrib redis nginx

# Install Node.js 18
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 18..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
fi

echo "[OK] System packages installed"
echo ""

# Step 2: Configure PostgreSQL
echo "Step 2: Configuring PostgreSQL..."
if [ ! -f /var/lib/pgsql/data/PG_VERSION ]; then
    postgresql-setup --initdb
fi

systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE qualityguard;
CREATE USER qualityguard WITH PASSWORD 'qualityguard123';
GRANT ALL PRIVILEGES ON DATABASE qualityguard TO qualityguard;
\q
EOF

echo "[OK] PostgreSQL configured"
echo ""

# Step 3: Configure Redis
echo "Step 3: Configuring Redis..."
systemctl start redis
systemctl enable redis
echo "[OK] Redis configured"
echo ""

# Step 4: Deploy Backend
echo "Step 4: Deploying Backend..."
cd $BACKEND_PATH

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
mkdir -p uploads reports

# Create systemd service file
cat > /etc/systemd/system/qualityguard-backend.service <<EOF
[Unit]
Description=QualityGuard Backend API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=$BACKEND_PATH
Environment="PATH=$BACKEND_PATH/venv/bin"
Environment="DATABASE_URL=postgresql+asyncpg://qualityguard:qualityguard123@localhost:5432/qualityguard"
Environment="REDIS_HOST=localhost"
Environment="REDIS_PORT=6379"
Environment="RABBITMQ_URL=amqp://guest:guest@localhost:5672/"
ExecStart=$BACKEND_PATH/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable qualityguard-backend
systemctl start qualityguard-backend

echo "[OK] Backend deployed"
echo ""

# Step 5: Deploy Frontend
echo "Step 5: Deploying Frontend..."
cd $FRONTEND_PATH

# Install dependencies
npm install

# Build frontend
npm run build

# Copy to Nginx directory
mkdir -p /usr/share/nginx/html/qualityguard
cp -r dist/* /usr/share/nginx/html/qualityguard/

echo "[OK] Frontend deployed"
echo ""

# Step 6: Configure Nginx
echo "Step 6: Configuring Nginx..."
cat > /etc/nginx/conf.d/qualityguard.conf <<'EOF'
server {
    listen 80;
    server_name zhihome.com.cn www.zhihome.com.cn;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name zhihome.com.cn www.zhihome.com.cn;

    # SSL certificates
    ssl_certificate /root/QualityGuard/nginx/ssl/cert.pem;
    ssl_certificate_key /root/QualityGuard/nginx/ssl/key.pem;

    # Frontend
    location / {
        root /usr/share/nginx/html/qualityguard;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Test Nginx configuration
nginx -t

systemctl restart nginx
systemctl enable nginx

echo "[OK] Nginx configured"
echo ""

# Step 7: Summary
echo "=========================================="
echo "[SUCCESS] Deployment completed!"
echo "=========================================="
echo ""
echo "Installation paths:"
echo "  Project:     $PROJECT_PATH"
echo "  Backend:     $BACKEND_PATH"
echo "  Frontend:    $FRONTEND_PATH"
echo "  Frontend dist: /usr/share/nginx/html/qualityguard"
echo "  Nginx config: /etc/nginx/conf.d/qualityguard.conf"
echo "  Backend service: /etc/systemd/system/qualityguard-backend.service"
echo ""
echo "Services:"
echo "  PostgreSQL:  systemctl status postgresql"
echo "  Redis:       systemctl status redis"
echo "  Backend:     systemctl status qualityguard-backend"
echo "  Nginx:       systemctl status nginx"
echo ""
echo "Logs:"
echo "  Backend:     journalctl -u qualityguard-backend -f"
echo "  Nginx:       tail -f /var/log/nginx/error.log"
echo ""
echo "Next steps:"
echo "  1. Upload SSL certificates to: $PROJECT_PATH/nginx/ssl/"
echo "  2. Restart Nginx: systemctl restart nginx"
echo "  3. Access: https://zhihome.com.cn"
echo ""

