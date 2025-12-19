@echo off
chcp 65001 >nul
echo ==========================================
echo QualityGuard 快速部署 - 仅上传更新文件
echo ==========================================
echo.

set SERVER_IP=47.116.197.230
set SERVER_USER=root
set PROJECT_PATH=/root/QualityGuard

echo 步骤 1: 上传更新的文件...
echo.

REM 上传前端更新的文件
if exist "frontend\src\pages\Login.tsx" (
    echo [上传] frontend/src/pages/Login.tsx
    scp frontend\src\pages\Login.tsx %SERVER_USER%@%SERVER_IP%:%PROJECT_PATH%/frontend/src/pages/
)

if exist "frontend\src\pages\Settings.tsx" (
    echo [上传] frontend/src/pages/Settings.tsx
    scp frontend\src\pages\Settings.tsx %SERVER_USER%@%SERVER_IP%:%PROJECT_PATH%/frontend/src/pages/
)

if exist "frontend\src\pages\Reports.tsx" (
    echo [上传] frontend/src/pages/Reports.tsx
    scp frontend\src\pages\Reports.tsx %SERVER_USER%@%SERVER_IP%:%PROJECT_PATH%/frontend/src/pages/
)

if exist "frontend\src\pages\ApiTesting\Interfaces.tsx" (
    echo [上传] frontend/src/pages/ApiTesting/Interfaces.tsx
    scp frontend\src\pages\ApiTesting\Interfaces.tsx %SERVER_USER%@%SERVER_IP%:%PROJECT_PATH%/frontend/src/pages/ApiTesting/
)

if exist "frontend\src\store\services\report.ts" (
    echo [上传] frontend/src/store/services/report.ts
    scp frontend\src\store\services\report.ts %SERVER_USER%@%SERVER_IP%:%PROJECT_PATH%/frontend/src/store/services/
)

REM 上传后端更新的文件
if exist "backend\app\api\v1\reports.py" (
    echo [上传] backend/app/api/v1/reports.py
    scp backend\app\api\v1\reports.py %SERVER_USER%@%SERVER_IP%:%PROJECT_PATH%/backend/app/api/v1/
)

if exist "backend\app\api\v1\test_executions.py" (
    echo [上传] backend/app/api/v1/test_executions.py
    scp backend\app\api\v1\test_executions.py %SERVER_USER%@%SERVER_IP%:%PROJECT_PATH%/backend/app/api/v1/
)

if exist "backend\app\services\report_service.py" (
    echo [上传] backend/app/services/report_service.py
    scp backend\app\services\report_service.py %SERVER_USER%@%SERVER_IP%:%PROJECT_PATH%/backend/app/services/
)

echo.
echo 步骤 2: 重启后端服务...
echo.
ssh %SERVER_USER%@%SERVER_IP% "cd %PROJECT_PATH% && docker compose restart backend"

echo.
echo ==========================================
echo 后端部署完成！
echo ==========================================
echo.
echo 前端需要重新构建，请在服务器上执行：
echo   cd /root/QualityGuard/frontend
echo   npm run build
echo   cd ..
echo   docker compose restart frontend
echo.
echo 或者直接执行：
echo   ssh %SERVER_USER%@%SERVER_IP% "cd %PROJECT_PATH%/frontend && npm run build && cd .. && docker compose restart frontend"
echo.

pause
