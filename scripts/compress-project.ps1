# 压缩项目文件以便上传

$ProjectPath = "D:\QualityGuard"
$OutputFile = "D:\QualityGuard-deploy.zip"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "压缩项目文件" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 排除不需要的文件
$ExcludeItems = @(
    "node_modules",
    ".git",
    "__pycache__",
    "*.pyc",
    ".pytest_cache",
    "venv",
    "env",
    ".env",
    "dist",
    "build",
    ".DS_Store",
    "Thumbs.db"
)

Write-Host "正在压缩项目..." -ForegroundColor Yellow
Write-Host "源目录: $ProjectPath" -ForegroundColor White
Write-Host "输出文件: $OutputFile" -ForegroundColor White
Write-Host ""

# 压缩文件
Compress-Archive -Path "$ProjectPath\*" -DestinationPath $OutputFile -Force

if (Test-Path $OutputFile) {
    $fileSize = (Get-Item $OutputFile).Length / 1MB
    Write-Host "✅ 压缩完成！" -ForegroundColor Green
    Write-Host "文件大小: $([math]::Round($fileSize, 2)) MB" -ForegroundColor White
    Write-Host "文件位置: $OutputFile" -ForegroundColor White
    Write-Host ""
    Write-Host "下一步：" -ForegroundColor Cyan
    Write-Host "1. 使用 WinSCP 上传 $OutputFile 到服务器的 /root/" -ForegroundColor White
    Write-Host "2. SSH 登录服务器执行：" -ForegroundColor White
    Write-Host "   cd /root" -ForegroundColor Yellow
    Write-Host "   unzip QualityGuard-deploy.zip -d QualityGuard" -ForegroundColor Yellow
    Write-Host "   cd QualityGuard" -ForegroundColor Yellow
    Write-Host "   mkdir -p nginx/ssl" -ForegroundColor Yellow
} else {
    Write-Host "❌ 压缩失败" -ForegroundColor Red
}

