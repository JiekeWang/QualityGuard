#!/bin/bash
# QualityGuard 服务器端部署脚本
# 在服务器上执行此脚本完成部署

set -e  # 遇到错误立即退出

echo "=========================================="
echo "QualityGuard 服务器端部署"
echo "=========================================="
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用 root 用户执行此脚本"
    exit 1
fi

PROJECT_PATH="/root/QualityGuard"
IMAGE_FILE="qualityguard-images.tar"
PROJECT_ZIP="qualityguard-project.zip"

echo "📋 部署信息："
echo "  项目路径: $PROJECT_PATH"
echo "  镜像文件: /root/$IMAGE_FILE"
echo "  项目压缩包: /root/$PROJECT_ZIP"
echo ""

# 步骤 1: 检查文件是否存在
echo "步骤 1: 检查上传的文件..."
if [ ! -f "/root/$IMAGE_FILE" ]; then
    echo "❌ 镜像文件不存在: /root/$IMAGE_FILE"
    echo "请先从本地上传镜像文件"
    exit 1
fi

if [ ! -f "/root/$PROJECT_ZIP" ]; then
    echo "⚠️  项目压缩包不存在: /root/$PROJECT_ZIP"
    echo "将尝试使用现有的项目目录"
fi

echo "✅ 文件检查完成"
echo ""

# 步骤 2: 创建项目目录
echo "步骤 2: 创建项目目录..."
mkdir -p $PROJECT_PATH
cd $PROJECT_PATH
echo "✅ 项目目录已创建: $PROJECT_PATH"
echo ""

# 步骤 3: 解压项目文件
if [ -f "/root/$PROJECT_ZIP" ]; then
    echo "步骤 3: 解压项目文件..."
    cd /root
    unzip -o $PROJECT_ZIP -d QualityGuard
    cd $PROJECT_PATH
    echo "✅ 项目文件已解压"
else
    echo "步骤 3: 跳过解压（文件不存在）"
fi
echo ""

# 步骤 4: 创建必要的目录结构
echo "步骤 4: 创建必要的目录结构..."
mkdir -p nginx/ssl
mkdir -p backend/uploads
mkdir -p backend/reports
echo "✅ 目录结构已创建"
echo ""

# 步骤 5: 检查并安装 Docker
echo "步骤 5: 检查 Docker 环境..."
if ! command -v docker &> /dev/null; then
    echo "安装 Docker..."
    yum install docker -y
    systemctl start docker
    systemctl enable docker
    echo "✅ Docker 已安装并启动"
else
    echo "✅ Docker 已安装: $(docker --version)"
fi

if ! command -v docker-compose &> /dev/null; then
    echo "安装 Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose 已安装: $(docker-compose --version)"
else
    echo "✅ Docker Compose 已安装: $(docker-compose --version)"
fi
echo ""

# 步骤 6: 导入镜像
echo "步骤 6: 导入 Docker 镜像..."
echo "这可能需要几分钟..."
docker load -i /root/$IMAGE_FILE
echo "✅ 镜像导入完成"
echo ""

# 步骤 7: 查看导入的镜像
echo "步骤 7: 查看导入的镜像..."
docker images | grep -E "(qualityguard|postgres|redis|rabbitmq|minio|nginx)"
echo ""

# 步骤 8: 启动服务
echo "步骤 8: 启动 QualityGuard 服务..."
cd $PROJECT_PATH

# 停止可能存在的旧服务
docker compose down 2>/dev/null || true

# 启动服务
docker compose up -d
echo "✅ 服务启动完成"
echo ""

# 步骤 9: 等待服务启动
echo "步骤 9: 等待服务启动..."
sleep 30
echo "✅ 等待完成"
echo ""

# 步骤 10: 检查服务状态
echo "步骤 10: 检查服务状态..."
docker compose ps

echo ""
echo "=========================================="
echo "🎉 部署完成！"
echo "=========================================="
echo ""

# 显示服务信息
echo "📊 服务状态："
docker compose ps --format "table {{.Name}}\t{{.Service}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔗 访问地址："
echo "  前端: https://zhihome.com.cn"
echo "  API: https://zhihome.com.cn/api/docs"
echo ""

echo "📝 常用命令："
echo "  查看日志: docker compose logs -f"
echo "  重启服务: docker compose restart"
echo "  停止服务: docker compose down"
echo "  更新服务: docker compose pull && docker compose up -d"
echo ""

echo "✅ 部署成功完成！"
echo "如果遇到问题，请检查日志或联系管理员。"
