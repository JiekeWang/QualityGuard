# 阿里云 SSL 证书下载和使用指南

## 一、下载证书

### 1. 登录阿里云控制台
访问：https://ecs.console.aliyun.com/

### 2. 进入 SSL 证书控制台
- **方法一**：在顶部搜索框输入 "SSL证书" 或 "证书服务"
- **方法二**：直接访问 https://yundun.console.aliyun.com/?p=cas
- **方法三**：产品与服务 → 安全（云盾）→ SSL证书（应用安全）

### 3. 找到你的证书
在证书列表中，找到你需要使用的证书（通常显示域名和状态）

### 4. 下载证书
1. 点击证书右侧的 **"下载"** 按钮
2. 选择服务器类型：**Nginx**
3. 点击下载，会得到一个压缩包

### 5. 解压文件
解压后通常包含以下文件：
- `证书文件.pem` 或 `证书文件.crt` - 这是证书文件
- `私钥文件.key` - 这是私钥文件
- `证书链文件.pem`（可选）- 证书链文件

## 二、文件命名说明

阿里云下载的文件可能有不同的命名方式，常见的有：

### 方式一：中文命名
- `证书文件.pem` → 需要重命名为 `cert.pem`
- `私钥文件.key` → 需要重命名为 `key.pem`

### 方式二：英文命名
- `yourdomain.com.pem` → 需要重命名为 `cert.pem`
- `yourdomain.com.key` → 需要重命名为 `key.pem`

### 方式三：其他命名
- `certificate.pem` → 需要重命名为 `cert.pem`
- `private.key` → 需要重命名为 `key.pem`

## 三、上传到服务器

### 方法一：使用 SCP（推荐）

```bash
# 在本地电脑执行（Windows 使用 PowerShell 或 Git Bash）
scp 证书文件.pem root@your-server-ip:/path/to/QualityGuard/nginx/ssl/cert.pem
scp 私钥文件.key root@your-server-ip:/path/to/QualityGuard/nginx/ssl/key.pem
```

### 方法二：使用 SFTP 工具
使用 FileZilla、WinSCP 等工具上传文件

### 方法三：直接在服务器上操作
如果证书已经在服务器上：

```bash
# SSH 登录服务器
ssh root@your-server-ip

# 进入项目目录
cd /path/to/QualityGuard

# 创建 SSL 目录
mkdir -p nginx/ssl

# 复制证书文件（根据实际路径调整）
cp /path/to/证书文件.pem nginx/ssl/cert.pem
cp /path/to/私钥文件.key nginx/ssl/key.pem

# 设置权限
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem
```

## 四、验证证书文件

上传后，验证文件是否正确：

```bash
# 查看证书信息
openssl x509 -in nginx/ssl/cert.pem -text -noout

# 查看证书有效期
openssl x509 -in nginx/ssl/cert.pem -noout -dates

# 验证私钥
openssl rsa -in nginx/ssl/key.pem -check -noout
```

## 五、常见问题

### Q1: 找不到下载按钮？
- 确认证书状态是"已签发"
- 确认你使用的是付费证书或免费证书（DV证书）
- 检查是否有权限访问证书

### Q2: 下载的文件格式不对？
如果下载的是 `.pfx` 或 `.p12` 格式，需要转换：

```bash
# 转换为 PEM 格式
openssl pkcs12 -in certificate.pfx -out cert.pem -clcerts -nokeys
openssl pkcs12 -in certificate.pfx -out key.pem -nocerts -nodes
```

### Q3: 证书文件包含多个文件？
如果下载包包含：
- `证书文件.pem` - 使用这个作为 cert.pem
- `证书链文件.pem` - 可以合并到 cert.pem 中，或单独使用
- `私钥文件.key` - 使用这个作为 key.pem

合并证书链（如果需要）：
```bash
cat 证书文件.pem 证书链文件.pem > nginx/ssl/cert.pem
```

### Q4: 证书下载后找不到？
- 检查浏览器的下载文件夹
- 检查下载历史记录
- 在阿里云控制台重新下载

## 六、快速设置脚本

使用我们提供的脚本：

```bash
# 在服务器上执行
cd /path/to/QualityGuard
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh
```

脚本会检查证书文件并设置正确的权限。

## 七、证书位置总结

### 在阿里云控制台
- **路径**：SSL证书（应用安全）→ 证书列表 → 点击"下载"
- **直接链接**：https://yundun.console.aliyun.com/?p=cas

### 在服务器上
- **目标路径**：`/path/to/QualityGuard/nginx/ssl/`
- **文件名**：
  - `cert.pem` - 证书文件
  - `key.pem` - 私钥文件

### 文件权限
- `cert.pem`: 644 (rw-r--r--)
- `key.pem`: 600 (rw-------)

## 八、下一步

证书文件准备好后：
1. 运行 `scripts/setup-https.sh` 配置 HTTPS
2. 或手动编辑 `nginx/conf.d/qualityguard.conf` 更新域名
3. 运行 `docker-compose up -d` 启动服务

