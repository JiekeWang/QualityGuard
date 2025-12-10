# Docker Compose 安装指南（网络问题解决方案）

## 问题
GitHub 连接超时，无法下载 Docker Compose。

## 解决方案

### 方法一：使用国内镜像（推荐）

```bash
# 使用 gitee 镜像或直接指定版本
curl -L "https://get.daocloud.io/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 或者使用 GitHub 镜像
curl -L "https://ghproxy.com/https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

### 方法二：使用 Docker Compose 插件（如果已安装）

如果之前安装了 `docker-compose-plugin`，可以直接使用：

```bash
# 使用插件版本（注意是 'compose' 不是 'compose'）
docker compose version

# 构建和启动使用：
docker compose build
docker compose up -d
```

### 方法三：手动下载并上传

1. 在本地下载 Docker Compose：
   - 访问：https://github.com/docker/compose/releases
   - 下载对应版本：`docker-compose-linux-x86_64`
   - 重命名为：`docker-compose`

2. 上传到服务器：
```powershell
scp docker-compose root@47.116.197.230:/usr/local/bin/
```

3. 在服务器上设置权限：
```bash
chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

### 方法四：使用 pip 安装（如果 Python 可用）

```bash
pip install docker-compose
docker-compose --version
```

