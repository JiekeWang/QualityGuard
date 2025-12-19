# QualityGuard Project Docker Deployment Script
# Build images locally and upload to server

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ServerPassword = "232629wh@"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "QualityGuard Docker Deployment to Server" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
Write-Host "Step 1: Checking Docker status..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker is not running, please start Docker Desktop" -ForegroundColor Red
    Write-Host "Restart this script after Docker Desktop is running" -ForegroundColor Yellow
    Read-Host "Press any key to exit"
    exit 1
}
Write-Host "[OK] Docker is running" -ForegroundColor Green
Write-Host ""

# Build images
Write-Host "Step 2: Building project images..." -ForegroundColor Yellow
Write-Host "This may take 10-30 minutes..." -ForegroundColor Gray
docker compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Image build failed" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}
Write-Host "[OK] Images built successfully" -ForegroundColor Green
Write-Host ""

# List built images
Write-Host "Step 3: Listing built images..." -ForegroundColor Yellow
docker images | Select-String "qualityguard|REPOSITORY"
Write-Host ""

# Export images
Write-Host "Step 4: Exporting images..." -ForegroundColor Yellow
$imageFile = "qualityguard-images.tar"

# Get list of images to export
$images = @()
$imageList = docker images --format "{{.Repository}}:{{.Tag}}" | Select-String "qualityguard|postgres|redis|rabbitmq|minio|nginx"
foreach ($img in $imageList) {
    $images += $img.ToString().Trim()
}

# If no project images found, export base images only
if ($images.Count -eq 0) {
    Write-Host "No project images found, exporting base images..." -ForegroundColor Yellow
    $baseImages = @("postgres:14-alpine", "redis:7-alpine", "rabbitmq:3-management-alpine", "minio/minio:latest", "nginx:alpine", "python:3.11-slim", "node:18-alpine")

    # Pull base images
    foreach ($img in $baseImages) {
        Write-Host "Pulling image: $img" -ForegroundColor Gray
        docker pull $img
        if ($LASTEXITCODE -eq 0) {
            $images += $img
        }
    }
}

if ($images.Count -eq 0) {
    Write-Host "[ERROR] No images found" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

Write-Host "Images to export: $($images -join ', ')" -ForegroundColor Gray
Write-Host "Exporting to file: $imageFile" -ForegroundColor Gray

docker save -o $imageFile $images
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Export failed" -ForegroundColor Red
    Read-Host "Press any key to exit"
    exit 1
}

$fileSize = (Get-Item $imageFile).Length / 1GB
Write-Host "[OK] Images exported: $imageFile ($([math]::Round($fileSize, 2)) GB)" -ForegroundColor Green
Write-Host ""

# Upload to server
Write-Host "Step 5: Uploading to server..." -ForegroundColor Yellow
Write-Host "Server: $ServerIP" -ForegroundColor Gray
Write-Host "Uploading file: $imageFile" -ForegroundColor Gray
Write-Host "This may take several minutes..." -ForegroundColor Gray

scp $imageFile "${ServerUser}@${ServerIP}:/root/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Upload failed" -ForegroundColor Red
    Write-Host "Please check network connection or server status" -ForegroundColor Yellow
    Read-Host "Press any key to exit"
    exit 1
}
Write-Host "[OK] Upload successful" -ForegroundColor Green
Write-Host ""

# Compress project files
Write-Host "Step 6: Compressing project files..." -ForegroundColor Yellow
$projectZip = "qualityguard-project.zip"
Write-Host "Compressing to: $projectZip" -ForegroundColor Gray

# Exclude unnecessary files
$exclude = @(".git", "node_modules", "*.log", ".DS_Store", "qualityguard-images.tar")
$excludeString = $exclude -join ","

# Use 7zip or PowerShell compression
if (Get-Command 7z -ErrorAction SilentlyContinue) {
    7z a -tzip $projectZip . -x!$excludeString
} else {
    # Use PowerShell compression
    $compress = @{
        Path = Get-ChildItem -Path "." -Exclude $exclude
        CompressionLevel = "Optimal"
        DestinationPath = $projectZip
    }
    Compress-Archive @compress
}

if ($LASTEXITCODE -eq 0) {
    $zipSize = (Get-Item $projectZip).Length / 1MB
    Write-Host "[OK] Project compressed: $projectZip ($([math]::Round($zipSize, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Project compression failed, will upload directory directly" -ForegroundColor Yellow
    $projectZip = $null
}
Write-Host ""

# Upload project files
Write-Host "Step 7: Uploading project files..." -ForegroundColor Yellow
if ($projectZip) {
    Write-Host "Uploading archive: $projectZip" -ForegroundColor Gray
    scp $projectZip "${ServerUser}@${ServerIP}:/root/"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Project files uploaded successfully" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Project files upload failed" -ForegroundColor Red
    }
} else {
    Write-Host "Skipping project files upload (compression failed)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Local preparation completed!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps: Execute these commands on the server:" -ForegroundColor Yellow
Write-Host ""
Write-Host "# 1. SSH login to server" -ForegroundColor White
Write-Host "ssh $ServerUser@$ServerIP" -ForegroundColor White
Write-Host ""
Write-Host "# 2. Load images" -ForegroundColor White
Write-Host "docker load -i /root/$imageFile" -ForegroundColor White
Write-Host ""
if ($projectZip) {
    Write-Host "# 3. Extract project files" -ForegroundColor White
    Write-Host "cd /root" -ForegroundColor White
    Write-Host "unzip $projectZip -d QualityGuard" -ForegroundColor White
    Write-Host ""
}
Write-Host "# 4. Enter project directory and start services" -ForegroundColor White
Write-Host "cd /root/QualityGuard" -ForegroundColor White
Write-Host "docker compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "# 5. Check service status" -ForegroundColor White
Write-Host "docker compose ps" -ForegroundColor White
Write-Host "docker compose logs -f" -ForegroundColor White
Write-Host ""

Read-Host "Press any key to continue..."
