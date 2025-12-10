#!/bin/bash
# Setup pip mirror for faster installation
# 配置 pip 使用国内镜像源

echo "Configuring pip to use Chinese mirrors..."

# Create pip config directory
mkdir -p ~/.pip

# Configure pip to use Alibaba Cloud mirror
cat > ~/.pip/pip.conf <<EOF
[global]
index-url = https://mirrors.aliyun.com/pypi/simple/
trusted-host = mirrors.aliyun.com

[install]
trusted-host = mirrors.aliyun.com
EOF

echo "[OK] Pip mirror configured"
echo ""

# Upgrade pip
echo "Upgrading pip..."
pip3 install --upgrade pip -i https://mirrors.aliyun.com/pypi/simple/

echo "[OK] Pip upgraded"
echo ""
echo "Now you can install requirements:"
echo "cd /root/QualityGuard/backend"
echo "pip3 install -r requirements.txt"
echo ""

