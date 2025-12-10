# SSL 证书上传脚本 (Windows PowerShell)
# 用于将证书文件上传到服务器

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [Parameter(Mandatory=$true)]
    [string]$ServerUser = "root",
    
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath = "/root/QualityGuard"
)

$CertPath = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx"
$CertFile = "$CertPath\zhihome.com.cn.pem"
$KeyFile = "$CertPath\zhihome.com.cn.key"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "SSL 证书上传脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查文件是否存在
if (-not (Test-Path $CertFile)) {
    Write-Host "❌ 错误: 证书文件不存在: $CertFile" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $KeyFile)) {
    Write-Host "❌ 错误: 私钥文件不存在: $KeyFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 证书文件检查通过" -ForegroundColor Green
Write-Host ""

# 检查是否安装了 scp (通过 OpenSSH)
$scpPath = Get-Command scp -ErrorAction SilentlyContinue
if (-not $scpPath) {
    Write-Host "⚠️  未找到 scp 命令" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请使用以下方法之一上传文件：" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "方法一：使用 WinSCP 或 FileZilla" -ForegroundColor Cyan
    Write-Host "  1. 下载 WinSCP: https://winscp.net/" -ForegroundColor White
    Write-Host "  2. 连接到服务器: $ServerUser@$ServerIP" -ForegroundColor White
    Write-Host "  3. 上传文件到: $ProjectPath/nginx/ssl/" -ForegroundColor White
    Write-Host "     - zhihome.com.cn.pem → cert.pem" -ForegroundColor White
    Write-Host "     - zhihome.com.cn.key → key.pem" -ForegroundColor White
    Write-Host ""
    Write-Host "方法二：在服务器上直接操作" -ForegroundColor Cyan
    Write-Host "  1. 将文件复制到服务器（使用其他方式）" -ForegroundColor White
    Write-Host "  2. SSH 登录服务器" -ForegroundColor White
    Write-Host "  3. 执行以下命令：" -ForegroundColor White
    Write-Host "     cd $ProjectPath" -ForegroundColor Yellow
    Write-Host "     mkdir -p nginx/ssl" -ForegroundColor Yellow
    Write-Host "     # 将文件放到 nginx/ssl/ 目录" -ForegroundColor Yellow
    Write-Host "     mv zhihome.com.cn.pem nginx/ssl/cert.pem" -ForegroundColor Yellow
    Write-Host "     mv zhihome.com.cn.key nginx/ssl/key.pem" -ForegroundColor Yellow
    Write-Host "     chmod 644 nginx/ssl/cert.pem" -ForegroundColor Yellow
    Write-Host "     chmod 600 nginx/ssl/key.pem" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

Write-Host "正在上传证书文件到服务器..." -ForegroundColor Cyan
Write-Host "服务器: $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "目标路径: $ProjectPath/nginx/ssl/" -ForegroundColor White
Write-Host ""

# 创建远程目录
Write-Host "创建远程目录..." -ForegroundColor Yellow
ssh "$ServerUser@$ServerIP" "mkdir -p $ProjectPath/nginx/ssl"

# 上传证书文件
Write-Host "上传证书文件..." -ForegroundColor Yellow
scp $CertFile "$ServerUser@$ServerIP`:$ProjectPath/nginx/ssl/cert.pem"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 证书文件上传失败" -ForegroundColor Red
    exit 1
}

# 上传私钥文件
Write-Host "上传私钥文件..." -ForegroundColor Yellow
scp $KeyFile "$ServerUser@$ServerIP`:$ProjectPath/nginx/ssl/key.pem"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 私钥文件上传失败" -ForegroundColor Red
    exit 1
}

# 设置文件权限
Write-Host "设置文件权限..." -ForegroundColor Yellow
ssh "$ServerUser@$ServerIP" "chmod 644 $ProjectPath/nginx/ssl/cert.pem && chmod 600 $ProjectPath/nginx/ssl/key.pem"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ 证书文件上传成功！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作：" -ForegroundColor Cyan
Write-Host "1. SSH 登录服务器验证文件" -ForegroundColor White
Write-Host "2. 运行配置脚本: ./scripts/setup-https.sh" -ForegroundColor White
Write-Host "3. 启动服务: docker-compose up -d" -ForegroundColor White
Write-Host ""

