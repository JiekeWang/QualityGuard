# 测试部署脚本（不实际执行部署操作）
# 用于验证脚本逻辑和依赖

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  部署脚本测试（模拟执行）" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allChecksPassed = $true

# ========== 检查1: 目录结构 ==========
Write-Host "=== 检查1: 目录结构 ===" -ForegroundColor Yellow
if (Test-Path "frontend") {
    Write-Host "  [OK] frontend 目录存在" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] frontend 目录不存在" -ForegroundColor Red
    $allChecksPassed = $false
}

if (Test-Path "backend") {
    Write-Host "  [OK] backend 目录存在" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] backend 目录不存在" -ForegroundColor Red
    $allChecksPassed = $false
}

if (Test-Path "deploy-all.ps1") {
    Write-Host "  [OK] deploy-all.ps1 脚本存在" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] deploy-all.ps1 脚本不存在" -ForegroundColor Red
    $allChecksPassed = $false
}
Write-Host ""

# ========== 检查2: 前端文件 ==========
Write-Host "=== 检查2: 前端文件 ===" -ForegroundColor Yellow
if (Test-Path "frontend\package.json") {
    Write-Host "  [OK] package.json 存在" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] package.json 不存在" -ForegroundColor Red
    $allChecksPassed = $false
}

if (Test-Path "frontend\vite.config.ts") {
    Write-Host "  [OK] vite.config.ts 存在" -ForegroundColor Green
} else {
    Write-Host "  [WARN] vite.config.ts 不存在" -ForegroundColor Yellow
}
Write-Host ""

# ========== 检查3: 后端文件 ==========
Write-Host "=== 检查3: 后端文件 ===" -ForegroundColor Yellow
if (Test-Path "backend\app\api\v1\test_executions.py") {
    Write-Host "  [OK] test_executions.py 存在" -ForegroundColor Green
    $fileInfo = Get-Item "backend\app\api\v1\test_executions.py"
    Write-Host "  文件大小: $([math]::Round($fileInfo.Length/1KB, 2)) KB" -ForegroundColor Gray
} else {
    Write-Host "  [FAIL] test_executions.py 不存在" -ForegroundColor Red
    $allChecksPassed = $false
}
Write-Host ""

# ========== 检查4: 依赖工具 ==========
Write-Host "=== 检查4: 依赖工具 ===" -ForegroundColor Yellow

# 检查 npm
$npmCheck = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCheck) {
    Write-Host "  [OK] npm 可用: $($npmCheck.Source)" -ForegroundColor Green
} else {
    Write-Host "  [WARN] npm 未找到，需要安装 Node.js" -ForegroundColor Yellow
    Write-Host "    尝试查找常见位置..." -ForegroundColor Gray
    $commonPaths = @(
        "$env:ProgramFiles\nodejs\npm.cmd",
        "${env:ProgramFiles(x86)}\nodejs\npm.cmd",
        "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd"
    )
    $found = $false
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            Write-Host "    [找到] $path" -ForegroundColor Green
            $found = $true
            break
        }
    }
    if (-not $found) {
        Write-Host "    [未找到] 请安装 Node.js" -ForegroundColor Red
    }
}

# 检查 scp
$env:PATH = "C:\Program Files\Git\usr\bin;" + $env:PATH
$scpCheck = Get-Command scp -ErrorAction SilentlyContinue
if ($scpCheck) {
    Write-Host "  [OK] scp 可用: $($scpCheck.Source)" -ForegroundColor Green
} else {
    Write-Host "  [WARN] scp 未找到，需要安装 Git" -ForegroundColor Yellow
    Write-Host "    尝试查找 Git 安装位置..." -ForegroundColor Gray
    $gitPaths = @(
        "C:\Program Files\Git\usr\bin\scp.exe",
        "C:\Program Files (x86)\Git\usr\bin\scp.exe"
    )
    $found = $false
    foreach ($path in $gitPaths) {
        if (Test-Path $path) {
            Write-Host "    [找到] $path" -ForegroundColor Green
            $found = $true
            break
        }
    }
    if (-not $found) {
        Write-Host "    [未找到] 请安装 Git for Windows" -ForegroundColor Red
    }
}

# 检查 ssh
$sshCheck = Get-Command ssh -ErrorAction SilentlyContinue
if ($sshCheck) {
    Write-Host "  [OK] ssh 可用: $($sshCheck.Source)" -ForegroundColor Green
} else {
    Write-Host "  [WARN] ssh 未找到" -ForegroundColor Yellow
}
Write-Host ""

# ========== 模拟执行流程 ==========
Write-Host "=== 模拟执行流程 ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "步骤1: 前端构建" -ForegroundColor Cyan
Write-Host "  [模拟] cd frontend" -ForegroundColor Gray
Write-Host "  [模拟] Remove-Item -Recurse -Force dist,node_modules\.vite" -ForegroundColor Gray
Write-Host "  [模拟] npm run build" -ForegroundColor Gray
Write-Host "  [模拟] 查找构建产物: dist\assets\index-*.js" -ForegroundColor Gray
Write-Host ""

Write-Host "步骤2: 前端部署" -ForegroundColor Cyan
Write-Host "  [模拟] scp dist\index.html root@47.116.197.230:/usr/share/nginx/html/qualityguard/index.html" -ForegroundColor Gray
Write-Host "  [模拟] scp dist\assets\index-*.js root@47.116.197.230:/usr/share/nginx/html/qualityguard/assets/" -ForegroundColor Gray
Write-Host ""

Write-Host "步骤3: 后端部署" -ForegroundColor Cyan
Write-Host "  [模拟] scp backend\app\api\v1\test_executions.py root@47.116.197.230:/root/QualityGuard/backend/app/api/v1/" -ForegroundColor Gray
Write-Host ""

Write-Host "步骤4: 重启服务" -ForegroundColor Cyan
Write-Host "  [模拟] ssh root@47.116.197.230 'systemctl restart qualityguard-backend'" -ForegroundColor Gray
Write-Host "  [模拟] ssh root@47.116.197.230 'systemctl status qualityguard-backend --no-pager'" -ForegroundColor Gray
Write-Host ""

# ========== 总结 ==========
Write-Host "========================================" -ForegroundColor Cyan
if ($allChecksPassed) {
    Write-Host "  [SUCCESS] 所有检查通过！" -ForegroundColor Green
    Write-Host "  可以执行: .\deploy-all.ps1" -ForegroundColor Cyan
} else {
    Write-Host "  [WARNING] 部分检查未通过" -ForegroundColor Yellow
    Write-Host "  请修复问题后重试" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

