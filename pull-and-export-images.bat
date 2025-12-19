@echo off
echo ==========================================
echo Pull Images and Export for Upload
echo ==========================================
echo.

set IMAGES_FILE=qualityguard-images.tar
set SERVER_IP=47.116.197.230
set SERVER_USER=root

echo Waiting for Docker to be ready...
timeout /t 10 /nobreak > nul

:check_docker
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Docker is not ready yet, waiting...
    timeout /t 5 /nobreak > nul
    goto check_docker
)

echo [OK] Docker is running
echo.

echo Step 1: Pulling required images...

echo Pulling python:3.11-slim...
docker pull python:3.11-slim

echo Pulling node:18-alpine...
docker pull node:18-alpine

echo Pulling nginx:alpine...
docker pull nginx:alpine

echo Pulling postgres:14-alpine...
docker pull postgres:14-alpine

echo Pulling redis:7-alpine...
docker pull redis:7-alpine

echo Pulling rabbitmq:3-management-alpine...
docker pull rabbitmq:3-management-alpine

echo Pulling minio/minio:latest...
docker pull minio/minio:latest

echo.
echo Step 2: Listing pulled images...
docker images

echo.
echo Step 3: Exporting images to %IMAGES_FILE%...
docker save -o %IMAGES_FILE% python:3.11-slim node:18-alpine nginx:alpine postgres:14-alpine redis:7-alpine rabbitmq:3-management-alpine minio/minio:latest

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to export images
    pause
    exit /b 1
)

for %%A in ("%IMAGES_FILE%") do set FILE_SIZE=%%~zA
set /a FILE_SIZE_MB=%FILE_SIZE%/1048576
echo [OK] Images exported to %IMAGES_FILE% (%FILE_SIZE_MB% MB)
echo.

echo Step 4: Uploading to server...
scp %IMAGES_FILE% %SERVER_USER%@%SERVER_IP%:/root/

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Upload failed
    pause
    exit /b 1
)

echo [OK] Upload successful
echo.

echo ==========================================
echo SUCCESS!
echo ==========================================
echo.
echo Images uploaded to: %SERVER_IP%:/root/%IMAGES_FILE%
echo.
echo Next steps on server:
echo 1. SSH to server: ssh %SERVER_USER%@%SERVER_IP%
echo 2. Load images: docker load -i /root/%IMAGES_FILE%
echo 3. Run deployment: cd /root/QualityGuard && ./final-deploy.sh
echo.

pause
