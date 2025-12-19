@echo off
echo ==========================================
echo Check and Export Existing Images
echo ==========================================
echo.

set SERVER_IP=47.116.197.230
set SERVER_USER=root
set IMAGE_FILE=qualityguard-images.tar

echo Checking Docker status...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop first.
    echo.
    echo Alternatively, if you have existing image files, we can upload them directly.
    echo Looking for existing .tar files...
    dir *.tar 2>nul
    if %ERRORLEVEL% equ 0 (
        echo Found existing .tar files. Do you want to upload them?
        set /p choice="Upload existing files? (y/n): "
        if /i "!choice!"=="y" (
            goto :upload_existing
        )
    )
    pause
    exit /b 1
)
echo [OK] Docker is running
echo.

echo Checking existing images...
docker images
echo.

echo Looking for project images...
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | findstr "qualityguard"
if %ERRORLEVEL% equ 0 (
    echo Found project images! Exporting...
    goto :export_images
) else (
    echo No project images found. Checking base images...
    docker images --format "table {{.Repository}}\t{{.Tag}}" | findstr "python\|node\|nginx\|postgres\|redis\|rabbitmq\|minio"
    if %ERRORLEVEL% equ 0 (
        echo Found some base images. Exporting available images...
        goto :export_images
    ) else (
        echo No relevant images found. Pulling required images...
        goto :pull_images
    )
)

:export_images
echo Exporting available images...
docker save -o %IMAGE_FILE% ^
    (docker images --format "{{.Repository}}:{{.Tag}}" | findstr "python:3.11-slim") ^
    (docker images --format "{{.Repository}}:{{.Tag}}" | findstr "node:18-alpine") ^
    (docker images --format "{{.Repository}}:{{.Tag}}" | findstr "nginx:alpine") ^
    (docker images --format "{{.Repository}}:{{.Tag}}" | findstr "postgres:14-alpine") ^
    (docker images --format "{{.Repository}}:{{.Tag}}" | findstr "redis:7-alpine") ^
    (docker images --format "{{.Repository}}:{{.Tag}}" | findstr "rabbitmq:3-management-alpine") ^
    (docker images --format "{{.Repository}}:{{.Tag}}" | findstr "minio/minio:latest") ^
    (docker images --format "{{.Repository}}:{{.Tag}}" | findstr "qualityguard") 2>nul

goto :check_file

:pull_images
echo Pulling required base images...
docker pull python:3.11-slim
docker pull node:18-alpine
docker pull nginx:alpine
docker pull postgres:14-alpine
docker pull redis:7-alpine
docker pull rabbitmq:3-management-alpine
docker pull minio/minio:latest

echo Building project images...
docker compose build

echo Exporting images...
docker save -o %IMAGE_FILE% ^
    python:3.11-slim ^
    node:18-alpine ^
    nginx:alpine ^
    postgres:14-alpine ^
    redis:7-alpine ^
    rabbitmq:3-management-alpine ^
    minio/minio:latest

for /f %%i in ('docker images --format "{{.Repository}}:{{.Tag}}" ^| findstr "qualityguard"') do (
    echo Adding project image: %%i
    docker save %%i >> %IMAGE_FILE%
)

:check_file
echo.
if exist %IMAGE_FILE% (
    echo Checking exported file...
    dir %IMAGE_FILE%
    goto :upload_file
) else (
    echo [ERROR] No image file created
    echo Looking for existing .tar files...
    dir *.tar 2>nul
    if %ERRORLEVEL% equ 0 (
        echo Found existing files. Would you like to upload them?
        set /p choice="Upload existing files? (y/n): "
        if /i "!choice!"=="y" goto :upload_existing
    )
    pause
    exit /b 1
)

:upload_file
echo.
echo Uploading %IMAGE_FILE% to server...
scp %IMAGE_FILE% %SERVER_USER%@%SERVER_IP%:/root/
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Upload failed
    pause
    exit /b 1
)
goto :success

:upload_existing
echo.
echo Looking for .tar files to upload...
for %%f in (*.tar) do (
    echo Found: %%f
    echo Uploading %%f...
    scp %%f %SERVER_USER%@%SERVER_IP%:/root/
    if %ERRORLEVEL% equ 0 (
        echo [OK] %%f uploaded
    ) else (
        echo [ERROR] Failed to upload %%f
    )
)

:success
echo.
echo ==========================================
echo SUCCESS! Images uploaded to server.
echo ==========================================
echo.
echo Next steps on server (%SERVER_IP%):
echo.
echo 1. SSH to server:
echo    ssh %SERVER_USER%@%SERVER_IP%
echo.
echo 2. Load images:
echo    docker load -i /root/%IMAGE_FILE%
echo.
echo 3. Deploy application:
echo    cd /root/QualityGuard
echo    docker compose up -d
echo.
echo 4. Check status:
echo    docker compose ps
echo.

pause
