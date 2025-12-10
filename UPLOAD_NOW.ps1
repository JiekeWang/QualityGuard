# 一键上传脚本 - 请按提示输入密码
# 密码: 232629wh@

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$Password = "232629wh@"
$ZipFile = "D:\QualityGuard-deploy.zip"
$CertFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem"
$KeyFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "一键上传脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "服务器: $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "密码: $Password" -ForegroundColor Gray
Write-Host ""

# 检查文件
if (-not (Test-Path $ZipFile)) {
    Write-Host "创建压缩包..." -ForegroundColor Yellow
    Compress-Archive -Path "D:\QualityGuard\*" -DestinationPath $ZipFile -Force
}

Write-Host "请按顺序执行以下命令，每次输入密码: $Password" -ForegroundColor Yellow
Write-Host ""

Write-Host "命令 1: 上传压缩包" -ForegroundColor Cyan
Write-Host "scp `"$ZipFile`" $ServerUser@$ServerIP`:/root/" -ForegroundColor Yellow
Write-Host ""
$cmd1 = Read-Host "按 Enter 执行命令 1（或输入 skip 跳过）"
if ($cmd1 -ne "skip") {
    scp $ZipFile "$ServerUser@$ServerIP`:/root/"
}

Write-Host ""
Write-Host "命令 2: 在服务器上解压" -ForegroundColor Cyan
Write-Host "ssh $ServerUser@$ServerIP `"cd /root && unzip -o QualityGuard-deploy.zip -d QualityGuard && cd QualityGuard && mkdir -p nginx/ssl`"" -ForegroundColor Yellow
Write-Host ""
$cmd2 = Read-Host "按 Enter 执行命令 2（或输入 skip 跳过）"
if ($cmd2 -ne "skip") {
    ssh "$ServerUser@$ServerIP" "cd /root && unzip -o QualityGuard-deploy.zip -d QualityGuard && cd QualityGuard && mkdir -p nginx/ssl && ls -la"
}

if (Test-Path $CertFile -and Test-Path $KeyFile) {
    Write-Host ""
    Write-Host "命令 3: 上传证书文件" -ForegroundColor Cyan
    Write-Host "scp `"$CertFile`" $ServerUser@$ServerIP`:/root/QualityGuard/nginx/ssl/cert.pem" -ForegroundColor Yellow
    Write-Host ""
    $cmd3 = Read-Host "按 Enter 执行命令 3（或输入 skip 跳过）"
    if ($cmd3 -ne "skip") {
        scp $CertFile "$ServerUser@$ServerIP`:/root/QualityGuard/nginx/ssl/cert.pem"
    }

    Write-Host ""
    Write-Host "命令 4: 上传私钥文件" -ForegroundColor Cyan
    Write-Host "scp `"$KeyFile`" $ServerUser@$ServerIP`:/root/QualityGuard/nginx/ssl/key.pem" -ForegroundColor Yellow
    Write-Host ""
    $cmd4 = Read-Host "按 Enter 执行命令 4（或输入 skip 跳过）"
    if ($cmd4 -ne "skip") {
        scp $KeyFile "$ServerUser@$ServerIP`:/root/QualityGuard/nginx/ssl/key.pem"
    }

    Write-Host ""
    Write-Host "命令 5: 设置文件权限" -ForegroundColor Cyan
    Write-Host "ssh $ServerUser@$ServerIP `"chmod 644 /root/QualityGuard/nginx/ssl/cert.pem && chmod 600 /root/QualityGuard/nginx/ssl/key.pem`"" -ForegroundColor Yellow
    Write-Host ""
    $cmd5 = Read-Host "按 Enter 执行命令 5（或输入 skip 跳过）"
    if ($cmd5 -ne "skip") {
        ssh "$ServerUser@$ServerIP" "chmod 644 /root/QualityGuard/nginx/ssl/cert.pem && chmod 600 /root/QualityGuard/nginx/ssl/key.pem && ls -la /root/QualityGuard/nginx/ssl/"
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ 上传完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "1. SSH 登录: ssh $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "2. cd /root/QualityGuard" -ForegroundColor White
Write-Host "3. docker-compose build" -ForegroundColor White
Write-Host "4. docker-compose up -d" -ForegroundColor White
Write-Host ""

