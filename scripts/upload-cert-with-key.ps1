# 使用 SSH 密钥上传证书（如果已配置密钥）

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ProjectPath = "/root/QualityGuard"
$CertFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem"
$KeyFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "上传 SSL 证书到服务器" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "服务器: $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "项目路径: $ProjectPath" -ForegroundColor White
Write-Host ""

# 检查文件
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

# 创建远程目录
Write-Host "1. 创建远程目录..." -ForegroundColor Yellow
ssh "$ServerUser@$ServerIP" "mkdir -p $ProjectPath/nginx/ssl"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 无法连接到服务器" -ForegroundColor Red
    Write-Host "   如果使用密码认证，请手动执行以下命令：" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   ssh $ServerUser@$ServerIP" -ForegroundColor Cyan
    Write-Host "   mkdir -p $ProjectPath/nginx/ssl" -ForegroundColor Cyan
    Write-Host "   exit" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   然后运行: .\scripts\upload-cert-manual.ps1" -ForegroundColor Yellow
    exit 1
}

# 上传证书文件
Write-Host "2. 上传证书文件..." -ForegroundColor Yellow
scp $CertFile "$ServerUser@$ServerIP`:$ProjectPath/nginx/ssl/cert.pem"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 证书文件上传失败" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ 证书文件上传成功" -ForegroundColor Green

# 上传私钥文件
Write-Host "3. 上传私钥文件..." -ForegroundColor Yellow
scp $KeyFile "$ServerUser@$ServerIP`:$ProjectPath/nginx/ssl/key.pem"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 私钥文件上传失败" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ 私钥文件上传成功" -ForegroundColor Green

# 设置文件权限
Write-Host "4. 设置文件权限..." -ForegroundColor Yellow
ssh "$ServerUser@$ServerIP" "chmod 644 $ProjectPath/nginx/ssl/cert.pem && chmod 600 $ProjectPath/nginx/ssl/key.pem"
Write-Host "   ✅ 文件权限设置成功" -ForegroundColor Green

# 验证
Write-Host ""
Write-Host "5. 验证上传的文件..." -ForegroundColor Yellow
ssh "$ServerUser@$ServerIP" "ls -la $ProjectPath/nginx/ssl/ && echo '' && openssl x509 -in $ProjectPath/nginx/ssl/cert.pem -noout -subject -dates 2>&1"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ 证书上传完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "1. SSH 登录: ssh $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "2. cd $ProjectPath" -ForegroundColor White
Write-Host "3. docker-compose build" -ForegroundColor White
Write-Host "4. docker-compose up -d" -ForegroundColor White
Write-Host "5. docker-compose logs -f nginx" -ForegroundColor White
Write-Host ""

