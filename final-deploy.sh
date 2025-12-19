#!/bin/bash
# 最终部署脚本 - 使用正确的阿里云镜像源

echo "=========================================="
echo "QualityGuard 最终部署"
echo "=========================================="
echo ""

cd /root/QualityGuard

# 更新 Docker Compose 配置，使用正确的阿里云镜像
echo "步骤 1: 更新 Docker Compose 配置..."
sed -i 's|registry.cn-hangzhou.aliyuncs.com/acs/|registry.cn-hangzhou.aliyuncs.com/library/|g' docker-compose.yml

# 更新 Dockerfile 中的镜像源
echo "步骤 2: 更新 Dockerfile..."
sed -i 's|registry.cn-hangzhou.aliyuncs.com/acs/|registry.cn-hangzhou.aliyuncs.com/library/|g' backend/Dockerfile frontend/Dockerfile nginx/Dockerfile

# 或者尝试使用 Docker Hub 直接镜像（如果网络允许）
echo "步骤 3: 尝试拉取基础镜像..."

# 定义镜像列表（尝试多个源）
images_to_try=(
    "python:3.11-slim"
    "node:18-alpine"
    "nginx:alpine"
    "postgres:14-alpine"
    "redis:7-alpine"
    "rabbitmq:3-management-alpine"
    "minio/minio:latest"
)

for image in "${images_to_try[@]}"; do
    echo "尝试拉取: $image"
    if docker pull "$image"; then
        echo "✅ 成功: $image"
    else
        echo "❌ 失败: $image"
        # 尝试阿里云镜像
        ali_image="registry.cn-hangzhou.aliyuncs.com/library/${image}"
        echo "尝试阿里云镜像: $ali_image"
        if docker pull "$ali_image" 2>/dev/null; then
            echo "✅ 阿里云镜像成功: $ali_image"
            docker tag "$ali_image" "$image"
            echo "✅ 创建标签: $image"
        else
            echo "❌ 阿里云镜像也失败: $ali_image"
        fi
    fi
done

echo ""
echo "步骤 4: 构建项目镜像..."
if docker compose build --no-cache; then
    echo "✅ 构建成功"
else
    echo "❌ 构建失败，尝试跳过缓存..."
    if docker compose build; then
        echo "✅ 构建成功（使用缓存）"
    else
        echo "❌ 构建完全失败"
        exit 1
    fi
fi

echo ""
echo "步骤 5: 启动服务..."
if docker compose up -d; then
    echo "✅ 服务启动成功"
else
    echo "❌ 服务启动失败"
    docker compose logs
    exit 1
fi

echo ""
echo "步骤 6: 等待服务启动..."
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

echo "✅ 最终部署完成！"
