# Upload SSL Certificates Only
# 仅上传 SSL 证书

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ServerPassword = "232629wh@"

# Certificate file paths
$CertFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem"
$KeyFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key"

# Remote paths
$RemoteCertPath = "/root/QualityGuard/nginx/ssl/cert.pem"
$RemoteKeyPath = "/root/QualityGuard/nginx/ssl/key.pem"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Upload SSL Certificates Only" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Server: $ServerUser@$ServerIP" -ForegroundColor White
Write-Host ""

# Check for PuTTY
$plink = Get-Command plink -ErrorAction SilentlyContinue
$pscp = Get-Command pscp -ErrorAction SilentlyContinue
$usePutty = ($null -ne $plink) -and ($null -ne $pscp)

function Invoke-AutoSCP {
    param([string]$LocalFile, [string]$RemoteFile, [string]$Description)
    
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "$Description" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    if (-not (Test-Path $LocalFile)) {
        Write-Host "[ERROR] File not found: $LocalFile" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Local:  $LocalFile" -ForegroundColor White
    Write-Host "Remote: $RemoteFile" -ForegroundColor White
    Write-Host ""
    
    if ($usePutty) {
        Write-Host "Using PuTTY (pscp)..." -ForegroundColor Yellow
        $result = & pscp -pw $ServerPassword "$LocalFile" "${ServerUser}@${ServerIP}:${RemoteFile}" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Upload successful" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[ERROR] Upload failed" -ForegroundColor Red
            Write-Host $result -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "Using OpenSSH (scp)..." -ForegroundColor Yellow
        Write-Host "Please enter password when prompted: $ServerPassword" -ForegroundColor Yellow
        $result = scp "$LocalFile" "${ServerUser}@${ServerIP}:${RemoteFile}" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Upload successful" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[ERROR] Upload failed" -ForegroundColor Red
            $cleanResult = $result | Where-Object { $_ -notmatch "password" -and $_.Trim() -ne "" }
            if ($cleanResult) { Write-Host $cleanResult -ForegroundColor Red }
            return $false
        }
    }
}

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
        Write-Host "Please enter password when prompted: $ServerPassword" -ForegroundColor Yellow
        $result = ssh "$ServerUser@$ServerIP" $Command 2>&1
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

# Step 1: Upload certificate
Write-Host ""
Write-Host "Step 1/3: Upload certificate file" -ForegroundColor Cyan
$step1 = Invoke-AutoSCP -LocalFile $CertFile -RemoteFile $RemoteCertPath -Description "Upload certificate"
Start-Sleep -Seconds 1

# Step 2: Upload private key
if ($step1) {
    Write-Host ""
    Write-Host "Step 2/3: Upload private key file" -ForegroundColor Cyan
    $step2 = Invoke-AutoSCP -LocalFile $KeyFile -RemoteFile $RemoteKeyPath -Description "Upload private key"
    Start-Sleep -Seconds 1
} else {
    Write-Host "[WARNING] Step 1 failed, skipping step 2" -ForegroundColor Yellow
    $step2 = $false
}

# Step 3: Set file permissions
if ($step2) {
    Write-Host ""
    Write-Host "Step 3/3: Set file permissions" -ForegroundColor Cyan
    $permCmd = "chmod 644 $RemoteCertPath; chmod 600 $RemoteKeyPath; ls -la /root/QualityGuard/nginx/ssl/"
    $step3 = Invoke-AutoSSH -Command $permCmd -Description "Set permissions and verify"
} else {
    Write-Host "[WARNING] Step 2 failed, skipping step 3" -ForegroundColor Yellow
    $step3 = $false
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
if ($step1 -and $step2 -and $step3) {
    Write-Host "[SUCCESS] All certificates uploaded!" -ForegroundColor Green
} else {
    Write-Host "[PARTIAL] Some steps failed" -ForegroundColor Yellow
}
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. SSH login: ssh $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "2. cd /root/QualityGuard" -ForegroundColor White
Write-Host "3. docker-compose build" -ForegroundColor White
Write-Host "4. docker-compose up -d" -ForegroundColor White
Write-Host ""

