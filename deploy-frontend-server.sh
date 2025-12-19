#!/bin/bash
# Frontend deployment script for server

set -e

echo "=========================================="
echo "Deploying Frontend to Server"
echo "=========================================="
echo ""

PROJECT_PATH="/root/QualityGuard"
DIST_ZIP="/root/frontend-dist.zip"

# Extract frontend dist
echo "Step 1: Extracting frontend dist..."
cd /root
if [ -f "$DIST_ZIP" ]; then
    unzip -o $DIST_ZIP -d /tmp/frontend-dist
    echo "[OK] Extracted frontend dist"
else
    echo "[ERROR] Frontend dist zip not found: $DIST_ZIP"
    exit 1
fi
echo ""

# Check if using Docker
if [ -f "$PROJECT_PATH/docker-compose.yml" ]; then
    echo "Step 2: Deploying to Docker..."
    cd $PROJECT_PATH
    
    # Copy to Docker volume or rebuild frontend container
    if docker ps | grep -q qualityguard-frontend; then
        echo "Frontend container is running, copying files..."
        docker cp /tmp/frontend-dist/. qualityguard-frontend:/usr/share/nginx/html/
        docker restart qualityguard-frontend
        echo "[OK] Frontend container updated"
    else
        echo "Frontend container not running, rebuilding..."
        cd $PROJECT_PATH/frontend
        if [ -d "dist" ]; then
            rm -rf dist
        fi
        cp -r /tmp/frontend-dist dist
        cd $PROJECT_PATH
        docker compose build frontend
        docker compose up -d frontend
        echo "[OK] Frontend container rebuilt and started"
    fi
else
    echo "Step 2: Deploying to Nginx (non-Docker)..."
    # Copy to Nginx directory
    mkdir -p /usr/share/nginx/html/qualityguard
    rm -rf /usr/share/nginx/html/qualityguard/*
    cp -r /tmp/frontend-dist/* /usr/share/nginx/html/qualityguard/
    chown -R nginx:nginx /usr/share/nginx/html/qualityguard
    echo "[OK] Frontend files copied to Nginx"
    
    # Restart Nginx
    systemctl restart nginx
    echo "[OK] Nginx restarted"
fi
echo ""

# Cleanup
echo "Step 3: Cleaning up..."
rm -rf /tmp/frontend-dist
rm -f $DIST_ZIP
echo "[OK] Cleanup completed"
echo ""

echo "=========================================="
echo "[SUCCESS] Frontend deployment completed!"
echo "=========================================="
echo ""
echo "Access: https://zhihome.com.cn"
echo ""

