# Docker 安装路径说明

## 安装位置

### Docker 和 Docker Compose 安装
- **安装位置**：系统级别，可以在**任何路径**下执行安装命令
- **推荐路径**：`/root` 或当前用户目录
- **安装后**：命令会安装到系统路径（`/usr/local/bin/docker-compose`），全局可用

### 项目操作路径
- **项目路径**：`/root/QualityGuard`
- **执行 docker-compose 命令**：必须在项目目录下执行

## 执行步骤

### 1. 安装 Docker（在任何路径都可以）

```bash
# 当前在 /root 或任何路径都可以
yum install -y docker
systemctl start docker
systemctl enable docker
```

### 2. 安装 Docker Compose（在任何路径都可以）

```bash
# 当前在 /root 或任何路径都可以
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 3. 验证安装（在任何路径都可以）

```bash
# 当前在 /root 或任何路径都可以
docker --version
docker-compose --version
```

### 4. 构建和启动项目（必须在项目目录下）

```bash
# 必须切换到项目目录
cd /root/QualityGuard

# 然后执行
docker-compose build
docker-compose up -d
```

## 完整执行流程

```bash
# 1. 在 /root 目录下安装 Docker（或任何路径）
cd /root
yum install -y docker
systemctl start docker
systemctl enable docker

# 2. 安装 Docker Compose（仍在 /root 或任何路径）
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 3. 验证（仍在 /root 或任何路径）
docker --version
docker-compose --version

# 4. 切换到项目目录
cd /root/QualityGuard

# 5. 构建和启动（必须在项目目录下）
docker-compose build
docker-compose up -d
```

## 总结

- ✅ **安装 Docker/Compose**：可以在任何路径执行（推荐 `/root`）
- ✅ **执行 docker-compose 命令**：必须在 `/root/QualityGuard` 目录下执行

