# 上传压缩包到服务器

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ServerPassword = "232629wh@"
$ZipFile = "D:\QualityGuard-deploy.zip"
$RemotePath = "/root"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "上传项目压缩包到服务器" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $ZipFile)) {
    Write-Host "❌ 压缩包不存在，请先运行压缩脚本" -ForegroundColor Red
    Write-Host "   powershell -ExecutionPolicy Bypass -File .\scripts\compress-project.ps1" -ForegroundColor Yellow
    exit 1
}

$fileSize = (Get-Item $ZipFile).Length / 1MB
Write-Host "压缩包信息：" -ForegroundColor Cyan
Write-Host "  文件: $ZipFile" -ForegroundColor White
Write-Host "  大小: $([math]::Round($fileSize, 2)) MB" -ForegroundColor White
Write-Host ""

# 检查工具
$plink = Get-Command plink -ErrorAction SilentlyContinue
$pscp = Get-Command pscp -ErrorAction SilentlyContinue

if ($plink -and $pscp) {
    Write-Host "使用 PuTTY 工具上传..." -ForegroundColor Yellow
    
    # 上传压缩包
    Write-Host "正在上传压缩包（可能需要几分钟）..." -ForegroundColor Yellow
    echo y | pscp -pw $ServerPassword $ZipFile "$ServerUser@$ServerIP`:$RemotePath/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ 压缩包上传成功" -ForegroundColor Green
        
        # 在服务器上解压
        Write-Host "在服务器上解压..." -ForegroundColor Yellow
        $unzipCmd = "cd $RemotePath && unzip -o QualityGuard-deploy.zip -d QualityGuard && cd QualityGuard && mkdir -p nginx/ssl && chmod 644 nginx/ssl/cert.pem 2>/dev/null; chmod 600 nginx/ssl/key.pem 2>/dev/null; echo 'Deployment complete'"
        echo y | plink -ssh -pw $ServerPassword "$ServerUser@$ServerIP" $unzipCmd
        
        Write-Host "✅ 解压完成" -ForegroundColor Green
    } else {
        Write-Host "❌ 上传失败" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  未找到 PuTTY 工具" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请使用 WinSCP 手动上传：" -ForegroundColor Cyan
    Write-Host "1. 打开 WinSCP" -ForegroundColor White
    Write-Host "2. 连接到: $ServerUser@$ServerIP (密码: $ServerPassword)" -ForegroundColor White
    Write-Host "3. 上传文件: $ZipFile 到 /root/" -ForegroundColor White
    Write-Host "4. SSH 登录服务器执行：" -ForegroundColor White
    Write-Host "   cd /root" -ForegroundColor Yellow
    Write-Host "   unzip -o QualityGuard-deploy.zip -d QualityGuard" -ForegroundColor Yellow
    Write-Host "   cd QualityGuard" -ForegroundColor Yellow
    Write-Host "   mkdir -p nginx/ssl" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

