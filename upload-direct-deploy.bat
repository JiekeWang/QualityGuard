@echo off
echo ==========================================
echo Upload Direct Deploy Script
echo ==========================================
echo.

set SERVER_IP=47.116.197.230
set SERVER_USER=root

echo Uploading direct deployment script...
scp direct-install-deploy.sh %SERVER_USER%@%SERVER_IP%:/root/QualityGuard/
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Upload failed
    pause
    exit /b 1
)
echo [OK] Script uploaded
echo.

echo Running direct deployment on server...
ssh %SERVER_USER%@%SERVER_IP% "cd /root/QualityGuard && chmod +x direct-install-deploy.sh && ./direct-install-deploy.sh"

echo.
echo ==========================================
echo Deployment initiated!
echo ==========================================
echo.
echo The deployment script will:
echo - Install all dependencies using yum
echo - Configure PostgreSQL, Redis, RabbitMQ, MinIO
echo - Install Python and Node.js dependencies
echo - Build frontend
echo - Configure and start all services
echo.
echo This may take 10-20 minutes...
echo.

pause
