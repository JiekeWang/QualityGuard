# 使用 PowerShell 上传项目到服务器

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ServerPassword = "232629wh@"
$ProjectPath = "D:\QualityGuard"
$RemotePath = "/root/QualityGuard"
$ZipFile = "D:\QualityGuard-deploy.zip"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "使用 PowerShell 上传项目" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "服务器: $ServerUser@$ServerIP" -ForegroundColor White
Write-Host ""

# 检查压缩包
if (-not (Test-Path $ZipFile)) {
    Write-Host "压缩包不存在，正在创建..." -ForegroundColor Yellow
    Compress-Archive -Path "$ProjectPath\*" -DestinationPath $ZipFile -Force
}

if (Test-Path $ZipFile) {
    $size = (Get-Item $ZipFile).Length / 1MB
    Write-Host "✅ 压缩包已准备: $ZipFile ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "❌ 压缩包创建失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "正在上传压缩包..." -ForegroundColor Yellow
Write-Host "（需要输入服务器密码: $ServerPassword）" -ForegroundColor Gray
Write-Host ""

# 使用 scp 上传（需要手动输入密码）
# 由于 PowerShell 的 scp 不支持直接传递密码，我们需要使用其他方法

# 方法：使用 ssh 创建目录，然后使用 scp 上传
Write-Host "1. 创建远程目录..." -ForegroundColor Yellow
$createDirCmd = "ssh $ServerUser@$ServerIP 'mkdir -p $RemotePath/nginx/ssl'"
Write-Host "执行: $createDirCmd" -ForegroundColor Gray
Write-Host "（请在提示时输入密码: $ServerPassword）" -ForegroundColor Yellow
Invoke-Expression $createDirCmd

Write-Host ""
Write-Host "2. 上传压缩包..." -ForegroundColor Yellow
$uploadCmd = "scp '$ZipFile' $ServerUser@$ServerIP`:/root/QualityGuard-deploy.zip"
Write-Host "执行: $uploadCmd" -ForegroundColor Gray
Write-Host "（请在提示时输入密码: $ServerPassword）" -ForegroundColor Yellow
Invoke-Expression $uploadCmd

Write-Host ""
Write-Host "3. 在服务器上解压..." -ForegroundColor Yellow
$unzipCmd = "ssh $ServerUser@$ServerIP 'cd /root && unzip -o QualityGuard-deploy.zip -d QualityGuard && cd QualityGuard && mkdir -p nginx/ssl && ls -la'"
Write-Host "执行: $unzipCmd" -ForegroundColor Gray
Write-Host "（请在提示时输入密码: $ServerPassword）" -ForegroundColor Yellow
Invoke-Expression $unzipCmd

Write-Host ""
Write-Host "4. 上传 SSL 证书..." -ForegroundColor Yellow
$CertFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem"
$KeyFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key"

if (Test-Path $CertFile) {
    $uploadCert = "scp '$CertFile' $ServerUser@$ServerIP`:$RemotePath/nginx/ssl/cert.pem"
    Write-Host "上传证书文件..." -ForegroundColor Gray
    Write-Host "（请在提示时输入密码: $ServerPassword）" -ForegroundColor Yellow
    Invoke-Expression $uploadCert
}

if (Test-Path $KeyFile) {
    $uploadKey = "scp '$KeyFile' $ServerUser@$ServerIP`:$RemotePath/nginx/ssl/key.pem"
    Write-Host "上传私钥文件..." -ForegroundColor Gray
    Write-Host "（请在提示时输入密码: $ServerPassword）" -ForegroundColor Yellow
    Invoke-Expression $uploadKey
}

Write-Host ""
Write-Host "5. 设置文件权限..." -ForegroundColor Yellow
$setPerms = "ssh $ServerUser@$ServerIP 'chmod 644 $RemotePath/nginx/ssl/cert.pem && chmod 600 $RemotePath/nginx/ssl/key.pem && ls -la $RemotePath/nginx/ssl/'"
Write-Host "（请在提示时输入密码: $ServerPassword）" -ForegroundColor Yellow
Invoke-Expression $setPerms

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ 上传完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "1. SSH 登录: ssh $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "2. cd $RemotePath" -ForegroundColor White
Write-Host "3. docker-compose build" -ForegroundColor White
Write-Host "4. docker-compose up -d" -ForegroundColor White
Write-Host ""

