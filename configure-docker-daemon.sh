#!/bin/bash
# 配置 Docker 守护进程使用阿里云镜像加速器

echo "配置 Docker 守护进程..."

# 创建或更新 daemon.json
cat > /etc/docker/daemon.json << EOF
{
  "registry-mirrors": [
    "https://registry.cn-hangzhou.aliyuncs.com",
    "https://mirror.ccs.tencentyun.com",
    "https://registry.docker-cn.com"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF

echo "✅ Docker 配置文件已更新"

# 重启 Docker 服务
echo "重启 Docker 服务..."
systemctl daemon-reload
systemctl restart docker

echo "✅ Docker 服务已重启"

# 等待服务启动
sleep 5

# 验证配置
echo "验证配置..."
docker info | grep -A 5 "Registry Mirrors"

echo "✅ Docker 配置完成"
