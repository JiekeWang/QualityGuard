@echo off
echo ==========================================
echo Upload Fix Script and Deploy
echo ==========================================
echo.

set SERVER_IP=47.116.197.230
set SERVER_USER=root

echo Uploading fix script to server...
scp fix-server-deployment.sh %SERVER_USER%@%SERVER_IP%:/root/
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Upload failed
    pause
    exit /b 1
)
echo [OK] Fix script uploaded
echo.

echo Running fix script on server...
ssh %SERVER_USER%@%SERVER_IP% "chmod +x /root/fix-server-deployment.sh && /root/fix-server-deployment.sh"

pause
