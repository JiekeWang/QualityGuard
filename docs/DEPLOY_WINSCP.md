# 使用 WinSCP 部署项目到服务器

## 步骤

### 1. 下载并安装 WinSCP
访问：https://winscp.net/ 下载并安装

### 2. 连接到服务器
- **文件协议**：SFTP
- **主机名**：47.116.197.230
- **端口号**：22
- **用户名**：root
- **密码**：232629wh@
- 点击"保存"然后"登录"

### 3. 上传项目文件
- **左侧（本地）**：`D:\QualityGuard`（整个项目文件夹）
- **右侧（服务器）**：`/root/`（上传到 /root/ 目录）

**上传方式**：
1. 在左侧选择 `D:\QualityGuard` 文件夹
2. 在右侧导航到 `/root/`
3. 右键点击左侧的 `QualityGuard` 文件夹
4. 选择"上传"
5. 等待上传完成（可能需要几分钟）

### 4. 上传 SSL 证书
上传完成后：
- **左侧**：`C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\`
- **右侧**：`/root/QualityGuard/nginx/ssl/`（如果不存在，右键创建目录）

上传并重命名：
- `zhihome.com.cn.pem` → `cert.pem`
- `zhihome.com.cn.key` → `key.pem`

### 5. 设置文件权限
在 WinSCP 中：
- 右键 `cert.pem` → 属性 → 权限 → 设置为 `644`
- 右键 `key.pem` → 属性 → 权限 → 设置为 `600`

### 6. SSH 登录验证
```bash
cd /root/QualityGuard
ls -la
ls -la nginx/ssl/
```

## 注意事项

1. **上传时间**：整个项目上传可能需要几分钟，请耐心等待
2. **文件大小**：确保上传所有文件，包括隐藏文件（.git, .env 等）
3. **权限**：上传后可能需要调整一些文件的权限

## 如果上传失败

可以尝试：
1. 分批上传（先上传关键目录）
2. 压缩后上传（在本地压缩，上传后解压）
3. 使用 Git 镜像源（如果网络问题解决）

