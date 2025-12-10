# 直接部署方案 - 安装路径说明

## 项目路径

- **项目根目录**: `/root/QualityGuard`
- **后端代码**: `/root/QualityGuard/backend`
- **前端代码**: `/root/QualityGuard/frontend`

## 各组件安装路径

### 1. 系统软件包

所有系统软件包通过 `yum` 安装到系统默认路径：

- **Python 3**: `/usr/bin/python3`
- **pip**: `/usr/bin/pip3`
- **PostgreSQL**: 
  - 可执行文件: `/usr/bin/psql`, `/usr/bin/postgres`
  - 数据目录: `/var/lib/pgsql/data`
  - 配置文件: `/var/lib/pgsql/data/postgresql.conf`
- **Redis**: 
  - 可执行文件: `/usr/bin/redis-server`, `/usr/bin/redis-cli`
  - 数据目录: `/var/lib/redis`
  - 配置文件: `/etc/redis.conf`
- **Nginx**: 
  - 可执行文件: `/usr/sbin/nginx`
  - 配置目录: `/etc/nginx/`
  - 网站根目录: `/usr/share/nginx/html/`
- **Node.js**: `/usr/bin/node`, `/usr/bin/npm`

### 2. 后端部署路径

- **代码位置**: `/root/QualityGuard/backend`
- **虚拟环境**: `/root/QualityGuard/backend/venv`
- **上传文件**: `/root/QualityGuard/backend/uploads`
- **报告文件**: `/root/QualityGuard/backend/reports`
- **系统服务**: `/etc/systemd/system/qualityguard-backend.service`

### 3. 前端部署路径

- **源代码**: `/root/QualityGuard/frontend`
- **构建产物**: `/root/QualityGuard/frontend/dist`
- **Nginx 服务目录**: `/usr/share/nginx/html/qualityguard`
  - 前端静态文件会被复制到这里供 Nginx 服务

### 4. Nginx 配置路径

- **主配置**: `/etc/nginx/nginx.conf`
- **站点配置**: `/etc/nginx/conf.d/qualityguard.conf`
- **SSL 证书**: `/root/QualityGuard/nginx/ssl/`
  - `cert.pem` - SSL 证书
  - `key.pem` - 私钥

### 5. 数据库路径

- **PostgreSQL 数据**: `/var/lib/pgsql/data`
- **数据库名**: `qualityguard`
- **数据库用户**: `qualityguard`

### 6. 日志路径

- **后端日志**: `journalctl -u qualityguard-backend`
- **Nginx 访问日志**: `/var/log/nginx/access.log`
- **Nginx 错误日志**: `/var/log/nginx/error.log`
- **PostgreSQL 日志**: `/var/lib/pgsql/data/pg_log/`
- **Redis 日志**: `/var/log/redis/redis.log`

## 目录结构总结

```
/root/QualityGuard/              # 项目根目录
├── backend/                      # 后端代码
│   ├── venv/                     # Python 虚拟环境
│   ├── uploads/                  # 上传文件目录
│   ├── reports/                  # 报告文件目录
│   └── ...
├── frontend/                      # 前端代码
│   ├── dist/                     # 构建产物（会复制到 Nginx）
│   └── ...
└── nginx/
    └── ssl/                      # SSL 证书目录
        ├── cert.pem
        └── key.pem

/usr/share/nginx/html/qualityguard/  # Nginx 服务的前端文件

/etc/systemd/system/qualityguard-backend.service  # 后端系统服务

/etc/nginx/conf.d/qualityguard.conf  # Nginx 站点配置

/var/lib/pgsql/data/              # PostgreSQL 数据目录
```

## 服务管理

所有服务通过 systemd 管理：

```bash
# 后端服务
systemctl status qualityguard-backend
systemctl start qualityguard-backend
systemctl stop qualityguard-backend
systemctl restart qualityguard-backend

# 数据库服务
systemctl status postgresql
systemctl start postgresql

# Redis 服务
systemctl status redis
systemctl start redis

# Nginx 服务
systemctl status nginx
systemctl restart nginx
```

## 快速部署命令

```bash
# 1. 上传部署脚本到服务器
scp scripts/direct-deploy.sh root@47.116.197.230:/root/

# 2. SSH 登录服务器
ssh root@47.116.197.230

# 3. 执行部署脚本
chmod +x /root/direct-deploy.sh
/root/direct-deploy.sh
```

## 注意事项

1. **SSL 证书**: 部署前需要先上传 SSL 证书到 `/root/QualityGuard/nginx/ssl/`
2. **端口**: 
   - 后端 API: `8000`
   - Nginx HTTP: `80`
   - Nginx HTTPS: `443`
   - PostgreSQL: `5432`
   - Redis: `6379`
3. **防火墙**: 确保开放 80 和 443 端口
4. **权限**: 确保 `/root/QualityGuard` 目录有正确的读写权限

