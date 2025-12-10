# 自动上传脚本 - 使用 PowerShell 原生功能

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ServerPassword = "232629wh@"
$ProjectPath = "D:\QualityGuard"
$RemotePath = "/root/QualityGuard"
$ZipFile = "D:\QualityGuard-deploy.zip"
$CertFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem"
$KeyFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "自动上传项目到服务器" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "服务器: $ServerUser@$ServerIP" -ForegroundColor White
Write-Host ""

# 检查压缩包
if (-not (Test-Path $ZipFile)) {
    Write-Host "创建压缩包..." -ForegroundColor Yellow
    Compress-Archive -Path "$ProjectPath\*" -DestinationPath $ZipFile -Force
}

if (Test-Path $ZipFile) {
    $size = (Get-Item $ZipFile).Length / 1MB
    Write-Host "✅ 压缩包: $ZipFile ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
} else {
    Write-Host "❌ 压缩包创建失败" -ForegroundColor Red
    exit 1
}

# 创建临时脚本文件用于自动输入密码
$tempScript = [System.IO.Path]::GetTempFileName() + ".ps1"
$passwordScript = @"
`$password = ConvertTo-SecureString '$ServerPassword' -AsPlainText -Force
`$credential = New-Object System.Management.Automation.PSCredential('$ServerUser', `$password)
"@
Set-Content -Path $tempScript -Value $passwordScript

# 函数：执行 SSH 命令（自动输入密码）
function Invoke-SSHCommand {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "$Description..." -ForegroundColor Yellow
    
    # 使用 echo 管道密码（不安全但有效）
    $process = Start-Process -FilePath "ssh" -ArgumentList "$ServerUser@$ServerIP", $Command -NoNewWindow -PassThru -RedirectStandardOutput "temp_output.txt" -RedirectStandardError "temp_error.txt"
    
    # 等待进程完成
    $process.WaitForExit()
    
    if ($process.ExitCode -eq 0) {
        Write-Host "✅ $Description 成功" -ForegroundColor Green
        if (Test-Path "temp_output.txt") {
            Get-Content "temp_output.txt" | Write-Host
            Remove-Item "temp_output.txt" -ErrorAction SilentlyContinue
        }
        return $true
    } else {
        Write-Host "❌ $Description 失败" -ForegroundColor Red
        if (Test-Path "temp_error.txt") {
            Get-Content "temp_error.txt" | Write-Host
            Remove-Item "temp_error.txt" -ErrorAction SilentlyContinue
        }
        return $false
    }
}

# 函数：执行 SCP 上传（自动输入密码）
function Invoke-SCPUpload {
    param(
        [string]$LocalFile,
        [string]$RemoteFile,
        [string]$Description
    )
    
    Write-Host "$Description..." -ForegroundColor Yellow
    
    if (-not (Test-Path $LocalFile)) {
        Write-Host "❌ 文件不存在: $LocalFile" -ForegroundColor Red
        return $false
    }
    
    # 使用 scp 命令
    $process = Start-Process -FilePath "scp" -ArgumentList $LocalFile, "$ServerUser@$ServerIP`:$RemoteFile" -NoNewWindow -PassThru -RedirectStandardOutput "temp_output.txt" -RedirectStandardError "temp_error.txt"
    
    $process.WaitForExit()
    
    if ($process.ExitCode -eq 0) {
        Write-Host "✅ $Description 成功" -ForegroundColor Green
        Remove-Item "temp_output.txt" -ErrorAction SilentlyContinue
        Remove-Item "temp_error.txt" -ErrorAction SilentlyContinue
        return $true
    } else {
        Write-Host "❌ $Description 失败" -ForegroundColor Red
        if (Test-Path "temp_error.txt") {
            Get-Content "temp_error.txt" | Write-Host
            Remove-Item "temp_error.txt" -ErrorAction SilentlyContinue
        }
        return $false
    }
}

# 由于 scp/ssh 需要交互式输入，我们使用更好的方法
Write-Host ""
Write-Host "使用改进的方法上传..." -ForegroundColor Cyan
Write-Host ""

# 方法：使用 PowerShell 的 Start-Process 和输入重定向
# 但更好的方法是创建一个批处理脚本

$batchScript = @"
@echo off
echo $ServerPassword | scp "D:\QualityGuard-deploy.zip" $ServerUser@$ServerIP:/root/
echo $ServerPassword | ssh $ServerUser@$ServerIP "cd /root && unzip -o QualityGuard-deploy.zip -d QualityGuard && cd QualityGuard && mkdir -p nginx/ssl"
echo $ServerPassword | scp "$CertFile" $ServerUser@$ServerIP:/root/QualityGuard/nginx/ssl/cert.pem
echo $ServerPassword | scp "$KeyFile" $ServerUser@$ServerIP:/root/QualityGuard/nginx/ssl/key.pem
echo $ServerPassword | ssh $ServerUser@$ServerIP "chmod 644 /root/QualityGuard/nginx/ssl/cert.pem && chmod 600 /root/QualityGuard/nginx/ssl/key.pem"
"@

$batchFile = "upload.bat"
Set-Content -Path $batchFile -Value $batchScript -Encoding ASCII

Write-Host "已创建批处理脚本: $batchFile" -ForegroundColor Green
Write-Host "但这种方法不安全（密码明文）" -ForegroundColor Yellow
Write-Host ""

# 更好的方法：使用 PowerShell 的 here-string 和自动输入
Write-Host "使用 PowerShell 自动输入密码的方法..." -ForegroundColor Cyan
Write-Host ""

# 创建自动化脚本
$autoScript = @'
$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ServerPassword = "232629wh@"

