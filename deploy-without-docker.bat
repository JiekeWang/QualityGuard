@echo off
echo ==========================================
echo QualityGuard Deployment (No Local Docker)
echo ==========================================
echo.

set SERVER_IP=47.116.197.230
set SERVER_USER=root
set SERVER_PASSWORD=232629wh@

echo Server: %SERVER_IP%
echo User: %SERVER_USER%
echo.

echo Step 1: Creating project archive...
powershell.exe -Command "Compress-Archive -Path . -DestinationPath qualityguard-project.zip -CompressionLevel Optimal" 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to create project archive
    pause
    exit /b 1
)
echo [OK] Project archived to qualityguard-project.zip
echo.

echo Step 2: Uploading project to server...
scp qualityguard-project.zip %SERVER_USER%@%SERVER_IP%:/root/
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Upload failed
    pause
    exit /b 1
)
echo [OK] Project uploaded to server
echo.

echo ==========================================
echo SUCCESS! Project uploaded to server.
echo ==========================================
echo.
echo Next steps on server (%SERVER_IP%):
echo.
echo 1. SSH to server:
echo    ssh %SERVER_USER%@%SERVER_IP%
echo.
echo 2. Extract project:
echo    cd /root
echo    unzip qualityguard-project.zip -d QualityGuard
echo.
echo 3. Enter project directory:
echo    cd QualityGuard
echo.
echo 4. Install Docker (if needed):
echo    yum install docker -y ^&^& systemctl start docker ^&^& systemctl enable docker
echo.
echo 5. Install Docker Compose (if needed):
echo    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
echo    chmod +x /usr/local/bin/docker-compose
echo.
echo 6. Build and start services:
echo    docker compose build
echo    docker compose up -d
echo.
echo 7. Check status:
echo    docker compose ps
echo    docker compose logs -f
echo.
echo ==========================================
echo Access URLs after deployment:
echo - Frontend: https://zhihome.com.cn
echo - API Docs: https://zhihome.com.cn/api/docs
echo ==========================================

pause
