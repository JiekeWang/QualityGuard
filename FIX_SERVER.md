# 修复服务器问题

## 问题
服务器上没有 `unzip` 命令，导致解压失败。

## 解决方案

SSH 登录服务器后执行以下命令：

```bash
# 1. 安装 unzip（根据系统类型选择）

# CentOS/RHEL/AlmaLinux 系统：
yum install -y unzip

# 或者 Ubuntu/Debian 系统：
apt-get update && apt-get install -y unzip

# 2. 解压文件
cd /root
unzip -o QualityGuard-deploy.zip -d QualityGuard

# 3. 创建 SSL 目录
cd QualityGuard
mkdir -p nginx/ssl

# 4. 验证
ls -la
ls -la nginx/ssl/
```

## 或者使用 Python 解压（如果 unzip 安装失败）

```bash
cd /root
python3 -m zipfile -e QualityGuard-deploy.zip QualityGuard
cd QualityGuard
mkdir -p nginx/ssl
```

## 修复后继续上传证书

修复完成后，重新运行上传脚本：
```powershell
powershell -ExecutionPolicy Bypass -File .\UPLOAD.ps1
```

或者手动上传证书：
```powershell
# 上传证书
scp "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem" root@47.116.197.230:/root/QualityGuard/nginx/ssl/cert.pem

# 上传私钥
scp "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key" root@47.116.197.230:/root/QualityGuard/nginx/ssl/key.pem

# 设置权限
ssh root@47.116.197.230 "chmod 644 /root/QualityGuard/nginx/ssl/cert.pem; chmod 600 /root/QualityGuard/nginx/ssl/key.pem"
```

