# HTTPS 配置指南

## 概述

本指南将帮助你在阿里云服务器上配置 HTTPS，使用 Nginx 作为反向代理。

## 前置要求

1. 已获得阿里云 SSL 证书
2. 服务器已安装 Docker 和 Docker Compose
3. 域名已解析到服务器 IP

## SSL 证书准备

### 1. 获取证书文件

从阿里云下载 SSL 证书，通常包含以下文件：
- `证书文件.pem` 或 `证书文件.crt`
- `私钥文件.key`

### 2. 上传证书到服务器

将证书文件上传到服务器的 `nginx/ssl/` 目录：

```bash
# 在服务器上创建目录
mkdir -p /path/to/QualityGuard/nginx/ssl

# 上传证书文件（使用 scp 或其他工具）
# 证书文件重命名为 cert.pem
# 私钥文件重命名为 key.pem
```

**重要：** 确保证书文件权限正确：
```bash
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```

## 配置步骤

### 1. 更新 Nginx 配置

编辑 `nginx/conf.d/qualityguard.conf`，替换域名：

```nginx
server_name your-domain.com;  # 替换为你的实际域名
```

### 2. 更新前端配置

编辑 `frontend/vite.config.ts`，确保生产环境使用 HTTPS：

```typescript
export default defineConfig({
  // ... 其他配置
  build: {
    // 确保构建时使用正确的 API 地址
  }
})
```

### 3. 更新后端配置

编辑 `backend/app/core/config.py` 或 `.env` 文件，更新 CORS 配置：

```python
CORS_ORIGINS: List[str] = [
    "https://your-domain.com",
    "https://www.your-domain.com",
]
```

### 4. 构建和启动服务

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f nginx
```

## 验证 HTTPS

1. 访问 `https://your-domain.com`，应该看到前端页面
2. 检查浏览器地址栏，应该显示锁图标
3. 测试 API：`https://your-domain.com/api/v1/health`

## 证书更新

当证书即将过期时：

1. 从阿里云下载新证书
2. 替换 `nginx/ssl/` 目录中的文件
3. 重启 Nginx 容器：
   ```bash
   docker-compose restart nginx
   ```

## 自动续期（可选）

如果使用 Let's Encrypt 证书，可以设置自动续期：

```bash
# 安装 certbot
apt-get update
apt-get install certbot

# 申请证书
certbot certonly --standalone -d your-domain.com

# 设置自动续期
certbot renew --dry-run
```

## 故障排查

### 1. 证书错误

- 检查证书文件路径是否正确
- 检查证书文件权限
- 查看 Nginx 日志：`docker-compose logs nginx`

### 2. 502 Bad Gateway

- 检查后端服务是否运行：`docker-compose ps`
- 检查后端日志：`docker-compose logs backend`

### 3. 前端无法加载

- 检查前端构建是否成功
- 检查 Nginx 配置中的静态文件路径
- 查看浏览器控制台错误

### 4. CORS 错误

- 更新后端 CORS 配置，包含 HTTPS 域名
- 检查 Nginx 是否正确转发请求头

## 安全建议

1. **使用强密码**：确保所有服务使用强密码
2. **定期更新证书**：设置提醒，在证书过期前更新
3. **启用防火墙**：只开放必要端口（80, 443）
4. **监控日志**：定期检查 Nginx 访问日志和错误日志
5. **备份证书**：定期备份 SSL 证书文件

## 端口说明

- **80**：HTTP 端口（自动重定向到 HTTPS）
- **443**：HTTPS 端口（主要服务端口）

## 测试命令

```bash
# 测试 SSL 配置
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# 检查证书有效期
openssl x509 -in nginx/ssl/cert.pem -noout -dates

# 测试 HTTPS 连接
curl -I https://your-domain.com
```

## 常见问题

### Q: 证书文件格式不对怎么办？

A: 阿里云证书通常是 PEM 格式，如果下载的是其他格式，需要转换：
```bash
# 转换证书格式
openssl x509 -in certificate.crt -out cert.pem -outform PEM

# 私钥通常已经是 PEM 格式，如果不是：
openssl rsa -in private.key -out key.pem -outform PEM
```

### Q: 如何查看证书信息？

A: 使用以下命令：
```bash
openssl x509 -in nginx/ssl/cert.pem -text -noout
```

### Q: 如何测试 HTTPS 是否正常工作？

A: 使用浏览器访问 `https://your-domain.com`，或使用 curl：
```bash
curl -v https://your-domain.com
```

## 下一步

配置完成后：
1. 更新前端 API 地址为 HTTPS
2. 更新所有外部链接为 HTTPS
3. 配置监控和告警
4. 设置证书过期提醒

