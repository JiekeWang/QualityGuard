#!/bin/bash
# Install Docker and Docker Compose on Linux
# Supports CentOS/RHEL/AlmaLinux and Ubuntu/Debian

set -e

echo "=========================================="
echo "Installing Docker and Docker Compose"
echo "=========================================="
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VER=$VERSION_ID
else
    echo "Cannot detect OS. Exiting."
    exit 1
fi

echo "Detected OS: $OS $VER"
echo ""

# Install Docker
if command -v docker &> /dev/null; then
    echo "[OK] Docker is already installed"
    docker --version
else
    echo "[INFO] Installing Docker..."
    
    if [[ "$OS" == "centos" ]] || [[ "$OS" == "rhel" ]] || [[ "$OS" == "almalinux" ]]; then
        # CentOS/RHEL/AlmaLinux
        yum remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine 2>/dev/null || true
        yum install -y yum-utils
        yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        systemctl start docker
        systemctl enable docker
    elif [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        # Ubuntu/Debian
        apt-get update
        apt-get install -y ca-certificates curl gnupg lsb-release
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        systemctl start docker
        systemctl enable docker
    else
        echo "[ERROR] Unsupported OS: $OS"
        exit 1
    fi
    
    echo "[OK] Docker installed successfully"
    docker --version
fi

echo ""

# Install Docker Compose (standalone, if not using plugin)
if command -v docker-compose &> /dev/null; then
    echo "[OK] Docker Compose (standalone) is already installed"
    docker-compose --version
elif docker compose version &> /dev/null; then
    echo "[OK] Docker Compose (plugin) is available"
    docker compose version
else
    echo "[INFO] Installing Docker Compose (standalone)..."
    
    # Download latest Docker Compose
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    echo "[OK] Docker Compose installed successfully"
    docker-compose --version
fi

echo ""
echo "=========================================="
echo "[SUCCESS] Installation completed!"
echo "=========================================="
echo ""
echo "Docker version:"
docker --version
echo ""
echo "Docker Compose version:"
if command -v docker-compose &> /dev/null; then
    docker-compose --version
elif docker compose version &> /dev/null; then
    docker compose version
fi
echo ""
echo "Next steps:"
echo "1. cd /root/QualityGuard"
echo "2. docker-compose build  (or: docker compose build)"
echo "3. docker-compose up -d  (or: docker compose up -d)"
echo ""

