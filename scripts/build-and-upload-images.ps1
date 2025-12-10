# Build Docker images locally and upload to server
# 本地构建 Docker 镜像并上传到服务器

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ServerPassword = "232629wh@"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Build and Upload Docker Images" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running locally
Write-Host "Step 1: Checking local Docker..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker is not running locally" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Docker is running" -ForegroundColor Green
Write-Host ""

# Build images
Write-Host "Step 2: Building images locally..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Gray
docker compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Images built successfully" -ForegroundColor Green
Write-Host ""

# List images
Write-Host "Step 3: Listing built images..." -ForegroundColor Yellow
docker images | Select-String "qualityguard|REPOSITORY"
Write-Host ""

# Export images
Write-Host "Step 4: Exporting images..." -ForegroundColor Yellow
$imageFile = "qualityguard-images.tar"
Write-Host "Exporting to $imageFile..." -ForegroundColor Gray

# Get image names
$images = @()
$imageList = docker images --format "{{.Repository}}:{{.Tag}}" | Select-String "qualityguard|postgres|redis|rabbitmq|minio|nginx"
foreach ($img in $imageList) {
    $images += $img.ToString().Trim()
}

if ($images.Count -eq 0) {
    Write-Host "[ERROR] No images found" -ForegroundColor Red
    exit 1
}

Write-Host "Images to export: $($images -join ', ')" -ForegroundColor Gray
docker save -o $imageFile $images
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Export failed" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $imageFile).Length / 1GB
Write-Host "[OK] Images exported: $imageFile ($([math]::Round($fileSize, 2)) GB)" -ForegroundColor Green
Write-Host ""

# Upload to server
Write-Host "Step 5: Uploading to server..." -ForegroundColor Yellow
Write-Host "This may take a while depending on file size..." -ForegroundColor Gray
scp $imageFile "${ServerUser}@${ServerIP}:/root/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Upload failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Upload successful" -ForegroundColor Green
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Images uploaded!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps on server:" -ForegroundColor Yellow
Write-Host "1. SSH login: ssh $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "2. Load images: docker load -i /root/$imageFile" -ForegroundColor White
Write-Host "3. cd /root/QualityGuard" -ForegroundColor White
Write-Host "4. docker compose up -d" -ForegroundColor White
Write-Host ""

