# Fix server - Install unzip and extract files
# 修复服务器 - 安装 unzip 并解压文件

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ServerPassword = "232629wh@"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Fix Server - Install unzip and extract" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check for PuTTY
$plink = Get-Command plink -ErrorAction SilentlyContinue
$usePutty = $null -ne $plink

function Invoke-AutoSSH {
    param([string]$Command, [string]$Description)
    
    Write-Host "$Description..." -ForegroundColor Yellow
    
    if ($usePutty) {
        $result = & plink -ssh -pw $ServerPassword "$ServerUser@$ServerIP" $Command 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Success" -ForegroundColor Green
            Write-Host $result -ForegroundColor White
            return $true
        } else {
            Write-Host "[ERROR] Failed" -ForegroundColor Red
            Write-Host $result -ForegroundColor Red
            return $false
        }
    } else {
        $cmd = "echo $ServerPassword | ssh $ServerUser@$ServerIP `"$Command`""
        $result = cmd /c $cmd 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Success" -ForegroundColor Green
            $cleanResult = $result | Where-Object { $_ -notmatch "password" -and $_.Trim() -ne "" }
            if ($cleanResult) { Write-Host $cleanResult -ForegroundColor White }
            return $true
        } else {
            Write-Host "[ERROR] Failed" -ForegroundColor Red
            $cleanResult = $result | Where-Object { $_ -notmatch "password" -and $_.Trim() -ne "" }
            if ($cleanResult) { Write-Host $cleanResult -ForegroundColor Red }
            return $false
        }
    }
}

# Step 1: Install unzip
Write-Host "Step 1: Installing unzip..." -ForegroundColor Cyan
$installCmd = "if command -v yum &> /dev/null; then yum install -y unzip; elif command -v apt-get &> /dev/null; then apt-get update && apt-get install -y unzip; else echo 'Please install unzip manually'; fi"
Invoke-AutoSSH -Command $installCmd -Description "Installing unzip"
Start-Sleep -Seconds 2

# Step 2: Extract zip file
Write-Host ""
Write-Host "Step 2: Extracting zip file..." -ForegroundColor Cyan
$extractCmd = "cd /root; unzip -o QualityGuard-deploy.zip -d QualityGuard"
Invoke-AutoSSH -Command $extractCmd -Description "Extracting files"
Start-Sleep -Seconds 1

# Step 3: Create directories
Write-Host ""
Write-Host "Step 3: Creating directories..." -ForegroundColor Cyan
$mkdirCmd = "cd /root/QualityGuard; mkdir -p nginx/ssl; ls -la"
Invoke-AutoSSH -Command $mkdirCmd -Description "Creating directories"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "[SUCCESS] Server fixed!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Now you can upload certificates using:" -ForegroundColor Cyan
Write-Host "  powershell -ExecutionPolicy Bypass -File .\UPLOAD.ps1" -ForegroundColor White
Write-Host ""

