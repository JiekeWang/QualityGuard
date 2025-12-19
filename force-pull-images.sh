#!/bin/bash
# 强制拉取镜像并部署

echo "=========================================="
echo "强制拉取镜像并部署 QualityGuard"
echo "=========================================="
echo ""

cd /root/QualityGuard

# 定义镜像映射
declare -A image_map=(
    ["postgres:14-alpine"]="registry.cn-hangzhou.aliyuncs.com/acs/postgres:14-alpine"
    ["redis:7-alpine"]="registry.cn-hangzhou.aliyuncs.com/acs/redis:7-alpine"
    ["rabbitmq:3-management-alpine"]="registry.cn-hangzhou.aliyuncs.com/acs/rabbitmq:3-management-alpine"
    ["minio/minio:latest"]="registry.cn-hangzhou.aliyuncs.com/acs/minio:latest"
    ["nginx:alpine"]="registry.cn-hangzhou.aliyuncs.com/acs/nginx:alpine"
    ["python:3.11-slim"]="registry.cn-hangzhou.aliyuncs.com/acs/python:3.11-slim"
    ["node:18-alpine"]="registry.cn-hangzhou.aliyuncs.com/acs/node:18-alpine"
)

echo "步骤 1: 拉取所有必需的镜像..."
for original in "${!image_map[@]}"; do
    ali_image="${image_map[$original]}"
    echo "拉取镜像: $ali_image"
    if docker pull "$ali_image"; then
        echo "✅ 成功拉取: $ali_image"

        # 创建标签映射到原始名称
        docker tag "$ali_image" "$original"
        echo "✅ 创建标签: $original -> $ali_image"
    else
        echo "❌ 拉取失败: $ali_image"
    fi
done

echo ""
echo "步骤 2: 验证镜像..."
docker images | grep -E "(qualityguard|postgres|redis|rabbitmq|minio|nginx|python|node)"

echo ""
echo "步骤 3: 构建项目镜像..."
if docker compose build; then
    echo "✅ 项目镜像构建成功"
else
    echo "❌ 项目镜像构建失败"
    exit 1
fi

echo ""
echo "步骤 4: 启动服务..."
if docker compose up -d; then
    echo "✅ 服务启动成功"
else
    echo "❌ 服务启动失败"
    exit 1
fi

echo ""
echo "步骤 5: 等待服务启动..."
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

echo "✅ 强制部署完成！"
