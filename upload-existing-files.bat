@echo off
echo ==========================================
echo Upload Existing Files to Server
echo ==========================================
echo.

set SERVER_IP=47.116.197.230
set SERVER_USER=root

echo Checking for existing files to upload...
echo.

if exist qualityguard-project.zip (
    echo Found: qualityguard-project.zip
    echo Uploading project files...
    scp qualityguard-project.zip %SERVER_USER%@%SERVER_IP%:/root/
    if %ERRORLEVEL% equ 0 (
        echo [OK] Project files uploaded
    ) else (
        echo [ERROR] Failed to upload project files
    )
) else (
    echo [WARNING] qualityguard-project.zip not found
)

if exist qualityguard-updated.zip (
    echo Found: qualityguard-updated.zip
    echo Uploading updated project files...
    scp qualityguard-updated.zip %SERVER_USER%@%SERVER_IP%:/root/
    if %ERRORLEVEL% equ 0 (
        echo [OK] Updated project files uploaded
    ) else (
        echo [ERROR] Failed to upload updated project files
    )
) else (
    echo [WARNING] qualityguard-updated.zip not found
)

echo.
echo Looking for any .tar files...
for %%f in (*.tar) do (
    echo Found: %%f
    echo Uploading %%f...
    scp %%f %SERVER_USER%@%SERVER_IP%:/root/
    if %ERRORLEVEL% equ 0 (
        echo [OK] %%f uploaded successfully
    ) else (
        echo [ERROR] Failed to upload %%f
    )
)

if exist *.tar (
    echo No .tar files found
) else (
    echo No additional .tar files to upload
)

echo.
echo ==========================================
echo Upload Summary
echo ==========================================
echo.

echo Instructions for server deployment:
echo.
echo 1. SSH to server:
echo    ssh %SERVER_USER%@%SERVER_IP%
echo.
echo 2. Extract project files (choose one):
echo    unzip qualityguard-updated.zip -d QualityGuard
echo    # OR
echo    unzip qualityguard-project.zip -d QualityGuard
echo.
echo 3. If you have Docker images locally, export them:
echo    # On your local machine (with Docker running):
echo    docker save -o images.tar [image names]
echo    scp images.tar %SERVER_USER%@%SERVER_IP%:/root/
echo.
echo 4. On server, load images if available:
echo    docker load -i /root/images.tar  # if you uploaded images
echo.
echo 5. Deploy:
echo    cd /root/QualityGuard
echo    ./final-deploy.sh
echo.
echo 6. Check status:
echo    docker compose ps
echo    docker compose logs -f
echo.

pause
