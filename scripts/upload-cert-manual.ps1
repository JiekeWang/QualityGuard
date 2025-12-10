# 手动上传证书指南（需要密码时使用）

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ProjectPath = "/root/QualityGuard"
$CertFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem"
$KeyFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "手动上传 SSL 证书指南" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "由于需要密码认证，请按以下步骤操作：" -ForegroundColor Yellow
Write-Host ""

Write-Host "方法一：使用 WinSCP（推荐，图形界面）" -ForegroundColor Green
Write-Host "1. 下载 WinSCP: https://winscp.net/" -ForegroundColor White
Write-Host "2. 安装并打开 WinSCP" -ForegroundColor White
Write-Host "3. 新建连接：" -ForegroundColor White
Write-Host "   文件协议: SFTP" -ForegroundColor Cyan
Write-Host "   主机名: $ServerIP" -ForegroundColor Cyan
Write-Host "   用户名: $ServerUser" -ForegroundColor Cyan
Write-Host "   密码: [你的服务器密码]" -ForegroundColor Cyan
Write-Host "4. 连接后，左侧选择本地目录：" -ForegroundColor White
Write-Host "   $CertFile" -ForegroundColor Yellow
Write-Host "5. 右侧导航到服务器目录：" -ForegroundColor White
Write-Host "   $ProjectPath/nginx/ssl/" -ForegroundColor Yellow
Write-Host "   如果目录不存在，右键创建" -ForegroundColor White
Write-Host "6. 上传文件并重命名：" -ForegroundColor White
Write-Host "   zhihome.com.cn.pem → cert.pem" -ForegroundColor Cyan
Write-Host "   zhihome.com.cn.key → key.pem" -ForegroundColor Cyan
Write-Host "7. 设置权限（右键文件 → 属性 → 权限）：" -ForegroundColor White
Write-Host "   cert.pem → 644" -ForegroundColor Cyan
Write-Host "   key.pem → 600" -ForegroundColor Cyan
Write-Host ""

Write-Host "方法二：在服务器上直接操作" -ForegroundColor Green
Write-Host "1. 将证书文件通过其他方式传到服务器（如通过 WinSCP 上传到 /tmp/）" -ForegroundColor White
Write-Host "2. SSH 登录服务器：" -ForegroundColor White
Write-Host "   ssh $ServerUser@$ServerIP" -ForegroundColor Cyan
Write-Host "3. 执行以下命令：" -ForegroundColor White
Write-Host ""
Write-Host "   cd $ProjectPath" -ForegroundColor Yellow
Write-Host "   mkdir -p nginx/ssl" -ForegroundColor Yellow
Write-Host "   # 如果文件在 /tmp/ 目录" -ForegroundColor Gray
Write-Host "   cp /tmp/zhihome.com.cn.pem nginx/ssl/cert.pem" -ForegroundColor Yellow
Write-Host "   cp /tmp/zhihome.com.cn.key nginx/ssl/key.pem" -ForegroundColor Yellow
Write-Host "   chmod 644 nginx/ssl/cert.pem" -ForegroundColor Yellow
Write-Host "   chmod 600 nginx/ssl/key.pem" -ForegroundColor Yellow
Write-Host "   # 验证" -ForegroundColor Gray
Write-Host "   ls -la nginx/ssl/" -ForegroundColor Yellow
Write-Host "   openssl x509 -in nginx/ssl/cert.pem -noout -subject -dates" -ForegroundColor Yellow
Write-Host ""

Write-Host "方法三：配置 SSH 密钥（推荐，以后无需密码）" -ForegroundColor Green
Write-Host "1. 生成 SSH 密钥（如果还没有）：" -ForegroundColor White
Write-Host "   ssh-keygen -t ed25519 -C `"your_email@example.com`"" -ForegroundColor Cyan
Write-Host "2. 复制公钥到服务器：" -ForegroundColor White
Write-Host "   type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh $ServerUser@$ServerIP `"mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys`"" -ForegroundColor Cyan
Write-Host "3. 配置后，可以使用 .\scripts\upload-cert-with-key.ps1 自动上传" -ForegroundColor White
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "证书文件位置：" -ForegroundColor Cyan
Write-Host "  证书: $CertFile" -ForegroundColor White
Write-Host "  私钥: $KeyFile" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