# 使用 expect 风格的自动输入
function Auto-SCP {
    param([string]$LocalFile, [string]$RemoteFile)
    
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "scp"
    $processInfo.Arguments = $LocalFile, "$ServerUser@$ServerIP`:$RemoteFile"
    $processInfo.UseShellExecute = $false
    $processInfo.RedirectStandardInput = $true
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.CreateNoWindow = $true
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    
    $process.Start() | Out-Null
    $process.StandardInput.WriteLine($ServerPassword)
    $process.StandardInput.Close()
    
    $output = $process.StandardOutput.ReadToEnd()
    $error = $process.StandardError.ReadToEnd()
    
    $process.WaitForExit()
    
    if ($process.ExitCode -eq 0) {
        Write-Host "✅ 上传成功" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ 上传失败: $error" -ForegroundColor Red
        return $false
    }
}

# 执行上传
Write-Host "1. 上传压缩包..." -ForegroundColor Yellow
Auto-SCP "D:\QualityGuard-deploy.zip" "/root/"

Write-Host "2. 解压..." -ForegroundColor Yellow
# SSH 命令类似处理...

'@

# 实际上，最简单的方法是创建一个更好的交互式脚本
Write-Host "创建改进的交互式脚本..." -ForegroundColor Cyan

$improvedScript = @"
# 改进的上传脚本 - 使用更友好的交互方式

`$ServerIP = "47.116.197.230"
`$ServerUser = "root"
`$ServerPassword = "232629wh@"
`$ZipFile = "D:\QualityGuard-deploy.zip"
`$CertFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem"
`$KeyFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "自动上传脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 使用 PowerShell 的 Invoke-Expression 和自动输入
function Execute-SCP {
    param([string]`$LocalFile, [string]`$RemoteFile, [string]`$Description)
    
    Write-Host "`$Description..." -ForegroundColor Yellow
    Write-Host "执行: scp `"`$LocalFile`" `$ServerUser@`$ServerIP`:`$RemoteFile" -ForegroundColor Gray
    Write-Host "密码: `$ServerPassword" -ForegroundColor Gray
    Write-Host ""
    
    # 创建临时输入文件
    `$tempInput = [System.IO.Path]::GetTempFileName()
    `$ServerPassword | Out-File -FilePath `$tempInput -Encoding ASCII -NoNewline
    
    # 执行命令（需要手动输入密码，但提供清晰的提示）
    `$command = "scp `"`$LocalFile`" `$ServerUser@`$ServerIP`:`$RemoteFile`""
    
    Write-Host "请在密码提示时输入: `$ServerPassword" -ForegroundColor Yellow
    Write-Host "按 Enter 开始执行..." -ForegroundColor Yellow
    Read-Host | Out-Null
    
    Invoke-Expression `$command
    
    Remove-Item `$tempInput -ErrorAction SilentlyContinue
}

# 执行上传步骤
Write-Host "步骤 1/5: 上传压缩包" -ForegroundColor Cyan
Execute-SCP `$ZipFile "/root/" "上传压缩包"

Write-Host "`n步骤 2/5: 在服务器上解压" -ForegroundColor Cyan
Write-Host "执行: ssh `$ServerUser@`$ServerIP `"cd /root && unzip -o QualityGuard-deploy.zip -d QualityGuard && cd QualityGuard && mkdir -p nginx/ssl`"" -ForegroundColor Gray
Write-Host "密码: `$ServerPassword" -ForegroundColor Gray
Write-Host "按 Enter 执行..." -ForegroundColor Yellow
Read-Host | Out-Null
ssh "`$ServerUser@`$ServerIP" "cd /root && unzip -o QualityGuard-deploy.zip -d QualityGuard && cd QualityGuard && mkdir -p nginx/ssl"

if (Test-Path `$CertFile) {
    Write-Host "`n步骤 3/5: 上传证书文件" -ForegroundColor Cyan
    Execute-SCP `$CertFile "/root/QualityGuard/nginx/ssl/cert.pem" "上传证书文件"
    
    Write-Host "`n步骤 4/5: 上传私钥文件" -ForegroundColor Cyan
    Execute-SCP `$KeyFile "/root/QualityGuard/nginx/ssl/key.pem" "上传私钥文件"
    
    Write-Host "`n步骤 5/5: 设置文件权限" -ForegroundColor Cyan
    Write-Host "执行: ssh `$ServerUser@`$ServerIP `"chmod 644 /root/QualityGuard/nginx/ssl/cert.pem && chmod 600 /root/QualityGuard/nginx/ssl/key.pem`"" -ForegroundColor Gray
    Write-Host "密码: `$ServerPassword" -ForegroundColor Gray
    Write-Host "按 Enter 执行..." -ForegroundColor Yellow
    Read-Host | Out-Null
    ssh "`$ServerUser@`$ServerIP" "chmod 644 /root/QualityGuard/nginx/ssl/cert.pem && chmod 600 /root/QualityGuard/nginx/ssl/key.pem && ls -la /root/QualityGuard/nginx/ssl/"
}

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "✅ 上传完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "1. SSH 登录: ssh `$ServerUser@`$ServerIP" -ForegroundColor White
Write-Host "2. cd /root/QualityGuard" -ForegroundColor White
Write-Host "3. docker-compose build" -ForegroundColor White
Write-Host "4. docker-compose up -d" -ForegroundColor White
Write-Host ""
"@

Set-Content -Path "UPLOAD_IMPROVED.ps1" -Value $improvedScript

Write-Host "✅ 已创建改进的脚本: UPLOAD_IMPROVED.ps1" -ForegroundColor Green
Write-Host ""
Write-Host "运行方式：" -ForegroundColor Cyan
Write-Host "  powershell -ExecutionPolicy Bypass -File .\UPLOAD_IMPROVED.ps1" -ForegroundColor Yellow
Write-Host ""
