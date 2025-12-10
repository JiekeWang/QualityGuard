#!/bin/bash

# HTTPS 配置快速设置脚本

echo "=========================================="
echo "QualityGuard HTTPS 配置助手"
echo "=========================================="

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 1. 创建 SSL 目录
echo ""
echo "1. 创建 SSL 证书目录..."
mkdir -p nginx/ssl
echo "✅ SSL 目录已创建: nginx/ssl/"

# 2. 询问域名
echo ""
read -p "请输入你的域名 (例如: qualityguard.example.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo "❌ 域名不能为空"
    exit 1
fi

# 3. 更新 Nginx 配置
echo ""
echo "2. 更新 Nginx 配置..."
sed -i.bak "s/server_name _;/server_name $DOMAIN;/g" nginx/conf.d/qualityguard.conf
echo "✅ Nginx 配置已更新"

# 4. 检查证书文件
echo ""
echo "3. 检查 SSL 证书文件..."

if [ -f "nginx/ssl/cert.pem" ] && [ -f "nginx/ssl/key.pem" ]; then
    echo "✅ 证书文件已找到"
    chmod 644 nginx/ssl/cert.pem
    chmod 600 nginx/ssl/key.pem
    echo "✅ 文件权限已设置"
    
    # 显示证书信息
    echo ""
    echo "证书信息："
    openssl x509 -in nginx/ssl/cert.pem -noout -subject -dates 2>/dev/null || echo "⚠️  无法读取证书信息，请检查证书文件格式"
else
    echo "⚠️  证书文件未找到"
    echo ""
    echo "请执行以下步骤："
    echo "1. 从阿里云下载 SSL 证书"
    echo "2. 将证书文件重命名为 cert.pem 并放到 nginx/ssl/ 目录"
    echo "3. 将私钥文件重命名为 key.pem 并放到 nginx/ssl/ 目录"
    echo ""
    read -p "证书文件准备好后按 Enter 继续..." 
fi

# 5. 更新后端 CORS 配置提示
echo ""
echo "4. 更新后端 CORS 配置..."
echo "⚠️  请手动编辑 backend/.env 文件，添加以下配置："
echo "CORS_ORIGINS=[\"https://$DOMAIN\",\"https://www.$DOMAIN\"]"

# 6. 更新前端配置提示
echo ""
echo "5. 更新前端配置..."
echo "⚠️  请手动编辑 frontend/.env.production 文件，添加："
echo "VITE_API_URL=https://$DOMAIN/api/v1"

# 7. 完成提示
echo ""
echo "=========================================="
echo "配置完成！"
echo "=========================================="
echo ""
echo "下一步操作："
echo "1. 确保证书文件已放置在 nginx/ssl/ 目录"
echo "2. 更新后端和前端的环境变量配置"
echo "3. 运行: docker-compose build"
echo "4. 运行: docker-compose up -d"
echo "5. 访问: https://$DOMAIN"
echo ""
echo "查看日志: docker-compose logs -f nginx"
echo ""

