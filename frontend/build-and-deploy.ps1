# 构建和部署脚本
Write-Host "=== Step 1: Clean old build files ==="
Remove-Item -Recurse -Force dist,node_modules\.vite -ErrorAction SilentlyContinue
Write-Host "[OK] Clean completed"
Write-Host ""

Write-Host "=== Step 2: Start building ==="
# 尝试找到npm
$npmCmd = $null
# 方法1: 检查PATH中的npm
$npmCheck = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCheck) {
    $npmCmd = "npm"
} else {
    # 方法2: 通过node找到npm
    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCheck) {
        $nodeDir = Split-Path $nodeCheck.Source -Parent
        $npmPath = Join-Path $nodeDir "npm.cmd"
        if (Test-Path $npmPath) {
            $npmCmd = "`"$npmPath`""
        }
    }
    # 方法3: 搜索常见位置
    if (-not $npmCmd) {
        $commonPaths = @(
            "$env:ProgramFiles\nodejs\npm.cmd",
            "${env:ProgramFiles(x86)}\nodejs\npm.cmd",
            "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd"
        )
        foreach ($path in $commonPaths) {
            if (Test-Path $path) {
                $npmCmd = "`"$path`""
                Write-Host "Found npm at: $path"
                break
            }
        }
    }
}

if (-not $npmCmd) {
    Write-Host "[FAIL] npm command not found. Please ensure Node.js is installed."
    Write-Host "You can install Node.js from: https://nodejs.org/"
    Write-Host "Or run this script from a terminal where npm is available (e.g., VS Code terminal, Git Bash)"
    exit 1
}

# 获取Node.js目录并确保node可用
$nodeDir = Split-Path $npmCmd -Parent
$nodeDir = $nodeDir.Trim('"')
$nodeExe = Join-Path $nodeDir "node.exe"

if (-not (Test-Path $nodeExe)) {
    Write-Host "[FAIL] node.exe not found at: $nodeExe"
    exit 1
}

Write-Host "Node.js directory: $nodeDir"
Write-Host "Node.exe: $nodeExe"

# 设置环境变量，确保npm能找到node
$env:PATH = "$nodeDir;$env:PATH"
$env:NODE_PATH = $nodeDir

# 直接使用npm的完整路径
$npmCmdClean = $npmCmd.Trim('"')
Write-Host "Using npm: $npmCmdClean"
Write-Host "Running build..."

# 使用Start-Process来确保环境变量正确传递，或者直接调用
$buildResult = & $npmCmdClean run build 2>&1
$buildOutput = $buildResult | Out-String
Write-Host $buildOutput
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Host "[FAIL] Build failed with exit code: $LASTEXITCODE"
    exit 1
}
Write-Host ""

Write-Host "=== Step 3: Verify build result ==="
Start-Sleep -Seconds 2
if (-not (Test-Path "dist")) {
    Write-Host "[FAIL] dist directory does not exist, build failed"
    exit 1
}
if (-not (Test-Path "dist\assets")) {
    Write-Host "[FAIL] dist\assets directory does not exist, build failed"
    exit 1
}
$jsFile = Get-ChildItem "dist\assets\index-*.js" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $jsFile) {
    Write-Host "[FAIL] Build file not found in dist\assets"
    Write-Host "Files in dist\assets:"
    Get-ChildItem "dist\assets" -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $($_.Name)" }
    exit 1
}

Write-Host "Build file: $($jsFile.Name)"
Write-Host "File size: $([math]::Round($jsFile.Length/1MB, 2)) MB"
Write-Host ""

$content = [System.IO.File]::ReadAllText($jsFile.FullName)
$hasComponent = $content.Contains('DataDriverTable')
$hasKeyTitle = $content.Contains('COLUMN_KEY_TITLE')

Write-Host "验证结果:"
Write-Host "  DataDriverTable: $(if($hasComponent){'[OK]'}else{'[FAIL]'})"
Write-Host "  COLUMN_KEY_TITLE: $(if($hasKeyTitle){'[OK]'}else{'[FAIL]'})"
Write-Host ""

if ($hasComponent) {
    Write-Host "[OK] Component found, starting deployment..."
    Write-Host ""
    
    $env:PATH = "C:\Program Files\Git\usr\bin;" + $env:PATH
    scp -o StrictHostKeyChecking=no index.html root@47.116.197.230:/usr/share/nginx/html/qualityguard/index.html
    scp -o StrictHostKeyChecking=no $jsFile.FullName root@47.116.197.230:/usr/share/nginx/html/qualityguard/assets/$($jsFile.Name)
    
    Write-Host ""
    Write-Host "[OK] Deployment completed!"
    Write-Host "Please clear browser cache and refresh the page to verify"
} else {
    Write-Host "[FAIL] Verification failed, component not found"
    exit 1
}

