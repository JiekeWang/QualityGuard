# HTTPS 配置快速指南

## 快速开始

### 1. 准备 SSL 证书

从阿里云下载 SSL 证书，包含：
- 证书文件（.pem 或 .crt）
- 私钥文件（.key）

### 2. 放置证书文件

将证书文件放到项目目录：

```bash
# 创建目录
mkdir -p nginx/ssl

# 将证书文件重命名并放置：
# - 证书文件 → nginx/ssl/cert.pem
# - 私钥文件 → nginx/ssl/key.pem
```

### 3. 运行配置脚本

```bash
# Linux/Mac
chmod +x scripts/setup-https.sh
./scripts/setup-https.sh

# 或手动配置
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh
```

### 4. 更新配置

#### 更新 Nginx 配置

编辑 `nginx/conf.d/qualityguard.conf`，将 `server_name _;` 替换为你的域名：

```nginx
server_name your-domain.com;
```

#### 更新后端 CORS 配置

编辑 `backend/.env` 或 `backend/app/core/config.py`：

```python
CORS_ORIGINS = [
    "https://your-domain.com",
    "https://www.your-domain.com",
]
```

#### 更新前端配置

创建 `frontend/.env.production`：

```env
VITE_API_URL=https://your-domain.com/api/v1
```

### 5. 构建和启动

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f nginx
```

### 6. 验证

访问 `https://your-domain.com`，应该看到：
- ✅ 浏览器显示锁图标
- ✅ 前端页面正常加载
- ✅ API 请求正常

## 证书文件格式

如果阿里云证书是其他格式，需要转换：

```bash
# 转换证书（如果需要）
openssl x509 -in certificate.crt -out nginx/ssl/cert.pem -outform PEM

# 私钥（通常已经是 PEM 格式）
cp private.key nginx/ssl/key.pem
```

## 文件权限

确保证书文件权限正确：

```bash
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem
```

## 故障排查

### 证书错误
```bash
# 查看证书信息
openssl x509 -in nginx/ssl/cert.pem -text -noout

# 查看 Nginx 日志
docker-compose logs nginx
```

### 502 错误
```bash
# 检查后端服务
docker-compose ps
docker-compose logs backend
```

### CORS 错误
- 检查后端 CORS 配置是否包含 HTTPS 域名
- 检查 Nginx 是否正确转发请求头

## 详细文档

更多信息请查看：[docs/HTTPS_SETUP.md](docs/HTTPS_SETUP.md)

