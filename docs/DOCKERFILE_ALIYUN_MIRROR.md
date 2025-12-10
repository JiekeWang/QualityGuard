# 使用阿里云镜像修改 Dockerfile

## 问题
Docker Hub 连接超时，即使配置了镜像加速器也无法拉取镜像。

## 解决方案：直接使用阿里云容器镜像服务

已修改所有 Dockerfile 和 docker-compose.yml，使用阿里云容器镜像服务的公共镜像。

### 修改内容

1. **backend/Dockerfile**: `python:3.11-slim` → `registry.cn-hangzhou.aliyuncs.com/acs/python:3.11-slim`
2. **frontend/Dockerfile**: 
   - `node:18-alpine` → `registry.cn-hangzhou.aliyuncs.com/acs/node:18-alpine`
   - `nginx:alpine` → `registry.cn-hangzhou.aliyuncs.com/acs/nginx:alpine`
3. **docker-compose.yml**:
   - `postgres:14-alpine` → `registry.cn-hangzhou.aliyuncs.com/acs/postgres:14-alpine`
   - `redis:7-alpine` → `registry.cn-hangzhou.aliyuncs.com/acs/redis:7-alpine`
   - `rabbitmq:3-management-alpine` → `registry.cn-hangzhou.aliyuncs.com/acs/rabbitmq:3-management-alpine`
   - `minio/minio:latest` → `registry.cn-hangzhou.aliyuncs.com/acs/minio:latest`

## 使用步骤

### 1. 上传修改后的文件到服务器

```powershell
# 压缩修改后的文件
Compress-Archive -Path backend\Dockerfile,frontend\Dockerfile,docker-compose.yml -DestinationPath docker-files-update.zip -Force

# 上传到服务器
scp docker-files-update.zip root@47.116.197.230:/root/QualityGuard/
```

### 2. 在服务器上解压并替换

```bash
cd /root/QualityGuard
unzip -o docker-files-update.zip
```

### 3. 重新构建

```bash
docker compose build
docker compose up -d
```

## 或者直接测试拉取镜像

```bash
# 测试拉取各个镜像
docker pull registry.cn-hangzhou.aliyuncs.com/acs/python:3.11-slim
docker pull registry.cn-hangzhou.aliyuncs.com/acs/node:18-alpine
docker pull registry.cn-hangzhou.aliyuncs.com/acs/nginx:alpine
docker pull registry.cn-hangzhou.aliyuncs.com/acs/postgres:14-alpine
docker pull registry.cn-hangzhou.aliyuncs.com/acs/redis:7-alpine
```

## 注意事项

- 阿里云容器镜像服务的公共镜像可能与官方镜像略有差异
- 如果某些镜像不存在，可以尝试使用其他国内镜像源
- 或者使用阿里云个人镜像加速地址（需要登录阿里云获取）

