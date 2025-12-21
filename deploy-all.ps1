# Full deployment script (frontend + backend)
# Includes: frontend build, frontend deploy, backend deploy, service restart

# Set console output encoding to UTF-8 to avoid encoding issues
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# Navigate to project root directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = $scriptPath
# If script is in project root, use current directory; otherwise try to find project root
if (-not (Test-Path (Join-Path $projectRoot "frontend"))) {
    # Try to find project root by going up from current directory
    $currentDir = Get-Location
    while ($currentDir.Path -ne $currentDir.Drive.Root) {
        if (Test-Path (Join-Path $currentDir.Path "frontend")) {
            $projectRoot = $currentDir.Path
            break
        }
        $currentDir = Split-Path $currentDir.Path -Parent
    }
}
Set-Location $projectRoot
Write-Host "Current working directory: $(Get-Location)" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Full Deployment (Frontend + Backend)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ========== Step 1: Frontend Build ==========
Write-Host "=== Step 1: Frontend Build ===" -ForegroundColor Yellow
Set-Location frontend

# Clean old build files
Write-Host "Cleaning old build files..." -ForegroundColor Gray
Remove-Item -Recurse -Force dist,node_modules\.vite -ErrorAction SilentlyContinue

# Find npm
$npmPath = $null
$npmCheck = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCheck) {
    $npmPath = $npmCheck.Source
} else {
    $nodeCheck = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCheck) {
        $nodeDir = Split-Path $nodeCheck.Source -Parent
        $npmPath = Join-Path $nodeDir "npm.cmd"
        if (-not (Test-Path $npmPath)) {
            $npmPath = $null
        }
    }
    if (-not $npmPath) {
        $commonPaths = @(
            "$env:ProgramFiles\nodejs\npm.cmd",
            "${env:ProgramFiles(x86)}\nodejs\npm.cmd",
            "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd"
        )
        foreach ($path in $commonPaths) {
            if (Test-Path $path) {
                $npmPath = $path
                break
            }
        }
    }
}

if (-not $npmPath) {
    Write-Host "[FAIL] npm not found, please ensure Node.js is installed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Ensure node is in PATH
$nodeDir = Split-Path $npmPath -Parent
if ($nodeDir -and (Test-Path $nodeDir)) {
    $env:PATH = "$nodeDir;$env:PATH"
}

# Execute build
Write-Host "Running npm run build..." -ForegroundColor Gray
Write-Host "Using npm: $npmPath" -ForegroundColor Gray

# Function to remove ANSI escape sequences (color codes)
function Remove-AnsiEscape {
    param([string]$text)
    # Remove ANSI escape sequences (ESC[ followed by numbers and letters)
    $text -replace '\x1B\[[0-9;]*[a-zA-Z]', ''
}

# Run build and capture output
# Use & operator with the path directly (no quotes needed)
$buildResult = & $npmPath run build 2>&1
$buildOutput = $buildResult | Out-String

# Remove ANSI escape sequences and display clean output
$cleanOutput = Remove-AnsiEscape -text $buildOutput
Write-Host $cleanOutput

if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Host "[FAIL] Frontend build failed, exit code: $LASTEXITCODE" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Verify build result
Start-Sleep -Seconds 2
if (-not (Test-Path "dist")) {
    Write-Host "[FAIL] dist directory does not exist, build failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

$jsFile = Get-ChildItem "dist\assets\index-*.js" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $jsFile) {
    Write-Host "[FAIL] Build file not found" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "[OK] Frontend build completed: $($jsFile.Name)" -ForegroundColor Green
Write-Host ""

# ========== Step 2: Frontend Deploy ==========
Write-Host "=== Step 2: Frontend Deploy ===" -ForegroundColor Yellow
$env:PATH = "C:\Program Files\Git\usr\bin;" + $env:PATH

# Upload entire dist directory to ensure all files are deployed
# This includes index.html, all JS chunks, CSS files, and other assets
Write-Host "Uploading entire dist directory..." -ForegroundColor Gray
Write-Host "  This ensures all build artifacts (JS chunks, CSS, assets) are deployed" -ForegroundColor Gray
scp -o StrictHostKeyChecking=no -r dist/* root@47.116.197.230:/usr/share/nginx/html/qualityguard/
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Frontend directory upload failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "[OK] Frontend deployment completed" -ForegroundColor Green
Write-Host ""

# ========== Step 3: Backend Deploy ==========
Write-Host "=== Step 3: Backend Deploy ===" -ForegroundColor Yellow
Set-Location ..

Write-Host "Uploading entire backend directory..." -ForegroundColor Gray
Write-Host "  This ensures all modified files are deployed" -ForegroundColor Gray

# Use scp to recursively upload the entire backend/app directory
# This avoids missing any modified files
scp -o StrictHostKeyChecking=no -r backend/app/* root@47.116.197.230:/root/QualityGuard/backend/app/
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Backend directory upload failed" -ForegroundColor Red
    exit 1
}

# Also upload requirements.txt if it exists
if (Test-Path "backend\requirements.txt") {
    Write-Host "Uploading requirements.txt..." -ForegroundColor Gray
    scp -o StrictHostKeyChecking=no backend\requirements.txt root@47.116.197.230:/root/QualityGuard/backend/requirements.txt
}

Write-Host "[OK] Backend deployment completed" -ForegroundColor Green
Write-Host ""

# ========== Step 4: Restart Service ==========
Write-Host "=== Step 4: Restart Backend Service ===" -ForegroundColor Yellow
Write-Host "Restarting service and checking status..." -ForegroundColor Gray
ssh -o StrictHostKeyChecking=no root@47.116.197.230 'systemctl restart qualityguard-backend && systemctl status qualityguard-backend --no-pager'
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Service restart failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  [SUCCESS] Deployment completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deployment summary:" -ForegroundColor Yellow
Write-Host "  [OK] Frontend built and deployed" -ForegroundColor Green
Write-Host "  [OK] Backend file uploaded" -ForegroundColor Green
Write-Host "  [OK] Backend service restarted" -ForegroundColor Green
Write-Host ""
Write-Host "Tip: Please clear browser cache and refresh the page" -ForegroundColor Cyan
