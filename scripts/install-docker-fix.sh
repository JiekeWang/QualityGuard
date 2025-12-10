#!/bin/bash
# Fix Docker installation on Alibaba Cloud (AlmaLinux/CentOS)
# 修复阿里云服务器上的 Docker 安装

set -e

echo "=========================================="
echo "Installing Docker on Alibaba Cloud"
echo "=========================================="
echo ""

# Check current system
echo "Checking system..."
cat /etc/os-release | grep -E "^ID=|^VERSION_ID="
echo ""

# Remove podman-docker if exists (it's not real Docker)
echo "Removing podman-docker (if exists)..."
yum remove -y podman-docker 2>/dev/null || true
echo ""

# Install required packages
echo "Installing required packages..."
yum install -y yum-utils device-mapper-persistent-data lvm2
echo ""

# Add Docker official repository
echo "Adding Docker official repository..."
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
echo ""

# Install Docker CE
echo "Installing Docker CE..."
yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
echo ""

# Start and enable Docker
echo "Starting Docker service..."
systemctl start docker
systemctl enable docker
echo ""

# Verify installation
echo "Verifying Docker installation..."
docker --version
systemctl status docker --no-pager | head -5
echo ""

# Install Docker Compose (standalone)
echo "Installing Docker Compose (standalone)..."
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
echo ""

# Verify Docker Compose
echo "Verifying Docker Compose..."
docker-compose --version
echo ""

echo "=========================================="
echo "[SUCCESS] Docker installation completed!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. cd /root/QualityGuard"
echo "2. docker-compose build"
echo "3. docker-compose up -d"
echo ""

