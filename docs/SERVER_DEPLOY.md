# 服务器部署指南

## 当前情况

项目目录 `/root/QualityGuard` 在服务器上不存在，需要先部署项目。

## 部署方案

### 方案一：从 GitHub 克隆（推荐）

如果项目已推送到 GitHub：

```bash
# 1. 安装 Git（如果未安装）
yum install git -y

# 2. 克隆项目
cd /root
git clone https://github.com/JiekeWang/QualityGuard.git

# 3. 进入项目目录
cd QualityGuard

# 4. 创建必要的目录
mkdir -p nginx/ssl
mkdir -p backend/uploads backend/reports
```

### 方案二：使用 WinSCP 上传项目

1. **使用 WinSCP 连接到服务器**
   - 主机名：`47.116.197.230`
   - 用户名：`root`
   - 密码：`232629wh@`

2. **上传整个项目**
   - 左侧（本地）：`D:\QualityGuard`（整个项目文件夹）
   - 右侧（服务器）：`/root/`（上传到 /root/ 目录）
   - 上传后，项目会在 `/root/QualityGuard/`

3. **创建必要的目录**
   ```bash
   cd /root/QualityGuard
   mkdir -p nginx/ssl
   mkdir -p backend/uploads backend/reports
   ```

### 方案三：只上传必要文件

如果只需要快速部署，可以只上传关键文件：

1. **使用 WinSCP 上传以下目录和文件**：
   - `nginx/` 目录
   - `backend/` 目录
   - `frontend/` 目录
   - `docker-compose.yml`
   - `.env` 文件（如果有）

2. **在服务器上创建目录结构**：
   ```bash
   mkdir -p /root/QualityGuard
   cd /root/QualityGuard
   mkdir -p nginx/ssl backend/uploads backend/reports
   ```

## 部署步骤

### 1. 创建项目目录

```bash
mkdir -p /root/QualityGuard
cd /root/QualityGuard
```

### 2. 上传项目文件

选择上述方案之一上传项目文件。

### 3. 上传 SSL 证书

使用 WinSCP 上传证书文件到 `/root/QualityGuard/nginx/ssl/`：
- `zhihome.com.cn.pem` → `cert.pem`
- `zhihome.com.cn.key` → `key.pem`

设置权限：
```bash
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem
```

### 4. 安装 Docker（如果未安装）

```bash
# 安装 Docker
yum install docker -y
systemctl start docker
systemctl enable docker

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 5. 构建和启动服务

```bash
cd /root/QualityGuard

# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f nginx
```

### 6. 验证部署

```bash
# 检查服务状态
docker-compose ps

# 测试 HTTPS
curl -I https://zhihome.com.cn

# 查看证书
openssl x509 -in nginx/ssl/cert.pem -noout -subject -dates
```

## 快速部署命令

在服务器上执行：

```bash
# 创建目录
mkdir -p /root/QualityGuard/nginx/ssl
mkdir -p /root/QualityGuard/backend/uploads
mkdir -p /root/QualityGuard/backend/reports

# 检查 Docker
docker --version
docker-compose --version

# 如果未安装，执行：
# yum install docker -y && systemctl start docker
```

## 下一步

1. **上传项目文件**（使用 Git 或 WinSCP）
2. **上传 SSL 证书**到 `nginx/ssl/` 目录
3. **构建和启动服务**

需要我帮你生成完整的部署脚本吗？

