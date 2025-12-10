# 本地构建镜像并上传到服务器

## 问题
服务器无法连接到 Docker Hub 和镜像加速器，无法拉取镜像。

## 解决方案：本地构建后上传

### 方法一：本地构建镜像并导出上传

#### 1. 在本地构建镜像

```powershell
# 在本地项目目录
cd D:\QualityGuard

# 构建所有镜像
docker compose build

# 查看构建的镜像
docker images | findstr qualityguard
```

#### 2. 导出镜像为 tar 文件

```powershell
# 导出镜像（需要根据实际镜像名称调整）
docker save -o qualityguard-backend.tar qualityguard-backend:latest
docker save -o qualityguard-frontend.tar qualityguard-frontend:latest

# 或者导出所有相关镜像
docker save -o qualityguard-images.tar qualityguard-backend:latest qualityguard-frontend:latest postgres:14-alpine redis:7-alpine rabbitmq:3-management-alpine minio/minio:latest nginx:alpine
```

#### 3. 上传到服务器

```powershell
# 上传镜像文件
scp qualityguard-images.tar root@47.116.197.230:/root/

# 或者分步上传
scp qualityguard-backend.tar root@47.116.197.230:/root/
scp qualityguard-frontend.tar root@47.116.197.230:/root/
```

#### 4. 在服务器上导入镜像

```bash
# SSH 登录服务器
ssh root@47.116.197.230

# 导入镜像
docker load -i /root/qualityguard-images.tar

# 验证镜像
docker images
```

#### 5. 启动服务

```bash
cd /root/QualityGuard
docker compose up -d
```

### 方法二：使用 Docker Registry（如果有）

如果有可用的私有 Registry：

```bash
# 在本地标记并推送
docker tag qualityguard-backend:latest your-registry/qualityguard-backend:latest
docker push your-registry/qualityguard-backend:latest

# 在服务器上拉取
docker pull your-registry/qualityguard-backend:latest
```

### 方法三：检查网络和代理

如果服务器有代理配置：

```bash
# 配置 Docker 使用代理
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/http-proxy.conf <<EOF
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:8080"
Environment="HTTPS_PROXY=http://proxy.example.com:8080"
Environment="NO_PROXY=localhost,127.0.0.1"
EOF

systemctl daemon-reload
systemctl restart docker
```

