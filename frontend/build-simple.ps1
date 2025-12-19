# 简化版构建脚本 - 直接使用完整路径
$nodeDir = "C:\Program Files\nodejs"
$npmPath = Join-Path $nodeDir "npm.cmd"
$nodePath = Join-Path $nodeDir "node.exe"

if (-not (Test-Path $npmPath)) {
    Write-Host "[FAIL] npm.cmd not found at: $npmPath"
    exit 1
}

if (-not (Test-Path $nodePath)) {
    Write-Host "[FAIL] node.exe not found at: $nodePath"
    exit 1
}

Write-Host "=== Step 1: Clean ==="
Remove-Item -Recurse -Force dist,node_modules\.vite -ErrorAction SilentlyContinue
Write-Host "[OK] Clean completed"
Write-Host ""

Write-Host "=== Step 2: Build ==="
Write-Host "Using npm: $npmPath"
Write-Host "Using node: $nodePath"
Write-Host ""

# 设置环境变量
$env:PATH = "$nodeDir;$env:PATH"

# 运行构建
& $npmPath run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Build failed"
    exit 1
}

Write-Host ""
Write-Host "=== Step 3: Verify ==="
$jsFile = Get-ChildItem "dist\assets\index-*.js" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $jsFile) {
    Write-Host "[FAIL] Build file not found"
    exit 1
}

Write-Host "Build file: $($jsFile.Name)"
$content = [System.IO.File]::ReadAllText($jsFile.FullName)
$hasComponent = $content.Contains('DataDriverTable')

Write-Host "DataDriverTable found: $hasComponent"
Write-Host ""

if ($hasComponent) {
    Write-Host "=== Step 4: Deploy ==="
    $env:PATH = "C:\Program Files\Git\usr\bin;$env:PATH"
    cd dist
    scp -o StrictHostKeyChecking=no index.html root@47.116.197.230:/usr/share/nginx/html/qualityguard/index.html
    scp -o StrictHostKeyChecking=no $jsFile.FullName root@47.116.197.230:/usr/share/nginx/html/qualityguard/assets/$($jsFile.Name)
    Write-Host "[OK] Deployment completed!"
} else {
    Write-Host "[FAIL] Component not found in build"
    exit 1
}

