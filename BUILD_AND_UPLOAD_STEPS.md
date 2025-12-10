# 本地构建镜像并上传步骤

## 步骤 1: 在本地构建镜像

在 PowerShell 中执行：

```powershell
cd D:\QualityGuard
docker compose build
```

**注意**：这可能需要 10-30 分钟，取决于网络速度。

## 步骤 2: 查看构建的镜像

```powershell
docker images
```

记录以下镜像的名称和标签：
- qualityguard-backend
- qualityguard-frontend
- postgres:14-alpine
- redis:7-alpine
- rabbitmq:3-management-alpine
- minio/minio:latest
- nginx:alpine

## 步骤 3: 导出镜像

```powershell
# 导出所有需要的镜像到一个文件
docker save -o qualityguard-images.tar `
  qualityguard-backend:latest `
  qualityguard-frontend:latest `
  postgres:14-alpine `
  redis:7-alpine `
  rabbitmq:3-management-alpine `
  minio/minio:latest `
  nginx:alpine
```

**注意**：如果某些镜像不存在，只导出存在的镜像。

## 步骤 4: 上传到服务器

```powershell
# 上传镜像文件（可能需要几分钟）
scp qualityguard-images.tar root@47.116.197.230:/root/
# 输入密码: 232629wh@
```

## 步骤 5: 在服务器上导入并启动

SSH 登录服务器后执行：

```bash
# 导入镜像
docker load -i /root/qualityguard-images.tar

# 查看导入的镜像
docker images

# 切换到项目目录
cd /root/QualityGuard

# 启动服务
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

## 如果构建失败

如果本地构建也失败，可以只导出基础镜像：

```powershell
# 只导出基础镜像
docker pull postgres:14-alpine
docker pull redis:7-alpine
docker pull rabbitmq:3-management-alpine
docker pull minio/minio:latest
docker pull nginx:alpine
docker pull python:3.11-slim
docker pull node:18-alpine

# 导出
docker save -o base-images.tar `
  postgres:14-alpine `
  redis:7-alpine `
  rabbitmq:3-management-alpine `
  minio/minio:latest `
  nginx:alpine `
  python:3.11-slim `
  node:18-alpine

# 上传
scp base-images.tar root@47.116.197.230:/root/

# 在服务器上导入后，再构建项目镜像
ssh root@47.116.197.230
docker load -i /root/base-images.tar
cd /root/QualityGuard
docker compose build
docker compose up -d
```

