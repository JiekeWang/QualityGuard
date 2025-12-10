# 使用阿里云镜像安装 Docker

## 问题
从 Docker 官方仓库下载时遇到 SSL 连接错误。

## 解决方案

### 方法一：使用阿里云镜像源（推荐）

在服务器上执行：

```bash
# 1. 移除 podman-docker
yum remove -y podman-docker

# 2. 安装必要工具
yum install -y yum-utils device-mapper-persistent-data lvm2

# 3. 添加阿里云 Docker 镜像源
yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo

# 4. 清理缓存并更新
yum clean all
yum makecache fast

# 5. 安装 Docker CE（跳过 GPG 检查）
yum install -y docker-ce docker-ce-cli containerd.io --nogpgcheck

# 6. 启动 Docker
systemctl start docker
systemctl enable docker

# 7. 验证
docker --version
systemctl status docker

# 8. 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

### 方法二：使用系统自带的 Docker（如果可用）

某些阿里云镜像可能已经包含 Docker：

```bash
# 检查是否有其他 Docker 包
yum search docker

# 尝试安装
yum install -y docker
systemctl start docker
systemctl enable docker
```

### 方法三：手动下载 RPM 包安装

如果网络问题持续，可以手动下载：

```bash
# 1. 在本地下载以下 RPM 包（从其他有网络的机器）：
# - containerd.io-*.rpm
# - docker-ce-*.rpm
# - docker-ce-cli-*.rpm

# 2. 上传到服务器
scp *.rpm root@47.116.197.230:/tmp/

# 3. 在服务器上安装
cd /tmp
yum localinstall -y *.rpm
systemctl start docker
systemctl enable docker
```

### 方法四：使用 Podman（临时方案）

如果 Docker 安装持续失败，可以使用 Podman（已安装）：

```bash
# Podman 兼容大部分 Docker 命令
podman --version

# 但需要安装 podman-compose 或使用其他编排工具
```

## 网络问题排查

如果仍然遇到网络问题：

```bash
# 1. 检查网络连接
ping download.docker.com
ping mirrors.aliyun.com

# 2. 检查 DNS
nslookup download.docker.com

# 3. 尝试使用代理（如果有）
export http_proxy=http://your-proxy:port
export https_proxy=http://your-proxy:port

# 4. 临时禁用 SSL 验证（不推荐，仅用于测试）
yum install -y docker-ce docker-ce-cli containerd.io --nogpgcheck --skip-broken
```

## 安装完成后

```bash
cd /root/QualityGuard
docker-compose build
docker-compose up -d
```

