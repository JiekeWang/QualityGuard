@echo off
REM Auto upload script using batch file with password pipe

set SERVER_IP=47.116.197.230
set SERVER_USER=root
set SERVER_PASS=232629wh@
set ZIP_FILE=D:\QualityGuard-deploy.zip
set CERT_FILE=C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem
set KEY_FILE=C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key

echo ==========================================
echo Auto Upload Script
echo ==========================================
echo.

REM Step 1: Upload zip file
echo Step 1/5: Upload zip file
echo %SERVER_PASS% | scp "%ZIP_FILE%" %SERVER_USER%@%SERVER_IP%:/root/
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Upload failed
    pause
    exit /b 1
)
echo [OK] Upload successful
echo.

REM Step 2: Extract and create directories
echo Step 2/5: Extract and create directories
echo %SERVER_PASS% | ssh %SERVER_USER%@%SERVER_IP% "cd /root; unzip -o QualityGuard-deploy.zip -d QualityGuard; cd QualityGuard; mkdir -p nginx/ssl; ls -la"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Extract failed
    pause
    exit /b 1
)
echo [OK] Extract successful
echo.

REM Step 3: Upload certificate
echo Step 3/5: Upload certificate file
echo %SERVER_PASS% | scp "%CERT_FILE%" %SERVER_USER%@%SERVER_IP%:/root/QualityGuard/nginx/ssl/cert.pem
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Certificate upload failed
) else (
    echo [OK] Certificate upload successful
)
echo.

REM Step 4: Upload private key
echo Step 4/5: Upload private key file
echo %SERVER_PASS% | scp "%KEY_FILE%" %SERVER_USER%@%SERVER_IP%:/root/QualityGuard/nginx/ssl/key.pem
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Key upload failed
) else (
    echo [OK] Key upload successful
)
echo.

REM Step 5: Set permissions
echo Step 5/5: Set file permissions
echo %SERVER_PASS% | ssh %SERVER_USER%@%SERVER_IP% "chmod 644 /root/QualityGuard/nginx/ssl/cert.pem; chmod 600 /root/QualityGuard/nginx/ssl/key.pem; ls -la /root/QualityGuard/nginx/ssl/"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Permission set failed
) else (
    echo [OK] Permissions set successfully
)
echo.

echo ==========================================
echo [SUCCESS] Upload completed!
echo ==========================================
echo.
echo Next steps:
echo 1. SSH login: ssh %SERVER_USER%@%SERVER_IP%
echo 2. cd /root/QualityGuard
echo 3. docker-compose build
echo 4. docker-compose up -d
echo.
pause

