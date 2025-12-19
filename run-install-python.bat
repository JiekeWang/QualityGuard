@echo off
echo ==========================================
echo 安装 Python 3.11 并继续部署
echo ==========================================
echo.

set SERVER_IP=47.116.197.230
set SERVER_USER=root

echo 正在上传脚本...
scp install-python311.sh %SERVER_USER%@%SERVER_IP%:/root/QualityGuard/
if %ERRORLEVEL% neq 0 (
    echo [ERROR] 上传失败，请检查网络连接
    pause
    exit /b 1
)

echo [OK] 脚本已上传
echo.
echo 正在在服务器上运行脚本...
echo 这可能需要 10-15 分钟...
echo.

ssh %SERVER_USER%@%SERVER_IP% "cd /root/QualityGuard && chmod +x install-python311.sh && ./install-python311.sh"

pause
