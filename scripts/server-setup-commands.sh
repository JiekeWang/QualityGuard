#!/bin/bash
# 在服务器上执行的命令脚本

# 进入项目目录
cd /root/QualityGuard

# 创建 SSL 目录
mkdir -p nginx/ssl

# 如果证书文件在 /tmp/ 目录，复制过来
if [ -f "/tmp/zhihome.com.cn.pem" ]; then
    cp /tmp/zhihome.com.cn.pem nginx/ssl/cert.pem
    echo "✅ 证书文件已复制"
else
    echo "⚠️  证书文件不在 /tmp/ 目录，请先上传"
fi

if [ -f "/tmp/zhihome.com.cn.key" ]; then
    cp /tmp/zhihome.com.cn.key nginx/ssl/key.pem
    echo "✅ 私钥文件已复制"
else
    echo "⚠️  私钥文件不在 /tmp/ 目录，请先上传"
fi

# 设置文件权限
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

# 验证文件
echo ""
echo "文件列表："
ls -la nginx/ssl/

echo ""
echo "证书信息："
openssl x509 -in nginx/ssl/cert.pem -noout -subject -dates

echo ""
echo "✅ 证书设置完成！"

