# 使用密码上传证书（一次性使用，完成后删除此文件）

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ServerPassword = "232629wh@"
$ProjectPath = "/root/QualityGuard"
$CertFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem"
$KeyFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "上传 SSL 证书到服务器" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "服务器: $ServerUser@$ServerIP" -ForegroundColor White
Write-Host ""

# 检查证书文件
if (-not (Test-Path $CertFile)) {
    Write-Host "❌ 证书文件不存在: $CertFile" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $KeyFile)) {
    Write-Host "❌ 私钥文件不存在: $KeyFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 证书文件检查通过" -ForegroundColor Green
Write-Host ""

# 检查是否安装了 plink (PuTTY 的一部分，支持密码)
$plinkPath = Get-Command plink -ErrorAction SilentlyContinue

if ($plinkPath) {
    Write-Host "使用 plink 上传..." -ForegroundColor Yellow
    
    # 使用 plink 创建目录
    $createDirCmd = "mkdir -p $ProjectPath/nginx/ssl"
    echo y | plink -ssh -pw $ServerPassword "$ServerUser@$ServerIP" $createDirCmd
    
    # 使用 pscp 上传文件
    $pscpPath = Get-Command pscp -ErrorAction SilentlyContinue
    if ($pscpPath) {
        Write-Host "上传证书文件..." -ForegroundColor Yellow
        echo y | pscp -pw $ServerPassword $CertFile "$ServerUser@$ServerIP`:$ProjectPath/nginx/ssl/cert.pem"
        
        Write-Host "上传私钥文件..." -ForegroundColor Yellow
        echo y | pscp -pw $ServerPassword $KeyFile "$ServerUser@$ServerIP`:$ProjectPath/nginx/ssl/key.pem"
        
        Write-Host "设置文件权限..." -ForegroundColor Yellow
        $setPermsCmd = "chmod 644 $ProjectPath/nginx/ssl/cert.pem && chmod 600 $ProjectPath/nginx/ssl/key.pem"
        echo y | plink -ssh -pw $ServerPassword "$ServerUser@$ServerIP" $setPermsCmd
        
        Write-Host "✅ 上传完成！" -ForegroundColor Green
    } else {
        Write-Host "⚠️  未找到 pscp，请安装 PuTTY" -ForegroundColor Yellow
    }
} else {
    # 使用 expect 脚本或手动方式
    Write-Host "⚠️  未找到 plink/pscp" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请使用以下方法之一：" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "方法一：安装 PuTTY（推荐）" -ForegroundColor Green
    Write-Host "1. 下载 PuTTY: https://www.putty.org/" -ForegroundColor White
    Write-Host "2. 安装后使用 pscp 上传：" -ForegroundColor White
    Write-Host "   pscp -pw $ServerPassword $CertFile $ServerUser@$ServerIP`:$ProjectPath/nginx/ssl/cert.pem" -ForegroundColor Cyan
    Write-Host "   pscp -pw $ServerPassword $KeyFile $ServerUser@$ServerIP`:$ProjectPath/nginx/ssl/key.pem" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "方法二：使用 WinSCP（最简单）" -ForegroundColor Green
    Write-Host "1. 下载 WinSCP: https://winscp.net/" -ForegroundColor White
    Write-Host "2. 连接到服务器并上传文件" -ForegroundColor White
    Write-Host ""
    Write-Host "方法三：在服务器上直接操作" -ForegroundColor Green
    Write-Host "1. 使用 WinSCP 将文件上传到 /tmp/" -ForegroundColor White
    Write-Host "2. SSH 登录服务器执行：" -ForegroundColor White
    Write-Host "   cd $ProjectPath" -ForegroundColor Cyan
    Write-Host "   mkdir -p nginx/ssl" -ForegroundColor Cyan
    Write-Host "   cp /tmp/zhihome.com.cn.pem nginx/ssl/cert.pem" -ForegroundColor Cyan
    Write-Host "   cp /tmp/zhihome.com.cn.key nginx/ssl/key.pem" -ForegroundColor Cyan
    Write-Host "   chmod 644 nginx/ssl/cert.pem" -ForegroundColor Cyan
    Write-Host "   chmod 600 nginx/ssl/key.pem" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""
Write-Host "⚠️  安全提示：此脚本包含密码，使用后请删除！" -ForegroundColor Red
Write-Host ""

