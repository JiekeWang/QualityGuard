#!/bin/bash
# Install Docker using Alibaba Cloud mirror (for Alibaba Cloud servers)
# 使用阿里云镜像安装 Docker

set -e

echo "=========================================="
echo "Installing Docker using Alibaba Cloud mirror"
echo "=========================================="
echo ""

# Remove podman-docker
echo "Step 1: Removing podman-docker..."
yum remove -y podman-docker 2>/dev/null || true
echo ""

# Install required packages
echo "Step 2: Installing required packages..."
yum install -y yum-utils device-mapper-persistent-data lvm2
echo ""

# Add Docker repository (using Alibaba Cloud mirror or official)
echo "Step 3: Adding Docker repository..."
# Try Alibaba Cloud mirror first, fallback to official
if yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo 2>/dev/null; then
    echo "[OK] Using Alibaba Cloud mirror"
else
    echo "[INFO] Alibaba Cloud mirror failed, trying official..."
    yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
fi
echo ""

# Clean cache
echo "Step 4: Cleaning yum cache..."
yum clean all
yum makecache fast
echo ""

# Install Docker CE
echo "Step 5: Installing Docker CE..."
echo "This may take a few minutes..."
yum install -y docker-ce docker-ce-cli containerd.io --nogpgcheck 2>&1 | tee /tmp/docker-install.log

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "[OK] Docker CE installed successfully"
else
    echo "[WARNING] Installation may have issues, checking..."
    if systemctl list-unit-files | grep -q docker.service; then
        echo "[OK] Docker service found"
    else
        echo "[ERROR] Docker installation failed"
        echo "Trying alternative method..."
        
        # Alternative: Install from RPM packages directly
        echo "Downloading Docker RPM packages manually..."
        cd /tmp
        
        # Download packages (using wget with no-check-certificate if needed)
        wget --no-check-certificate https://download.docker.com/linux/centos/8/x86_64/stable/Packages/docker-ce-26.1.3-1.el8.x86_64.rpm || \
        curl -k -L -o docker-ce.rpm https://download.docker.com/linux/centos/8/x86_64/stable/Packages/docker-ce-26.1.3-1.el8.x86_64.rpm || \
        echo "Manual download failed, please check network"
        
        exit 1
    fi
fi
echo ""

# Start and enable Docker
echo "Step 6: Starting Docker service..."
systemctl start docker
systemctl enable docker
echo ""

# Verify installation
echo "Step 7: Verifying installation..."
docker --version
systemctl status docker --no-pager | head -5
echo ""

# Install Docker Compose
echo "Step 8: Installing Docker Compose..."
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
if [ -z "$COMPOSE_VERSION" ]; then
    COMPOSE_VERSION="v2.24.0"  # Fallback version
fi

curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose || \
curl -k -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

chmod +x /usr/local/bin/docker-compose
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

