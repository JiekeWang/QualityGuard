# SSL 证书交互式上传脚本

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "QualityGuard SSL 证书上传工具" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 证书文件路径
$CertPath = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx"
$CertFile = "$CertPath\zhihome.com.cn.pem"
$KeyFile = "$CertPath\zhihome.com.cn.key"

# 检查证书文件
if (-not (Test-Path $CertFile)) {
    Write-Host "❌ 错误: 证书文件不存在: $CertFile" -ForegroundColor Red
    Write-Host "请确认证书文件已解压到: $CertPath" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $KeyFile)) {
    Write-Host "❌ 错误: 私钥文件不存在: $KeyFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 证书文件检查通过" -ForegroundColor Green
Write-Host "  证书文件: $CertFile" -ForegroundColor Gray
Write-Host "  私钥文件: $KeyFile" -ForegroundColor Gray
Write-Host ""

# 获取服务器信息
Write-Host "请输入服务器信息：" -ForegroundColor Yellow
$ServerIP = Read-Host "服务器IP地址"
if ([string]::IsNullOrWhiteSpace($ServerIP)) {
    Write-Host "❌ 服务器IP不能为空" -ForegroundColor Red
    exit 1
}

$ServerUser = Read-Host "SSH用户名 (默认: root)" 
if ([string]::IsNullOrWhiteSpace($ServerUser)) {
    $ServerUser = "root"
}

$ProjectPath = Read-Host "项目路径 (默认: /root/QualityGuard)"
if ([string]::IsNullOrWhiteSpace($ProjectPath)) {
    $ProjectPath = "/root/QualityGuard"
}

Write-Host ""
Write-Host "配置信息：" -ForegroundColor Cyan
Write-Host "  服务器: $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "  项目路径: $ProjectPath" -ForegroundColor White
Write-Host ""

# 检查 scp 命令
$scpPath = Get-Command scp -ErrorAction SilentlyContinue
if (-not $scpPath) {
    Write-Host "⚠️  未找到 scp 命令" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Windows 10/11 可以安装 OpenSSH 客户端：" -ForegroundColor Cyan
    Write-Host "  设置 → 应用 → 可选功能 → 添加功能 → OpenSSH 客户端" -ForegroundColor White
    Write-Host ""
    Write-Host "或者使用以下方法手动上传：" -ForegroundColor Yellow
    Write-Host "  1. 使用 WinSCP: https://winscp.net/" -ForegroundColor White
    Write-Host "  2. 将文件上传到: $ProjectPath/nginx/ssl/" -ForegroundColor White
    Write-Host "     - zhihome.com.cn.pem → cert.pem" -ForegroundColor White
    Write-Host "     - zhihome.com.cn.key → key.pem" -ForegroundColor White
    Write-Host ""
    exit 0
}

# 测试 SSH 连接
Write-Host "测试 SSH 连接..." -ForegroundColor Yellow
$testConnection = ssh -o ConnectTimeout=5 -o BatchMode=yes "$ServerUser@$ServerIP" "echo 'connected'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  SSH 密钥认证失败，将使用密码认证" -ForegroundColor Yellow
    Write-Host "   请准备好服务器密码" -ForegroundColor Yellow
    Write-Host ""
}

# 创建远程目录
Write-Host "创建远程目录: $ProjectPath/nginx/ssl/" -ForegroundColor Yellow
ssh "$ServerUser@$ServerIP" "mkdir -p $ProjectPath/nginx/ssl"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 无法连接到服务器或创建目录" -ForegroundColor Red
    Write-Host "   请检查：" -ForegroundColor Yellow
    Write-Host "   1. 服务器IP是否正确" -ForegroundColor White
    Write-Host "   2. SSH服务是否运行" -ForegroundColor White
    Write-Host "   3. 用户名和密码是否正确" -ForegroundColor White
    exit 1
}

# 上传证书文件
Write-Host ""
Write-Host "上传证书文件..." -ForegroundColor Yellow
scp $CertFile "$ServerUser@$ServerIP`:$ProjectPath/nginx/ssl/cert.pem"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 证书文件上传失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 证书文件上传成功" -ForegroundColor Green

# 上传私钥文件
Write-Host "上传私钥文件..." -ForegroundColor Yellow
scp $KeyFile "$ServerUser@$ServerIP`:$ProjectPath/nginx/ssl/key.pem"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 私钥文件上传失败" -ForegroundColor Red
    exit 1
}
Write-Host "✅ 私钥文件上传成功" -ForegroundColor Green

# 设置文件权限
Write-Host ""
Write-Host "设置文件权限..." -ForegroundColor Yellow
ssh "$ServerUser@$ServerIP" "chmod 644 $ProjectPath/nginx/ssl/cert.pem && chmod 600 $ProjectPath/nginx/ssl/key.pem"
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  权限设置可能失败，请手动检查" -ForegroundColor Yellow
} else {
    Write-Host "✅ 文件权限设置成功" -ForegroundColor Green
}

# 验证文件
Write-Host ""
Write-Host "验证上传的文件..." -ForegroundColor Yellow
$verifyResult = ssh "$ServerUser@$ServerIP" "ls -la $ProjectPath/nginx/ssl/ && openssl x509 -in $ProjectPath/nginx/ssl/cert.pem -noout -subject -dates 2>&1"
Write-Host $verifyResult

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ 证书上传完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作：" -ForegroundColor Cyan
Write-Host "1. SSH 登录服务器: ssh $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "2. 进入项目目录: cd $ProjectPath" -ForegroundColor White
Write-Host "3. 构建服务: docker-compose build" -ForegroundColor White
Write-Host "4. 启动服务: docker-compose up -d" -ForegroundColor White
Write-Host "5. 查看日志: docker-compose logs -f nginx" -ForegroundColor White
Write-Host "6. 测试访问: https://zhihome.com.cn" -ForegroundColor White
Write-Host ""

