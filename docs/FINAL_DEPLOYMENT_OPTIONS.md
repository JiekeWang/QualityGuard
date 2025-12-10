# 最终部署方案

## 当前问题
服务器无法连接 Docker Hub，所有镜像加速器都无法使用。

## 解决方案

### 方案一：使用阿里云容器镜像服务（推荐）

1. **登录阿里云容器镜像服务**
   - 访问：https://cr.console.aliyun.com/
   - 创建命名空间和镜像仓库

2. **在本地构建并推送镜像**
   ```powershell
   # 安装 Docker Desktop 后
   cd D:\QualityGuard
   docker compose build
   
   # 标记镜像
   docker tag qualityguard-backend:latest registry.cn-hangzhou.aliyuncs.com/your-namespace/qualityguard-backend:latest
   docker tag qualityguard-frontend:latest registry.cn-hangzhou.aliyuncs.com/your-namespace/qualityguard-frontend:latest
   
   # 登录阿里云
   docker login --username=your-username registry.cn-hangzhou.aliyuncs.com
   
   # 推送镜像
   docker push registry.cn-hangzhou.aliyuncs.com/your-namespace/qualityguard-backend:latest
   docker push registry.cn-hangzhou.aliyuncs.com/your-namespace/qualityguard-frontend:latest
   ```

3. **在服务器上拉取**
   ```bash
   docker login --username=your-username registry.cn-hangzhou.aliyuncs.com
   docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/qualityguard-backend:latest
   docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/qualityguard-frontend:latest
   ```

### 方案二：不使用 Docker，直接部署

#### 后端部署

```bash
# 在服务器上安装 Python 和依赖
yum install -y python3 python3-pip postgresql
cd /root/QualityGuard/backend
pip3 install -r requirements.txt

# 配置环境变量
export DATABASE_URL="postgresql+asyncpg://qualityguard:qualityguard123@localhost:5432/qualityguard"
export REDIS_HOST="localhost"
export REDIS_PORT="6379"

# 启动服务
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 前端部署

```bash
# 在服务器上安装 Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# 构建前端
cd /root/QualityGuard/frontend
npm install
npm run build

# 使用 Nginx 服务静态文件
cp -r dist/* /usr/share/nginx/html/
```

#### 数据库和中间件

```bash
# 安装 PostgreSQL
yum install -y postgresql-server postgresql
postgresql-setup --initdb
systemctl start postgresql
systemctl enable postgresql

# 创建数据库
sudo -u postgres psql
CREATE DATABASE qualityguard;
CREATE USER qualityguard WITH PASSWORD 'qualityguard123';
GRANT ALL PRIVILEGES ON DATABASE qualityguard TO qualityguard;
\q

# 安装 Redis
yum install -y redis
systemctl start redis
systemctl enable redis
```

### 方案三：联系服务器提供商

如果服务器网络完全无法访问外网，可能需要：
1. 检查安全组规则
2. 检查防火墙设置
3. 联系阿里云技术支持
4. 申请开通外网访问权限

### 方案四：使用其他服务器

如果当前服务器网络问题无法解决，可以考虑：
1. 使用其他云服务商的服务器
2. 使用有外网访问权限的服务器
3. 使用本地服务器（如果有公网 IP）

## 推荐方案

**如果服务器网络问题无法解决，推荐使用方案二（直接部署）**，这样可以：
- 不依赖 Docker Hub
- 直接使用系统包管理器安装依赖
- 更轻量级，启动更快

