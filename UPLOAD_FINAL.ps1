# 最终版上传脚本 - 使用 ProcessStartInfo 自动输入密码

$ServerIP = "47.116.197.230"
$ServerUser = "root"
$ServerPassword = "232629wh@"
$ZipFile = "D:\QualityGuard-deploy.zip"
$CertFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.pem"
$KeyFile = "C:\Users\user\Downloads\21938898_zhihome.com.cn_nginx\zhihome.com.cn.key"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "自动上传脚本 (最终版)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "服务器: $ServerUser@$ServerIP" -ForegroundColor White
Write-Host ""

# 检查压缩包
if (-not (Test-Path $ZipFile)) {
    Write-Host "创建压缩包..." -ForegroundColor Yellow
    Compress-Archive -Path "D:\QualityGuard\*" -DestinationPath $ZipFile -Force
}

if (-not (Test-Path $ZipFile)) {
    Write-Host "❌ 压缩包创建失败" -ForegroundColor Red
    exit 1
}

$size = (Get-Item $ZipFile).Length / 1MB
Write-Host "✅ 压缩包: $ZipFile ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
Write-Host ""

# 函数：执行 SCP 命令（自动输入密码）
function Invoke-AutoSCP {
    param(
        [string]$LocalFile,
        [string]$RemoteFile,
        [string]$Description
    )
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "$Description" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    
    if (-not (Test-Path $LocalFile)) {
        Write-Host "❌ 文件不存在: $LocalFile" -ForegroundColor Red
        return $false
    }
    
    Write-Host "本地文件: $LocalFile" -ForegroundColor White
    Write-Host "远程路径: $RemoteFile" -ForegroundColor White
    Write-Host "密码: $ServerPassword" -ForegroundColor Gray
    Write-Host ""
    
    # 使用 ProcessStartInfo 和自动输入
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "scp"
    $psi.Arguments = "`"$LocalFile`"", "$ServerUser@$ServerIP`:$RemoteFile"
    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    
    try {
        Write-Host "正在上传..." -ForegroundColor Yellow
        $process.Start() | Out-Null
        
        # 自动输入密码
        Start-Sleep -Milliseconds 500
        $process.StandardInput.WriteLine($ServerPassword)
        $process.StandardInput.Flush()
        $process.StandardInput.Close()
        
        # 读取输出
        $output = $process.StandardOutput.ReadToEnd()
        $error = $process.StandardError.ReadToEnd()
        
        $process.WaitForExit()
        
        if ($process.ExitCode -eq 0) {
            Write-Host "✅ 上传成功" -ForegroundColor Green
            if ($output) { Write-Host $output -ForegroundColor Gray }
            return $true
        } else {
            Write-Host "❌ 上传失败" -ForegroundColor Red
            if ($error) { Write-Host $error -ForegroundColor Red }
            return $false
        }
    } catch {
        Write-Host "❌ 执行错误: $_" -ForegroundColor Red
        return $false
    } finally {
        if (-not $process.HasExited) {
            $process.Kill()
        }
    }
}

# 函数：执行 SSH 命令（自动输入密码）
function Invoke-AutoSSH {
    param(
        [string]$Command,
        [string]$Description
    )
    
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "$Description" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "命令: $Command" -ForegroundColor White
    Write-Host "密码: $ServerPassword" -ForegroundColor Gray
    Write-Host ""
    
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "ssh"
    $psi.Arguments = "$ServerUser@$ServerIP", $Command
    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    
    try {
        Write-Host "正在执行..." -ForegroundColor Yellow
        $process.Start() | Out-Null
        
        # 自动输入密码
        Start-Sleep -Milliseconds 500
        $process.StandardInput.WriteLine($ServerPassword)
        $process.StandardInput.Flush()
        $process.StandardInput.Close()
        
        # 读取输出
        $output = $process.StandardOutput.ReadToEnd()
        $error = $process.StandardError.ReadToEnd()
        
        $process.WaitForExit()
        
        if ($process.ExitCode -eq 0) {
            Write-Host "✅ 执行成功" -ForegroundColor Green
            if ($output) { Write-Host $output -ForegroundColor White }
            return $true
        } else {
            Write-Host "❌ 执行失败" -ForegroundColor Red
            if ($error) { Write-Host $error -ForegroundColor Red }
            return $false
        }
    } catch {
        Write-Host "❌ 执行错误: $_" -ForegroundColor Red
        return $false
    } finally {
        if (-not $process.HasExited) {
            $process.Kill()
        }
    }
}

# 执行上传步骤
Write-Host "开始上传，共 5 个步骤" -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 上传压缩包
$step1 = Invoke-AutoSCP -LocalFile $ZipFile -RemoteFile "/root/" -Description "步骤 1/5: 上传压缩包"
if (-not $step1) {
    Write-Host "⚠️  步骤 1 失败，但继续执行..." -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

# 步骤 2: 解压
$step2 = Invoke-AutoSSH -Command "cd /root && unzip -o QualityGuard-deploy.zip -d QualityGuard && cd QualityGuard && mkdir -p nginx/ssl && ls -la" -Description "步骤 2/5: 解压并创建目录"
if (-not $step2) {
    Write-Host "⚠️  步骤 2 失败，但继续执行..." -ForegroundColor Yellow
}

Start-Sleep -Seconds 1

# 步骤 3: 上传证书
if (Test-Path $CertFile) {
    $step3 = Invoke-AutoSCP -LocalFile $CertFile -RemoteFile "/root/QualityGuard/nginx/ssl/cert.pem" -Description "步骤 3/5: 上传证书文件"
    Start-Sleep -Seconds 1
    
    # 步骤 4: 上传私钥
    if (Test-Path $KeyFile) {
        $step4 = Invoke-AutoSCP -LocalFile $KeyFile -RemoteFile "/root/QualityGuard/nginx/ssl/key.pem" -Description "步骤 4/5: 上传私钥文件"
        Start-Sleep -Seconds 1
        
        # 步骤 5: 设置权限
        $step5 = Invoke-AutoSSH -Command "chmod 644 /root/QualityGuard/nginx/ssl/cert.pem && chmod 600 /root/QualityGuard/nginx/ssl/key.pem && ls -la /root/QualityGuard/nginx/ssl/" -Description "步骤 5/5: 设置文件权限"
    } else {
        Write-Host "⚠️  私钥文件未找到: $KeyFile" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  证书文件未找到: $CertFile" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ 上传流程完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "验证部署：" -ForegroundColor Cyan
Invoke-AutoSSH -Command "cd /root/QualityGuard && ls -la && echo '---' && ls -la nginx/ssl/" -Description "验证文件"
Write-Host ""
Write-Host "下一步：" -ForegroundColor Cyan
Write-Host "1. SSH 登录: ssh $ServerUser@$ServerIP" -ForegroundColor White
Write-Host "2. cd /root/QualityGuard" -ForegroundColor White
Write-Host "3. docker-compose build" -ForegroundColor White
Write-Host "4. docker-compose up -d" -ForegroundColor White
Write-Host ""

