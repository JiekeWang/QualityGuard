# 手动上传证书文件

## 当前状态
✅ 项目文件已解压到 `/root/QualityGuard`
✅ SSL 目录已创建：`/root/QualityGuard/nginx/ssl/`

## 需要上传的文件
1. 证书文件：`zhihome.com.cn.pem` → `/root/QualityGuard/nginx/ssl/cert.pem`
2. 私钥文件：`zhihome.com.cn.key` → `/root/QualityGuard/nginx/ssl/key.pem`

## 上传命令

在 PowerShell 中执行以下命令：

```powershell
# 1. 上传证书文件
scp "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem" root@47.116.197.230:/root/QualityGuard/nginx/ssl/cert.pem

# 2. 上传私钥文件
scp "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key" root@47.116.197.230:/root/QualityGuard/nginx/ssl/key.pem

# 3. 设置文件权限（SSH 登录后执行）
ssh root@47.116.197.230 "chmod 644 /root/QualityGuard/nginx/ssl/cert.pem; chmod 600 /root/QualityGuard/nginx/ssl/key.pem; ls -la /root/QualityGuard/nginx/ssl/"
```

## 或者使用脚本

运行仅上传证书的脚本：
```powershell
powershell -ExecutionPolicy Bypass -File .\UPLOAD_CERT_ONLY.ps1
```

## 验证

上传完成后，SSH 登录服务器验证：
```bash
ssh root@47.116.197.230
cd /root/QualityGuard
ls -la nginx/ssl/
```

应该看到：
- `cert.pem` (644 权限)
- `key.pem` (600 权限)

