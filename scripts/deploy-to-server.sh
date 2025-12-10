#!/bin/bash
# 服务器部署脚本

echo "=========================================="
echo "QualityGuard 服务器部署"
echo "=========================================="
echo ""

# 检查是否在 root 目录
if [ "$EUID" -ne 0 ]; then 
    echo "请使用 root 用户执行"
    exit 1
fi

# 项目路径
PROJECT_PATH="/root/QualityGuard"

echo "1. 创建项目目录..."
mkdir -p $PROJECT_PATH
cd $PROJECT_PATH

echo "✅ 项目目录已创建: $PROJECT_PATH"
echo ""

echo "2. 检查 Git..."
if command -v git &> /dev/null; then
    echo "✅ Git 已安装"
    
    # 如果目录是空的，可以克隆项目
    if [ -z "$(ls -A $PROJECT_PATH)" ]; then
        echo ""
        echo "目录为空，你可以："
        echo "  1. 从 GitHub 克隆项目："
        echo "     git clone https://github.com/JiekeWang/QualityGuard.git ."
        echo ""
        echo "  2. 或者使用 WinSCP 上传项目文件"
        echo ""
    fi
else
    echo "⚠️  Git 未安装，请先安装：yum install git -y"
fi

echo ""
echo "3. 创建必要的目录结构..."
mkdir -p nginx/ssl
mkdir -p backend/uploads
mkdir -p backend/reports

echo "✅ 目录结构已创建"
echo ""

echo "4. 检查 Docker..."
if command -v docker &> /dev/null; then
    echo "✅ Docker 已安装: $(docker --version)"
else
    echo "⚠️  Docker 未安装"
    echo "   安装命令: yum install docker -y && systemctl start docker"
fi

if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose 已安装: $(docker-compose --version)"
else
    echo "⚠️  Docker Compose 未安装"
    echo "   安装命令: curl -L \"https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)\" -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose"
fi

echo ""
echo "=========================================="
echo "当前状态："
echo "  项目路径: $PROJECT_PATH"
echo "  当前目录: $(pwd)"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 将项目文件上传到服务器（使用 Git 或 WinSCP）"
echo "2. 上传 SSL 证书到 nginx/ssl/ 目录"
echo "3. 运行: docker-compose build"
echo "4. 运行: docker-compose up -d"
echo ""

