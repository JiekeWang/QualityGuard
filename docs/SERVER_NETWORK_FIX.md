# 服务器网络问题解决方案

## 问题
服务器无法连接 Docker Hub，无法拉取镜像。

## 解决方案

### 方案一：配置代理（如果有代理服务器）

```bash
# 创建代理配置
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/http-proxy.conf <<EOF
[Service]
Environment="HTTP_PROXY=http://your-proxy:port"
Environment="HTTPS_PROXY=http://your-proxy:port"
Environment="NO_PROXY=localhost,127.0.0.1"
EOF

systemctl daemon-reload
systemctl restart docker
```

### 方案二：使用阿里云容器镜像服务（需要登录）

1. **登录阿里云容器镜像服务**
   - 访问：https://cr.console.aliyun.com/
   - 获取个人镜像加速地址

2. **配置镜像加速器**
   ```bash
   cat > /etc/docker/daemon.json <<EOF
   {
     "registry-mirrors": [
       "https://your-mirror-id.mirror.aliyuncs.com"
     ]
   }
   EOF
   systemctl daemon-reload
   systemctl restart docker
   ```

### 方案三：手动下载镜像文件

1. **在有网络的机器上下载镜像**
   ```bash
   docker pull python:3.11-slim
   docker pull node:18-alpine
   docker pull nginx:alpine
   docker pull postgres:14-alpine
   docker pull redis:7-alpine
   docker pull rabbitmq:3-management-alpine
   docker pull minio/minio:latest
   ```

2. **导出镜像**
   ```bash
   docker save -o base-images.tar \
     python:3.11-slim \
     node:18-alpine \
     nginx:alpine \
     postgres:14-alpine \
     redis:7-alpine \
     rabbitmq:3-management-alpine \
     minio/minio:latest
   ```

3. **上传到服务器并导入**
   ```bash
   # 上传
   scp base-images.tar root@47.116.197.230:/root/
   
   # 在服务器上导入
   ssh root@47.116.197.230
   docker load -i /root/base-images.tar
   ```

### 方案四：检查防火墙和网络设置

```bash
# 检查网络连接
ping registry-1.docker.io
curl -I https://registry-1.docker.io/v2/

# 检查防火墙
systemctl status firewalld
firewall-cmd --list-all

# 临时关闭防火墙测试（不推荐生产环境）
systemctl stop firewalld
```

### 方案五：使用其他镜像仓库

尝试使用其他可用的镜像仓库：

```bash
# 测试不同的镜像源
docker pull dockerhub.azk8s.cn/library/python:3.11-slim
docker pull reg-mirror.qiniu.com/library/python:3.11-slim
```

