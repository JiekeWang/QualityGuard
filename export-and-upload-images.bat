@echo off
echo ==========================================
echo Export and Upload Docker Images
echo ==========================================
echo.

set SERVER_IP=47.116.197.230
set SERVER_USER=root
set IMAGE_FILE=qualityguard-images.tar

echo Checking Docker status...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)
echo [OK] Docker is running
echo.

echo Checking existing images...
docker images
echo.

echo Pulling required base images...
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
echo Building project images...
docker compose build

echo.
echo Listing all images...
docker images
echo.

echo Exporting images to %IMAGE_FILE%...
docker save -o %IMAGE_FILE% python:3.11-slim node:18-alpine nginx:alpine postgres:14-alpine redis:7-alpine rabbitmq:3-management-alpine minio/minio:latest
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to export images
    pause
    exit /b 1
)

for /f %%i in ('docker images --format "{{.Repository}}:{{.Tag}}" ^| findstr "qualityguard"') do (
    echo Adding project image: %%i
    docker save -o temp.tar %%i
    if %ERRORLEVEL% equ 0 (
        copy /b %IMAGE_FILE% + temp.tar %IMAGE_FILE%
        del temp.tar
    )
)

echo.
echo Checking file size...
dir %IMAGE_FILE%
echo.

echo Uploading to server...
scp %IMAGE_FILE% %SERVER_USER%@%SERVER_IP%:/root/
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Upload failed
    pause
    exit /b 1
)

echo.
echo ==========================================
echo SUCCESS! Images uploaded to server.
echo ==========================================
echo.
echo Next steps on server:
echo 1. SSH to server: ssh %SERVER_USER%@%SERVER_IP%
echo 2. Load images: docker load -i /root/%IMAGE_FILE%
echo 3. Deploy: cd /root/QualityGuard && docker compose up -d
echo.

pause
