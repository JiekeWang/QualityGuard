#!/bin/bash

# SSL 证书设置脚本

echo "=========================================="
echo "QualityGuard SSL 证书设置"
echo "=========================================="

# 创建 SSL 目录
mkdir -p nginx/ssl

echo ""
echo "请将 SSL 证书文件放置到以下位置："
echo "  - 证书文件: nginx/ssl/cert.pem"
echo "  - 私钥文件: nginx/ssl/key.pem"
echo ""

# 检查证书文件是否存在
if [ -f "nginx/ssl/cert.pem" ] && [ -f "nginx/ssl/key.pem" ]; then
    echo "✅ 证书文件已找到"
    
    # 设置正确的权限
    chmod 644 nginx/ssl/cert.pem
    chmod 600 nginx/ssl/key.pem
    
    echo "✅ 文件权限已设置"
    
    # 显示证书信息
    echo ""
    echo "证书信息："
    openssl x509 -in nginx/ssl/cert.pem -noout -subject -dates
    
    echo ""
    echo "=========================================="
    echo "证书设置完成！"
    echo "=========================================="
    echo ""
    echo "下一步："
    echo "1. 编辑 nginx/conf.d/qualityguard.conf"
    echo "2. 将 server_name 替换为你的域名"
    echo "3. 运行: docker-compose up -d"
    echo ""
else
    echo "❌ 证书文件未找到"
    echo ""
    echo "请执行以下步骤："
    echo "1. 从阿里云下载 SSL 证书"
    echo "2. 将证书文件重命名为 cert.pem 并放到 nginx/ssl/ 目录"
    echo "3. 将私钥文件重命名为 key.pem 并放到 nginx/ssl/ 目录"
    echo "4. 再次运行此脚本"
    echo ""
fi

