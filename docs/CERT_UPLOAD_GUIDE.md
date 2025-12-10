# SSL 证书上传指南

## 证书文件信息

- **域名**: zhihome.com.cn
- **证书文件**: `zhihome.com.cn.pem`
- **私钥文件**: `zhihome.com.cn.key`
- **位置**: `C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\`

## 上传方法

### 方法一：使用 PowerShell 脚本（推荐）

```powershell
# 在项目目录执行
cd D:\QualityGuard
.\scripts\upload-cert.ps1 -ServerIP "你的服务器IP" -ServerUser "root" -ProjectPath "/root/QualityGuard"
```

**注意**：需要服务器已配置 SSH 密钥认证，或脚本会提示输入密码。

### 方法二：使用 WinSCP（图形界面，推荐）

1. **下载 WinSCP**
   - 访问：https://winscp.net/
   - 下载并安装

2. **连接到服务器**
   - 主机名：你的服务器IP
   - 用户名：root（或你的用户名）
   - 密码：你的服务器密码
   - 点击"登录"

3. **上传文件**
   - 左侧：本地文件，导航到 `C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\`
   - 右侧：服务器文件，导航到 `/root/QualityGuard/nginx/ssl/`（如果不存在，先创建）
   - 上传文件：
     - `zhihome.com.cn.pem` → 重命名为 `cert.pem`
     - `zhihome.com.cn.key` → 重命名为 `key.pem`

4. **设置权限**（在 WinSCP 中）
   - 右键点击 `cert.pem` → 属性 → 权限设置为 `644`
   - 右键点击 `key.pem` → 属性 → 权限设置为 `600`

### 方法三：使用 FileZilla

1. 下载 FileZilla：https://filezilla-project.org/
2. 连接到服务器（SFTP 协议）
3. 上传文件到 `/root/QualityGuard/nginx/ssl/`
4. 重命名并设置权限

### 方法四：在服务器上直接操作

如果你可以通过其他方式将文件传到服务器：

```bash
# 1. SSH 登录服务器
ssh root@your-server-ip

# 2. 进入项目目录
cd /root/QualityGuard  # 或你的项目路径

# 3. 创建 SSL 目录
mkdir -p nginx/ssl

# 4. 将文件放到 nginx/ssl/ 目录（使用你上传的方式）
# 例如：如果文件在 /tmp/ 目录
cp /tmp/zhihome.com.cn.pem nginx/ssl/cert.pem
cp /tmp/zhihome.com.cn.key nginx/ssl/key.pem

# 5. 设置正确的权限
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

# 6. 验证文件
ls -la nginx/ssl/
```

## 验证上传

上传后，在服务器上验证：

```bash
# 查看文件是否存在
ls -la nginx/ssl/

# 应该看到：
# -rw-r--r-- 1 root root 3830 cert.pem
# -rw------- 1 root root 1679 key.pem

# 查看证书信息
openssl x509 -in nginx/ssl/cert.pem -text -noout | head -20

# 查看证书有效期
openssl x509 -in nginx/ssl/cert.pem -noout -dates
```

## 配置文件已更新

✅ 已自动更新 `nginx/conf.d/qualityguard.conf`，域名已设置为：
- `zhihome.com.cn`
- `www.zhihome.com.cn`

## 下一步

证书上传完成后：

```bash
# 1. 验证证书文件
cd /root/QualityGuard
./scripts/setup-ssl.sh

# 2. 构建和启动服务
docker-compose build
docker-compose up -d

# 3. 查看日志
docker-compose logs -f nginx

# 4. 测试 HTTPS
curl -I https://zhihome.com.cn
```

## 常见问题

### Q: 上传后文件权限不对？
A: 执行以下命令：
```bash
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem
```

### Q: 如何确认文件上传成功？
A: 在服务器上执行：
```bash
ls -la nginx/ssl/
openssl x509 -in nginx/ssl/cert.pem -noout -subject
```

### Q: 上传后 Nginx 报错？
A: 检查：
1. 文件路径是否正确
2. 文件权限是否正确
3. 证书文件格式是否正确（应该是 PEM 格式）
4. 查看 Nginx 日志：`docker-compose logs nginx`

