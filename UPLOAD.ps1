# Auto Upload Script - Using batch file method for reliable password input
# 使用批处理文件方法实现可靠的密码自动输入

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ServerPassword = "232629wh@"
$ZipFile = "D:\QualityGuard-deploy.zip"
$CertFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem"
$KeyFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Auto Upload Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Server: $ServerUser@$ServerIP" -ForegroundColor White
Write-Host ""

# Check for PuTTY tools first (best option)
$plink = Get-Command plink -ErrorAction SilentlyContinue
$pscp = Get-Command pscp -ErrorAction SilentlyContinue

if ($plink -and $pscp) {
    Write-Host "[OK] Using PuTTY tools - Password handled automatically" -ForegroundColor Green
    $usePutty = $true
} else {
    Write-Host "[INFO] Using batch file method for password input" -ForegroundColor Yellow
    $usePutty = $false
}
Write-Host ""

# Check and create zip file
if (-not (Test-Path $ZipFile)) {
    Write-Host "Creating zip file..." -ForegroundColor Yellow
    Compress-Archive -Path "D:\QualityGuard\*" -DestinationPath $ZipFile -Force
}

if (Test-Path $ZipFile) {
    $size = (Get-Item $ZipFile).Length / 1MB
    Write-Host "[OK] Zip file: $ZipFile ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to create zip file" -ForegroundColor Red
    exit 1
}

# Function: Upload file
function Invoke-AutoSCP {
    param(
        [string]$LocalFile,
        [string]$RemoteFile,
        [string]$Description
    )
    
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "$Description" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    if (-not (Test-Path $LocalFile)) {
        Write-Host "[ERROR] File not found: $LocalFile" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Uploading..." -ForegroundColor Yellow
    
    try {
        if ($usePutty) {
            # Use pscp with -pw
            $result = & pscp -pw $ServerPassword "`"$LocalFile`"", "$ServerUser@$ServerIP`:$RemoteFile" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Upload successful" -ForegroundColor Green
                return $true
            } else {
                Write-Host "[ERROR] Upload failed" -ForegroundColor Red
                $result | Where-Object { $_ -notmatch "password" } | Write-Host -ForegroundColor Red
                return $false
            }
        } else {
            # Use cmd with echo pipe
            $cmd = "echo $ServerPassword | scp `"$LocalFile`" $ServerUser@$ServerIP`:$RemoteFile"
            $result = cmd /c $cmd 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Upload successful" -ForegroundColor Green
                return $true
            } else {
                Write-Host "[ERROR] Upload failed" -ForegroundColor Red
                $result | Where-Object { $_ -notmatch "password" -and $_ -notmatch "Password" } | Write-Host -ForegroundColor Red
                return $false
            }
        }
    } catch {
        Write-Host "[ERROR] Exception: $_" -ForegroundColor Red
        return $false
    }
}

# Function: Execute SSH command
function Invoke-AutoSSH {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "$Description" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "Executing..." -ForegroundColor Yellow
    
    try {
        if ($usePutty) {
            # Use plink with -pw
            $result = & plink -ssh -pw $ServerPassword "$ServerUser@$ServerIP" $Command 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Command executed successfully" -ForegroundColor Green
                Write-Host $result -ForegroundColor White
                return $true
            } else {
                Write-Host "[ERROR] Command failed" -ForegroundColor Red
                Write-Host $result -ForegroundColor Red
                return $false
            }
        } else {
            # Use cmd with echo pipe
            $cmd = "echo $ServerPassword | ssh $ServerUser@$ServerIP `"$Command`""
            $result = cmd /c $cmd 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Command executed successfully" -ForegroundColor Green
                $cleanResult = $result | Where-Object { $_ -notmatch "password" -and $_ -notmatch "Password" -and $_.Trim() -ne "" }
                if ($cleanResult) { Write-Host $cleanResult -ForegroundColor White }
                return $true
            } else {
                Write-Host "[ERROR] Command failed" -ForegroundColor Red
                $cleanResult = $result | Where-Object { $_ -notmatch "password" -and $_ -notmatch "Password" -and $_.Trim() -ne "" }
                if ($cleanResult) { Write-Host $cleanResult -ForegroundColor Red }
                return $false
            }
        }
    } catch {
        Write-Host "[ERROR] Exception: $_" -ForegroundColor Red
        return $false
    }
}

# Execute upload steps
Write-Host ""
Write-Host "Starting upload process (5 steps)" -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload zip file
$step1 = Invoke-AutoSCP -LocalFile $ZipFile -RemoteFile "/root/" -Description "Step 1/5: Upload zip file"
Start-Sleep -Seconds 1

# Step 2: Install unzip if needed, then extract and create directories
if ($step1) {
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "Step 2/5: Install unzip and extract" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    # Install unzip (try yum first, then apt-get)
    Write-Host "Installing unzip..." -ForegroundColor Yellow
    $installCmd = "if command -v yum &> /dev/null; then yum install -y unzip 2>&1; elif command -v apt-get &> /dev/null; then apt-get update -qq && apt-get install -y unzip 2>&1; else echo 'Please install unzip manually'; fi"
    Invoke-AutoSSH -Command $installCmd -Description "Installing unzip" | Out-Null
    Start-Sleep -Seconds 3
    
    # Extract and create directories
    Write-Host "Extracting files..." -ForegroundColor Yellow
    $sshCmd2 = "cd /root; unzip -o QualityGuard-deploy.zip -d QualityGuard 2>&1; cd QualityGuard; mkdir -p nginx/ssl; ls -la"
    $step2 = Invoke-AutoSSH -Command $sshCmd2 -Description "Extract and create directories"
    Start-Sleep -Seconds 1
} else {
    Write-Host "[WARNING] Step 1 failed, skipping step 2" -ForegroundColor Yellow
    $step2 = $false
}

# Step 3: Upload certificate
if ($step2 -and (Test-Path $CertFile)) {
    $step3 = Invoke-AutoSCP -LocalFile $CertFile -RemoteFile "/root/QualityGuard/nginx/ssl/cert.pem" -Description "Step 3/5: Upload certificate file"
    Start-Sleep -Seconds 1
    
    # Step 4: Upload private key
    if ($step3 -and (Test-Path $KeyFile)) {
        $step4 = Invoke-AutoSCP -LocalFile $KeyFile -RemoteFile "/root/QualityGuard/nginx/ssl/key.pem" -Description "Step 4/5: Upload private key file"
        Start-Sleep -Seconds 1
        
        # Step 5: Set permissions
        if ($step4) {
            $sshCmd5 = "chmod 644 /root/QualityGuard/nginx/ssl/cert.pem; chmod 600 /root/QualityGuard/nginx/ssl/key.pem; ls -la /root/QualityGuard/nginx/ssl/"
            $step5 = Invoke-AutoSSH -Command $sshCmd5 -Description "Step 5/5: Set file permissions"
        }
    } else {
        Write-Host "[WARNING] Private key file not found: $KeyFile" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARNING] Certificate file not found: $CertFile" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "[SUCCESS] Upload process completed!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verifying deployment..." -ForegroundColor Cyan
Invoke-AutoSSH -Command "cd /root/QualityGuard; ls -la; echo '---'; ls -la nginx/ssl/" -Description "Verifying files"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. SSH login: ssh $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "2. cd /root/QualityGuard" -ForegroundColor White
Write-Host "3. docker-compose build" -ForegroundColor White
Write-Host "4. docker-compose up -d" -ForegroundColor White
Write-Host ""
