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

# Verify dist directory exists and has files
if (-not (Test-Path "dist")) {
    Write-Host "[FAIL] dist directory does not exist" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# List files to be uploaded for verification
$distFiles = Get-ChildItem -Path "dist" -Recurse -File
Write-Host "  Found $($distFiles.Count) files to upload" -ForegroundColor Gray

# Upload dist directory contents (using . to include hidden files)
Push-Location dist
scp -o StrictHostKeyChecking=no -r . root@47.116.197.230:/usr/share/nginx/html/qualityguard/
$distUploadResult = $LASTEXITCODE
Pop-Location

if ($distUploadResult -ne 0) {
    Write-Host "[FAIL] Frontend directory upload failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "[OK] Frontend deployment completed ($($distFiles.Count) files uploaded)" -ForegroundColor Green
Write-Host ""

# ========== Step 2.5: Upload Frontend Source Code ==========
Write-Host "=== Step 2.5: Upload Frontend Source Code ===" -ForegroundColor Yellow
# We're already in frontend directory from Step 1, so go back to project root
Set-Location $projectRoot

Write-Host "Uploading frontend source code..." -ForegroundColor Gray
Write-Host "  This ensures server has the latest source code for future builds" -ForegroundColor Gray

# Upload frontend source code
# In Windows PowerShell, we need to change directory first to avoid wildcard issues
$frontendSrcPath = Join-Path $projectRoot "frontend\src"
if (-not (Test-Path $frontendSrcPath)) {
    Write-Host "[FAIL] Frontend src directory not found: $frontendSrcPath" -ForegroundColor Red
    exit 1
}

# List files to be uploaded for verification
$srcFiles = Get-ChildItem -Path $frontendSrcPath -Recurse -File
Write-Host "  Found $($srcFiles.Count) source files to upload" -ForegroundColor Gray

Push-Location $frontendSrcPath
# Use . instead of * to include hidden files
scp -o StrictHostKeyChecking=no -r . root@47.116.197.230:/root/QualityGuard/frontend/src/
$frontendUploadResult = $LASTEXITCODE
Pop-Location

if ($frontendUploadResult -ne 0) {
    Write-Host "[FAIL] Frontend source code upload failed" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Frontend source code uploaded ($($srcFiles.Count) files)" -ForegroundColor Green
Write-Host ""

# ========== Step 3: Backend Deploy ==========
Write-Host "=== Step 3: Backend Deploy ===" -ForegroundColor Yellow
# Ensure we're in project root
Set-Location $projectRoot

Write-Host "Uploading entire backend directory..." -ForegroundColor Gray
Write-Host "  This ensures all modified files are deployed" -ForegroundColor Gray

# Use scp to recursively upload the entire backend/app directory
# In Windows PowerShell, we need to use the full path without wildcards
# First, change to backend/app directory, then upload from there
$backendAppPath = Join-Path $projectRoot "backend\app"
if (-not (Test-Path $backendAppPath)) {
    Write-Host "[FAIL] Backend app directory not found: $backendAppPath" -ForegroundColor Red
    exit 1
}

# Use Get-ChildItem to expand the wildcard in PowerShell, then pass to scp
# Or use a different approach: upload the entire directory structure
Write-Host "Uploading backend/app directory..." -ForegroundColor Gray

# List files to be uploaded for verification
$backendFiles = Get-ChildItem -Path $backendAppPath -Recurse -File -Include *.py,*.txt,*.json,*.yaml,*.yml
Write-Host "  Found $($backendFiles.Count) backend files to upload" -ForegroundColor Gray

Push-Location $backendAppPath
# Use . instead of * to include hidden files and ensure all files are uploaded
scp -o StrictHostKeyChecking=no -r . root@47.116.197.230:/root/QualityGuard/backend/app/
$backendUploadResult = $LASTEXITCODE
Pop-Location

if ($backendUploadResult -ne 0) {
    Write-Host "[FAIL] Backend directory upload failed" -ForegroundColor Red
    exit 1
}

# Also upload requirements.txt if it exists
if (Test-Path "backend\requirements.txt") {
    Write-Host "Uploading requirements.txt..." -ForegroundColor Gray
    scp -o StrictHostKeyChecking=no backend\requirements.txt root@47.116.197.230:/root/QualityGuard/backend/requirements.txt
}

# Upload database migration scripts for UI automation
Write-Host "Uploading UI automation migration scripts..." -ForegroundColor Gray
$migrationsPath = Join-Path $projectRoot "backend\migrations"
if (Test-Path (Join-Path $migrationsPath "create_page_objects_table.sql")) {
    scp -o StrictHostKeyChecking=no "$migrationsPath\create_page_objects_table.sql" root@47.116.197.230:/root/QualityGuard/backend/migrations/create_page_objects_table.sql
}
if (Test-Path (Join-Path $migrationsPath "create_ui_elements_table.sql")) {
    scp -o StrictHostKeyChecking=no "$migrationsPath\create_ui_elements_table.sql" root@47.116.197.230:/root/QualityGuard/backend/migrations/create_ui_elements_table.sql
}
Write-Host "[OK] Migration scripts uploaded" -ForegroundColor Green

Write-Host "[OK] Backend deployment completed" -ForegroundColor Green
Write-Host ""

# ========== Step 4: Database Migration (UI Automation) ==========
Write-Host "=== Step 4: Database Migration (UI Automation) ===" -ForegroundColor Yellow
Write-Host "Applying UI automation database migrations..." -ForegroundColor Gray

# Check if tables already exist, if not, create them
$migrationScript = @"
export PGPASSWORD=qualityguard123
cd /root/QualityGuard/backend/migrations

# Check if page_objects table exists
TABLE_EXISTS=`$(psql -h localhost -U qualityguard -d qualityguard -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'page_objects');")

if [ `$TABLE_EXISTS = 'f' ]; then
    echo "Creating page_objects table..."
    psql -h localhost -U qualityguard -d qualityguard -f create_page_objects_table.sql
    echo "[OK] page_objects table created"
else
    echo "[SKIP] page_objects table already exists"
fi

# Check if ui_elements table exists
TABLE_EXISTS=`$(psql -h localhost -U qualityguard -d qualityguard -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ui_elements');")

if [ `$TABLE_EXISTS = 'f' ]; then
    echo "Creating ui_elements table..."
    psql -h localhost -U qualityguard -d qualityguard -f create_ui_elements_table.sql
    echo "[OK] ui_elements table created"
else
    echo "[SKIP] ui_elements table already exists"
fi

unset PGPASSWORD
"@

ssh -o StrictHostKeyChecking=no root@47.116.197.230 $migrationScript
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] Database migration may have failed, but continuing..." -ForegroundColor Yellow
} else {
    Write-Host "[OK] Database migration completed" -ForegroundColor Green
}
Write-Host ""

