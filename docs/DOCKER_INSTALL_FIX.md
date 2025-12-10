# Docker 安装修复指南

## 问题
系统显示 `podman-docker` 已安装，但 `docker.service` 不存在。这是因为系统安装的是 Podman 的 Docker 兼容层，而不是真正的 Docker。

## 解决方案

### 方法一：完整安装 Docker CE（推荐）

在服务器上依次执行：

```bash
# 1. 移除 podman-docker（它不是真正的 Docker）
yum remove -y podman-docker

# 2. 安装必要的工具
yum install -y yum-utils device-mapper-persistent-data lvm2

# 3. 添加 Docker 官方仓库
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 4. 安装 Docker CE
yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. 启动并启用 Docker
systemctl start docker
systemctl enable docker

# 6. 验证安装
docker --version
systemctl status docker

# 7. 安装 Docker Compose（独立版本）
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

### 方法二：使用安装脚本

1. 上传修复脚本到服务器：
```powershell
scp scripts\install-docker-fix.sh root@47.116.197.230:/root/
```

2. SSH 登录执行：
```bash
chmod +x /root/install-docker-fix.sh
/root/install-docker-fix.sh
```

### 方法三：使用 Podman（如果 Docker 安装失败）

如果 Docker 安装遇到问题，可以使用 Podman（兼容 Docker 命令）：

```bash
# Podman 通常已经安装
podman --version

# 使用 podman-compose 或 podman play kube
# 但需要修改 docker-compose.yml 以兼容 Podman
```

## 验证安装

```bash
# 检查 Docker 服务状态
systemctl status docker

# 测试 Docker
docker run hello-world

# 检查 Docker Compose
docker-compose --version
# 或
docker compose version
```

## 常见问题

### 问题 1: 仓库连接失败
如果无法连接到 Docker 官方仓库，可以：
1. 检查网络连接
2. 使用阿里云镜像源（需要配置）

### 问题 2: 依赖冲突
如果遇到依赖冲突：
```bash
# 清理缓存
yum clean all

# 重新安装
yum install -y docker-ce docker-ce-cli containerd.io
```

### 问题 3: 服务启动失败
```bash
# 查看详细错误
systemctl status docker -l

# 检查日志
journalctl -u docker -n 50
```

## 安装完成后

```bash
cd /root/QualityGuard
docker-compose build
docker-compose up -d
```

