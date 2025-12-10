# 自动上传项目到服务器（需要安装 PuTTY 或使用 WinSCP 命令行）

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ServerPassword = "232629wh@"
$ProjectPath = "D:\QualityGuard"
$RemotePath = "/root/QualityGuard"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "自动上传项目到服务器" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "服务器: $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "本地路径: $ProjectPath" -ForegroundColor White
Write-Host "远程路径: $RemotePath" -ForegroundColor White
Write-Host ""

# 检查项目目录
if (-not (Test-Path $ProjectPath)) {
    Write-Host "❌ 项目目录不存在: $ProjectPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 项目目录检查通过" -ForegroundColor Green
Write-Host ""

# 检查工具
$plink = Get-Command plink -ErrorAction SilentlyContinue
$pscp = Get-Command pscp -ErrorAction SilentlyContinue
$winscp = Get-Command winscp -ErrorAction SilentlyContinue

if ($plink -and $pscp) {
    Write-Host "使用 PuTTY 工具上传..." -ForegroundColor Yellow
    
    # 创建远程目录
    Write-Host "1. 创建远程目录..." -ForegroundColor Yellow
    $createDir = "mkdir -p $RemotePath/nginx/ssl"
    echo y | plink -ssh -pw $ServerPassword "$ServerUser@$ServerIP" $createDir
    
    # 上传整个目录（使用 pscp 递归上传）
    Write-Host "2. 上传项目文件（这可能需要几分钟）..." -ForegroundColor Yellow
    Write-Host "   正在上传，请稍候..." -ForegroundColor Gray
    
    # 使用 pscp 递归上传
    $excludeDirs = "node_modules,venv,env,.git,__pycache__,.pytest_cache"
    echo y | pscp -pw $ServerPassword -r "$ProjectPath\*" "$ServerUser@$ServerIP`:$RemotePath/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 项目文件上传成功" -ForegroundColor Green
    } else {
        Write-Host "⚠️  上传可能未完全成功，请检查" -ForegroundColor Yellow
    }
    
} elseif ($winscp) {
    Write-Host "使用 WinSCP 命令行上传..." -ForegroundColor Yellow
    # WinSCP 脚本方式
    $script = @"
open sftp://$ServerUser`:$ServerPassword@$ServerIP
cd /root
put -r $ProjectPath QualityGuard
exit
"@
    $script | winscp /script -
    
} else {
    Write-Host "⚠️  未找到 PuTTY 工具（plink/pscp）" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请选择以下方案之一：" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "方案一：安装 PuTTY（推荐）" -ForegroundColor Green
    Write-Host "1. 下载 PuTTY: https://www.putty.org/" -ForegroundColor White
    Write-Host "2. 安装后，将安装目录添加到系统 PATH" -ForegroundColor White
    Write-Host "3. 重新运行此脚本" -ForegroundColor White
    Write-Host ""
    Write-Host "方案二：使用 WinSCP 图形界面" -ForegroundColor Green
    Write-Host "1. 下载 WinSCP: https://winscp.net/" -ForegroundColor White
    Write-Host "2. 手动上传项目文件夹" -ForegroundColor White
    Write-Host ""
    Write-Host "方案三：压缩后上传" -ForegroundColor Green
    Write-Host "运行: powershell -ExecutionPolicy Bypass -File .\scripts\compress-project.ps1" -ForegroundColor White
    Write-Host "然后使用 WinSCP 上传压缩包" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "3. 上传 SSL 证书..." -ForegroundColor Yellow
$CertFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem"
$KeyFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key"

if ($pscp -and (Test-Path $CertFile) -and (Test-Path $KeyFile)) {
    echo y | pscp -pw $ServerPassword $CertFile "$ServerUser@$ServerIP`:$RemotePath/nginx/ssl/cert.pem"
    echo y | pscp -pw $ServerPassword $KeyFile "$ServerUser@$ServerIP`:$RemotePath/nginx/ssl/key.pem"
    
    # 设置权限
    $setPerms = "chmod 644 $RemotePath/nginx/ssl/cert.pem && chmod 600 $RemotePath/nginx/ssl/key.pem"
    echo y | plink -ssh -pw $ServerPassword "$ServerUser@$ServerIP" $setPerms
    
    Write-Host "✅ SSL 证书上传成功" -ForegroundColor Green
} else {
    Write-Host "⚠️  证书文件未找到或工具不可用，请手动上传" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "上传完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "1. SSH 登录验证: ssh $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "2. cd $RemotePath" -ForegroundColor White
Write-Host "3. ls -la" -ForegroundColor White
Write-Host "4. docker-compose build" -ForegroundColor White
Write-Host "5. docker-compose up -d" -ForegroundColor White
Write-Host ""

