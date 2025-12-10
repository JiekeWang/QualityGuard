# 简单上传指南

## 方法一：使用 WinSCP（最简单，推荐）

1. **下载 WinSCP**：https://winscp.net/
2. **连接服务器**：
   - 主机名：`47.116.197.230`
   - 用户名：`root`
   - 密码：`232629wh@`
3. **上传压缩包**：
   - 左侧：`D:\QualityGuard-deploy.zip`
   - 右侧：`/root/`
   - 拖拽上传
4. **上传 SSL 证书**：
   - 左侧：`C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\`
   - 右侧：`/root/QualityGuard/nginx/ssl/`（上传后创建）
   - 上传并重命名：
     - `zhihome.com.cn.pem` → `cert.pem`
     - `zhihome.com.cn.key` → `key.pem`
   - 设置权限：`cert.pem` → 644，`key.pem` → 600

## 方法二：在 PowerShell 中手动执行

打开 PowerShell，依次执行以下命令（每次输入密码 `232629wh@`）：

```powershell
# 1. 上传压缩包
scp "D:\QualityGuard-deploy.zip" root@47.116.197.230:/root/

# 2. 解压
ssh root@47.116.197.230 "cd /root && unzip -o QualityGuard-deploy.zip -d QualityGuard && cd QualityGuard && mkdir -p nginx/ssl"

# 3. 上传证书
scp "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem" root@47.116.197.230:/root/QualityGuard/nginx/ssl/cert.pem

# 4. 上传私钥
scp "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key" root@47.116.197.230:/root/QualityGuard/nginx/ssl/key.pem

# 5. 设置权限
ssh root@47.116.197.230 "chmod 644 /root/QualityGuard/nginx/ssl/cert.pem && chmod 600 /root/QualityGuard/nginx/ssl/key.pem"
```

## 上传完成后

SSH 登录服务器验证：

```bash
ssh root@47.116.197.230
cd /root/QualityGuard
ls -la
ls -la nginx/ssl/
```

然后告诉我，我继续帮你配置和启动服务！

