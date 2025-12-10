# 快速上传指南

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ServerPassword = "232629wh@"
$ProjectPath = "/root/QualityGuard"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "SSL 证书快速上传指南" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "方案一：使用 WinSCP（推荐，最简单）" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "1. 下载 WinSCP: https://winscp.net/" -ForegroundColor White
Write-Host "2. 安装并打开 WinSCP" -ForegroundColor White
Write-Host "3. 点击 '新建站点'，填写：" -ForegroundColor White
Write-Host "   文件协议: SFTP" -ForegroundColor Cyan
Write-Host "   主机名: $ServerIP" -ForegroundColor Cyan
Write-Host "   端口号: 22" -ForegroundColor Cyan
Write-Host "   用户名: $ServerUser" -ForegroundColor Cyan
Write-Host "   密码: $ServerPassword" -ForegroundColor Cyan
Write-Host "4. 点击 '保存' 然后 '登录'" -ForegroundColor White
Write-Host "5. 连接后：" -ForegroundColor White
Write-Host "   左侧（本地）: C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\" -ForegroundColor Yellow
Write-Host "   右侧（服务器）: $ProjectPath/nginx/ssl/" -ForegroundColor Yellow
Write-Host "   如果 nginx/ssl 目录不存在，右键创建" -ForegroundColor White
Write-Host "6. 上传文件并重命名：" -ForegroundColor White
Write-Host "   zhihome.com.cn.pem → 右键重命名为 cert.pem" -ForegroundColor Cyan
Write-Host "   zhihome.com.cn.key → 右键重命名为 key.pem" -ForegroundColor Cyan
Write-Host "7. 设置权限（右键文件 → 属性 → 权限）：" -ForegroundColor White
Write-Host "   cert.pem → 644 (rw-r--r--)" -ForegroundColor Cyan
Write-Host "   key.pem → 600 (rw-------)" -ForegroundColor Cyan
Write-Host ""

Write-Host "方案二：在服务器上直接操作" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "1. 使用 WinSCP 将证书文件上传到服务器的 /tmp/ 目录" -ForegroundColor White
Write-Host "2. SSH 登录服务器：" -ForegroundColor White
Write-Host "   ssh $ServerUser@$ServerIP" -ForegroundColor Cyan
Write-Host "   密码: $ServerPassword" -ForegroundColor Cyan
Write-Host "3. 执行以下命令：" -ForegroundColor White
Write-Host ""
Write-Host "   cd $ProjectPath" -ForegroundColor Yellow
Write-Host "   mkdir -p nginx/ssl" -ForegroundColor Yellow
Write-Host "   cp /tmp/zhihome.com.cn.pem nginx/ssl/cert.pem" -ForegroundColor Yellow
Write-Host "   cp /tmp/zhihome.com.cn.key nginx/ssl/key.pem" -ForegroundColor Yellow
Write-Host "   chmod 644 nginx/ssl/cert.pem" -ForegroundColor Yellow
Write-Host "   chmod 600 nginx/ssl/key.pem" -ForegroundColor Yellow
Write-Host "   ls -la nginx/ssl/" -ForegroundColor Yellow
Write-Host "   openssl x509 -in nginx/ssl/cert.pem -noout -subject -dates" -ForegroundColor Yellow
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "服务器信息：" -ForegroundColor Cyan
Write-Host "  IP: $ServerIP" -ForegroundColor White
Write-Host "  用户: $ServerUser" -ForegroundColor White
Write-Host "  密码: $ServerPassword" -ForegroundColor White
Write-Host "  项目路径: $ProjectPath" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  安全提示：使用后请删除此脚本中的密码！" -ForegroundColor Red
Write-Host ""

