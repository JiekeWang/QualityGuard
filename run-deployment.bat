@echo off
echo ==========================================
echo QualityGuard Docker Deployment
echo ==========================================
echo.

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

echo Starting deployment script...
powershell.exe -ExecutionPolicy Bypass -File "deploy-to-server.ps1"

pause
