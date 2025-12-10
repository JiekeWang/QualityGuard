# 改进的上传脚本 - 使用更友好的交互方式

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ServerPassword = "232629wh@"
$ZipFile = "D:\QualityGuard-deploy.zip"
$CertFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem"
$KeyFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "自动上传脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "服务器: $ServerUser@$ServerIP" -ForegroundColor White
Write-Host ""

# 检查文件
if (-not (Test-Path $ZipFile)) {
    Write-Host "创建压缩包..." -ForegroundColor Yellow
    Compress-Archive -Path "D:\QualityGuard\*" -DestinationPath $ZipFile -Force
}

if (-not (Test-Path $ZipFile)) {
    Write-Host "❌ 压缩包创建失败" -ForegroundColor Red
    exit 1
}

$size = (Get-Item $ZipFile).Length / 1MB
Write-Host "✅ 压缩包: $ZipFile ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
Write-Host ""

# 使用函数简化命令执行
function Execute-Command {
    param(
        [string]$Command,
        [string]$Description,
        [string]$Password = $ServerPassword
    )
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "$Description" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "命令: $Command" -ForegroundColor White
    Write-Host "密码: $Password" -ForegroundColor Gray
    Write-Host ""
    Write-Host "⚠️  请在密码提示时输入上面的密码，然后按 Enter" -ForegroundColor Yellow
    Write-Host ""
    
    # 执行命令
    Invoke-Expression $Command
    
    Write-Host ""
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $Description 完成" -ForegroundColor Green
    } else {
        Write-Host "❌ $Description 失败 (退出码: $LASTEXITCODE)" -ForegroundColor Red
    }
    Write-Host ""
}

# 执行上传步骤
Write-Host "开始上传，共 5 个步骤" -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 上传压缩包
Execute-Command `
    -Command "scp `"$ZipFile`" $ServerUser@$ServerIP`:/root/" `
    -Description "步骤 1/5: 上传压缩包"

# 步骤 2: 解压
Execute-Command `
    -Command "ssh $ServerUser@$ServerIP `"cd /root && unzip -o QualityGuard-deploy.zip -d QualityGuard && cd QualityGuard && mkdir -p nginx/ssl && ls -la`"" `
    -Description "步骤 2/5: 在服务器上解压并创建目录"

# 步骤 3: 上传证书
if (Test-Path $CertFile) {
    Execute-Command `
        -Command "scp `"$CertFile`" $ServerUser@$ServerIP`:/root/QualityGuard/nginx/ssl/cert.pem" `
        -Description "步骤 3/5: 上传证书文件"
    
    # 步骤 4: 上传私钥
    if (Test-Path $KeyFile) {
        Execute-Command `
            -Command "scp `"$KeyFile`" $ServerUser@$ServerIP`:/root/QualityGuard/nginx/ssl/key.pem" `
            -Description "步骤 4/5: 上传私钥文件"
        
        # 步骤 5: 设置权限
        Execute-Command `
            -Command "ssh $ServerUser@$ServerIP `"chmod 644 /root/QualityGuard/nginx/ssl/cert.pem && chmod 600 /root/QualityGuard/nginx/ssl/key.pem && ls -la /root/QualityGuard/nginx/ssl/`"" `
            -Description "步骤 5/5: 设置文件权限"
    } else {
        Write-Host "⚠️  私钥文件未找到: $KeyFile" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  证书文件未找到: $CertFile" -ForegroundColor Yellow
    Write-Host "请手动上传证书文件" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ 上传流程完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "验证部署：" -ForegroundColor Cyan
Write-Host "  ssh $ServerUser@$ServerIP `"cd /root/QualityGuard && ls -la && ls -la nginx/ssl/`"" -ForegroundColor White
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "1. SSH 登录: ssh $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "2. cd /root/QualityGuard" -ForegroundColor White
Write-Host "3. docker-compose build" -ForegroundColor White
Write-Host "4. docker-compose up -d" -ForegroundColor White
Write-Host "5. docker-compose logs -f nginx" -ForegroundColor White
Write-Host ""

