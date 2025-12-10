# Docker 和 Docker Compose 安装指南

## 问题
服务器上缺少 `docker-compose` 命令。

## 解决方案

### 方法一：使用安装脚本（推荐）

将安装脚本上传到服务器并执行：

```bash
# 1. 在本地创建脚本（已创建 scripts/install-docker.sh）

# 2. 上传脚本到服务器
scp scripts/install-docker.sh root@47.116.197.230:/root/

# 3. SSH 登录服务器执行
ssh root@47.116.197.230
chmod +x /root/install-docker.sh
/root/install-docker.sh
```

### 方法二：手动安装

#### CentOS/RHEL/AlmaLinux 系统：

```bash
# 1. 安装 Docker
yum remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine 2>/dev/null || true
yum install -y yum-utils
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl start docker
systemctl enable docker

# 2. 如果使用 docker-compose-plugin，使用命令：
docker compose build
docker compose up -d

# 或者安装独立的 docker-compose：
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

#### Ubuntu/Debian 系统：

```bash
# 1. 安装 Docker
apt-get update
apt-get install -y ca-certificates curl gnupg lsb-release
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl start docker
systemctl enable docker

# 2. 如果使用 docker-compose-plugin，使用命令：
docker compose build
docker compose up -d

# 或者安装独立的 docker-compose：
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

## 验证安装

```bash
# 检查 Docker
docker --version

# 检查 Docker Compose（两种方式）
docker-compose --version
# 或
docker compose version
```

## 使用 Docker Compose

安装完成后，可以使用以下两种方式之一：

1. **独立命令**（如果安装了独立的 docker-compose）：
   ```bash
   docker-compose build
   docker-compose up -d
   ```

2. **插件命令**（如果安装了 docker-compose-plugin）：
   ```bash
   docker compose build
   docker compose up -d
   ```

## 注意事项

- 新版本的 Docker 通常包含 `docker-compose-plugin`，使用 `docker compose`（注意没有连字符）
- 如果系统已有 Docker 但缺少 Compose，可以只安装 Compose
- 确保 Docker 服务已启动：`systemctl status docker`

