#!/bin/bash
# 修复服务器部署问题
# Fix server deployment issues

set -e

echo "=========================================="
echo "修复 QualityGuard 服务器部署"
echo "=========================================="
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用 root 用户执行此脚本"
    exit 1
fi

PROJECT_PATH="/root/QualityGuard"

echo "📋 修复步骤："
echo "1. 修复 Docker 安装"
echo "2. 修复 Docker Compose 安装"
echo "3. 构建并启动服务"
echo ""

# 步骤 1: 修复 Docker 安装
echo "步骤 1: 检查和修复 Docker 安装..."
if ! command -v docker &> /dev/null; then
    echo "安装 Docker..."
    # 清理可能存在的冲突包
    yum remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine 2>/dev/null || true

    # 安装 Docker
    yum install -y docker --allowerasing
    systemctl start docker
    systemctl enable docker
    echo "✅ Docker 已安装并启动"
else
    echo "✅ Docker 已安装: $(docker --version)"
    systemctl start docker 2>/dev/null || true
fi

# 步骤 2: 修复 Docker Compose 安装
echo ""
echo "步骤 2: 检查和修复 Docker Compose 安装..."

# 方法 1: 尝试从官方仓库安装
if ! command -v docker-compose &> /dev/null; then
    echo "尝试从官方仓库安装 Docker Compose..."

    # 清理旧版本
    rm -f /usr/local/bin/docker-compose
    rm -f /usr/bin/docker-compose

    # 方法 1: 使用 pip 安装 (推荐)
    if command -v pip3 &> /dev/null || command -v pip &> /dev/null; then
        echo "使用 pip 安装 Docker Compose..."
        pip3 install docker-compose --upgrade 2>/dev/null || pip install docker-compose --upgrade 2>/dev/null || true
    fi

    # 方法 2: 下载二进制文件 (备用方案)
    if ! command -v docker-compose &> /dev/null; then
        echo "下载 Docker Compose 二进制文件..."
        # 尝试多个镜像源
        COMPOSE_VERSION="v2.24.0"  # 使用较新的稳定版本

        # 尝试从 Docker 官方镜像下载
        if curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose 2>/dev/null; then
            chmod +x /usr/local/bin/docker-compose
            echo "✅ Docker Compose 下载成功"
        else
            echo "❌ 官方下载失败，尝试备用方案..."

            # 备用方案: 从 Docker CE 仓库安装 compose plugin
            if command -v docker &> /dev/null; then
                echo "安装 Docker Compose Plugin..."
                yum install -y docker-compose-plugin --allowerasing 2>/dev/null || true

                # 创建符号链接
                if [ -f "/usr/libexec/docker/cli-plugins/docker-compose" ]; then
                    ln -sf /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose 2>/dev/null || true
                fi
            fi
        fi
    fi
fi

# 验证 Docker Compose 安装
if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose 已安装: $(docker-compose --version)"
else
    echo "⚠️ Docker Compose 安装可能有问题，尝试手动安装..."

    # 最后的备用方案
    echo "创建简单的 docker-compose 脚本..."
    cat > /usr/local/bin/docker-compose << 'EOF'
#!/bin/bash
# Simple docker-compose wrapper using docker compose
exec docker compose "$@"
EOF
    chmod +x /usr/local/bin/docker-compose
    echo "✅ 创建了 docker-compose 包装脚本"
fi

echo ""

# 步骤 3: 检查项目文件
echo "步骤 3: 检查项目文件..."
if [ ! -d "$PROJECT_PATH" ]; then
    echo "项目目录不存在，检查压缩包..."
    if [ -f "/root/qualityguard-project.zip" ]; then
        echo "解压项目文件..."
        cd /root
        unzip -o qualityguard-project.zip -d QualityGuard
        cd QualityGuard
    else
        echo "❌ 找不到项目文件，请先上传 qualityguard-project.zip"
        exit 1
    fi
else
    cd $PROJECT_PATH
    echo "✅ 项目目录存在: $PROJECT_PATH"
fi

# 步骤 4: 创建必要的目录
echo ""
echo "步骤 4: 创建必要的目录..."
mkdir -p nginx/ssl
mkdir -p backend/uploads
mkdir -p backend/reports
echo "✅ 目录结构已创建"

# 步骤 5: 检查并拉取基础镜像
echo ""
echo "步骤 5: 检查并拉取基础镜像..."
base_images=(
    "postgres:14-alpine"
    "redis:7-alpine"
    "rabbitmq:3-management-alpine"
    "minio/minio:latest"
    "nginx:alpine"
    "python:3.11-slim"
    "node:18-alpine"
)

for image in "${base_images[@]}"; do
    echo "检查镜像: $image"
    if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${image}$"; then
        echo "拉取镜像: $image"
        docker pull "$image" || echo "⚠️ 拉取失败: $image"
    else
        echo "✅ 镜像已存在: $image"
    fi
done

echo ""

# 步骤 6: 构建项目镜像
echo "步骤 6: 构建项目镜像..."
echo "这可能需要 10-30 分钟..."
if docker compose build; then
    echo "✅ 项目镜像构建成功"
else
    echo "❌ 项目镜像构建失败，尝试基础镜像部署..."
    echo "⚠️ 将使用基础镜像，可能需要手动构建项目镜像"
fi

echo ""

# 步骤 7: 启动服务
echo "步骤 7: 启动服务..."
# 停止可能存在的旧服务
docker compose down 2>/dev/null || true

# 启动服务
if docker compose up -d; then
    echo "✅ 服务启动成功"
else
    echo "❌ 服务启动失败"
    echo "查看日志: docker compose logs"
    exit 1
fi

echo ""

# 步骤 8: 等待服务启动并检查状态
echo "步骤 8: 等待服务启动..."
sleep 30

echo "服务状态:"
docker compose ps

echo ""
echo "=========================================="
echo "🎉 部署完成！"
echo "=========================================="
echo ""

echo "📊 服务状态详情："
docker compose ps --format "table {{.Name}}\t{{.Service}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔗 访问地址："
echo "  前端: https://zhihome.com.cn"
echo "  API 文档: https://zhihome.com.cn/api/docs"
echo ""

echo "📝 常用命令："
echo "  查看日志: docker compose logs -f"
echo "  重启服务: docker compose restart"
echo "  停止服务: docker compose down"
echo ""

echo "✅ 部署修复完成！"
echo "如果仍有问题，请检查日志或联系管理员。"
