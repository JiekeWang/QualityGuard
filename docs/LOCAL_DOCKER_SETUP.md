# 本地 Docker 安装指南

## 问题
本地 Windows 系统没有安装 Docker。

## 解决方案

### 方法一：安装 Docker Desktop for Windows（推荐）

1. **下载 Docker Desktop**
   - 访问：https://www.docker.com/products/docker-desktop
   - 或直接下载：https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe

2. **安装**
   - 运行安装程序
   - 按照向导完成安装
   - 重启计算机（如果需要）

3. **启动 Docker Desktop**
   - 从开始菜单启动 Docker Desktop
   - 等待 Docker 引擎启动（系统托盘图标）

4. **验证安装**
   ```powershell
   docker --version
   docker compose version
   ```

5. **构建镜像**
   ```powershell
   cd D:\QualityGuard
   docker compose build
   ```

### 方法二：直接在服务器上解决网络问题

如果不想在本地安装 Docker，可以尝试在服务器上：

1. **配置代理**（如果有）
2. **使用其他镜像源**
3. **手动下载镜像文件**

### 方法三：使用 WSL2 + Docker（如果已安装 WSL2）

如果已安装 WSL2：

```powershell
# 在 WSL2 中安装 Docker
wsl
sudo apt update
sudo apt install docker.io docker-compose
sudo service docker start
```

然后在 WSL2 中构建镜像。

## 快速检查

运行以下命令检查 Docker 是否可用：

```powershell
# 检查 Docker 命令
Get-Command docker -ErrorAction SilentlyContinue

# 检查 Docker Desktop 是否运行
Get-Process "Docker Desktop" -ErrorAction SilentlyContinue

# 检查 Docker 服务
Get-Service *docker* -ErrorAction SilentlyContinue
```

## 如果 Docker Desktop 已安装但命令不可用

1. **重启 Docker Desktop**
2. **检查 PATH 环境变量**
   - Docker Desktop 通常安装在：`C:\Program Files\Docker\Docker\resources\bin`
   - 确保该路径在系统 PATH 中

3. **手动添加到 PATH**（如果需要）
   ```powershell
   $env:PATH += ";C:\Program Files\Docker\Docker\resources\bin"
   ```