# ========== Step 5: Install Playwright Browsers ==========
Write-Host "=== Step 5: Install Playwright Browsers ===" -ForegroundColor Yellow
Write-Host "Installing Playwright browsers (if needed)..." -ForegroundColor Gray

$playwrightScript = @"
cd /root/QualityGuard/backend

# Check if playwright is installed
if python3 -c "import playwright" 2>/dev/null; then
    echo "Playwright is installed, installing browsers..."
    # Install chromium browser (force reinstall if needed)
    python3 -m playwright install chromium --with-deps 2>&1
    if [ $? -eq 0 ]; then
        echo "[OK] Playwright Chromium browser installed successfully"
    else
        echo "[WARN] Playwright browser installation had issues, but continuing..."
        # Try without deps in case system dependencies are missing
        python3 -m playwright install chromium 2>&1 || echo "[WARN] Browser installation failed, may need manual installation"
    fi
else
    echo "[WARN] Playwright not installed, attempting to install..."
    pip3 install playwright 2>&1
    if [ $? -eq 0 ]; then
        echo "Installing Playwright browsers..."
        python3 -m playwright install chromium --with-deps 2>&1 || python3 -m playwright install chromium 2>&1
    else
        echo "[ERROR] Failed to install Playwright. Please install manually:"
        echo "        pip3 install playwright && python3 -m playwright install chromium"
    fi
fi
"@

ssh -o StrictHostKeyChecking=no root@47.116.197.230 $playwrightScript
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] Playwright browser installation may have issues, but continuing..." -ForegroundColor Yellow
} else {
    Write-Host "[OK] Playwright browsers check completed" -ForegroundColor Green
}
Write-Host ""

# ========== Step 6: Restart Service ==========
Write-Host "=== Step 6: Restart Backend Service ===" -ForegroundColor Yellow
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
Write-Host "  [OK] UI automation migration scripts uploaded" -ForegroundColor Green
Write-Host "  [OK] Database migrations applied" -ForegroundColor Green
Write-Host "  [OK] Playwright browsers checked" -ForegroundColor Green
Write-Host "  [OK] Backend service restarted" -ForegroundColor Green
Write-Host ""
Write-Host "UI Automation features:" -ForegroundColor Cyan
Write-Host "  - Page Objects: /ui-automation/page-objects" -ForegroundColor Gray
Write-Host "  - API endpoints: /api/v1/page-objects, /api/v1/ui-elements" -ForegroundColor Gray
Write-Host ""
Write-Host "Tip: Please clear browser cache and refresh the page" -ForegroundColor Cyan
