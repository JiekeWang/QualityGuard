@echo off
echo ==========================================
echo Upload Updated Files and Redeploy
echo ==========================================
echo.

set SERVER_IP=47.116.197.230
set SERVER_USER=root

echo Creating updated project archive...
powershell.exe -Command "Compress-Archive -Path . -DestinationPath qualityguard-updated.zip -CompressionLevel Optimal -Force" 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to create updated archive
    pause
    exit /b 1
)
echo [OK] Updated project archived
echo.

echo Uploading updated files to server...
scp qualityguard-updated.zip %SERVER_USER%@%SERVER_IP%:/root/
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Upload failed
    pause
    exit /b 1
)
echo [OK] Updated files uploaded
echo.

echo Extracting updated files on server...
ssh %SERVER_USER%@%SERVER_IP% "cd /root && unzip -o qualityguard-updated.zip -d QualityGuard-updated && rm -rf QualityGuard && mv QualityGuard-updated QualityGuard"

echo.
echo Running deployment again...
ssh %SERVER_USER%@%SERVER_IP% "cd /root/QualityGuard && ./fix-server-deployment.sh"

pause
