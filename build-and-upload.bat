@echo off
echo ==========================================
echo Build and Upload Docker Images
echo ==========================================
echo.

echo Step 1: Building images...
echo This may take 10-30 minutes...
docker compose build
if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo Step 2: Listing images...
docker images | findstr "qualityguard postgres redis rabbitmq minio nginx"

echo.
echo Step 3: Exporting images...
docker save -o qualityguard-images.tar qualityguard-backend:latest qualityguard-frontend:latest postgres:14-alpine redis:7-alpine rabbitmq:3-management-alpine minio/minio:latest nginx:alpine
if errorlevel 1 (
    echo [ERROR] Export failed
    pause
    exit /b 1
)

echo.
echo Step 4: Uploading to server...
echo Please enter password when prompted: 232629wh@
scp qualityguard-images.tar root@47.116.197.230:/root/
if errorlevel 1 (
    echo [ERROR] Upload failed
    pause
    exit /b 1
)

echo.
echo ==========================================
echo [SUCCESS] Images uploaded!
echo ==========================================
echo.
echo Next steps on server:
echo 1. SSH login: ssh root@47.116.197.230
echo 2. Load images: docker load -i /root/qualityguard-images.tar
echo 3. cd /root/QualityGuard
echo 4. docker compose up -d
echo.
pause

