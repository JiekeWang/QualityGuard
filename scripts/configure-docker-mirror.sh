#!/bin/bash
# Configure Docker mirror for Alibaba Cloud
# 配置 Docker 镜像加速器

set -e

echo "=========================================="
echo "Configuring Docker Mirror"
echo "=========================================="
echo ""

# Create docker daemon config directory
mkdir -p /etc/docker

# Backup existing config if exists
if [ -f /etc/docker/daemon.json ]; then
    cp /etc/docker/daemon.json /etc/docker/daemon.json.bak
    echo "[INFO] Backed up existing daemon.json"
fi

# Create or update daemon.json with Alibaba Cloud mirror
cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://registry.cn-hangzhou.aliyuncs.com",
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ],
  "insecure-registries": [],
  "max-concurrent-downloads": 10,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

echo "[OK] Docker daemon.json configured"
echo ""
cat /etc/docker/daemon.json
echo ""

# Restart Docker service
echo "Restarting Docker service..."
systemctl daemon-reload
systemctl restart docker

echo ""
echo "=========================================="
echo "[SUCCESS] Docker mirror configured!"
echo "=========================================="
echo ""
echo "Testing Docker pull..."
docker pull hello-world
docker rmi hello-world
echo ""
echo "Now you can build your project:"
echo "cd /root/QualityGuard"
echo "docker compose build"
echo ""

