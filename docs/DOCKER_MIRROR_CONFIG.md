# Docker 镜像加速器配置

## 问题
Docker Hub 连接超时，无法拉取镜像。

## 解决方案：配置国内镜像加速器

### 方法一：快速配置（推荐）

在服务器上执行：

```bash
# 1. 创建 Docker 配置目录
mkdir -p /etc/docker

# 2. 配置镜像加速器（使用阿里云镜像）
cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://registry.cn-hangzhou.aliyuncs.com",
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
EOF

# 3. 重启 Docker 服务
systemctl daemon-reload
systemctl restart docker

# 4. 验证配置
cat /etc/docker/daemon.json
docker info | grep -A 10 "Registry Mirrors"

# 5. 测试拉取镜像
docker pull hello-world
```

### 方法二：使用配置脚本

1. 上传脚本到服务器：
```powershell
scp scripts\configure-docker-mirror.sh root@47.116.197.230:/root/
```

2. SSH 登录执行：
```bash
chmod +x /root/configure-docker-mirror.sh
/root/configure-docker-mirror.sh
```

### 方法三：手动编辑配置文件

```bash
# 编辑配置文件
vi /etc/docker/daemon.json

# 添加以下内容：
{
  "registry-mirrors": [
    "https://registry.cn-hangzhou.aliyuncs.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}

# 保存后重启
systemctl daemon-reload
systemctl restart docker
```

## 可用的国内镜像源

- **阿里云**：`https://registry.cn-hangzhou.aliyuncs.com`
- **中科大**：`https://docker.mirrors.ustc.edu.cn`
- **网易**：`https://hub-mirror.c.163.com`
- **百度云**：`https://mirror.baidubce.com`
- **腾讯云**：`https://mirror.ccs.tencentyun.com`

## 配置完成后

```bash
cd /root/QualityGuard
docker compose build
docker compose up -d
```

## 验证镜像加速器

```bash
# 查看配置
docker info | grep -A 10 "Registry Mirrors"

# 测试拉取镜像
docker pull python:3.11-slim
docker pull node:18-alpine
docker pull nginx:alpine
```

