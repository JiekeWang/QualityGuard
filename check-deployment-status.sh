#!/bin/bash
# 检查部署状态

echo "=========================================="
echo "QualityGuard 部署状态检查"
echo "=========================================="
echo ""

PROJECT_PATH="/root/QualityGuard"

echo "1. 基础服务状态"
echo "----------------------------------------"
echo "PostgreSQL:"
systemctl is-active postgresql && echo "✅ 运行中" || echo "❌ 未运行"

echo "Redis:"
systemctl is-active redis && echo "✅ 运行中" || echo "❌ 未运行"

echo "Nginx:"
systemctl is-active nginx && echo "✅ 运行中" || echo "❌ 未运行"
echo ""

echo "2. Python 环境"
echo "----------------------------------------"
if command -v python3.11 &> /dev/null; then
    echo "✅ Python 3.11: $(python3.11 --version)"
else
    echo "❌ Python 3.11 未安装"
fi

if command -v python3 &> /dev/null; then
    echo "Python 3: $(python3 --version)"
fi
echo ""

echo "3. 后端服务"
echo "----------------------------------------"
if systemctl list-unit-files | grep -q qualityguard-backend; then
    systemctl is-active qualityguard-backend && echo "✅ 后端服务运行中" || echo "⚠️ 后端服务已配置但未运行"
    if ! systemctl is-active qualityguard-backend; then
        echo "错误日志:"
        journalctl -u qualityguard-backend --no-pager -n 10
    fi
else
    echo "❌ 后端服务未配置"
fi

if ps aux | grep -q "[u]vicorn"; then
    echo "✅ 发现 uvicorn 进程"
    ps aux | grep "[u]vicorn" | head -2
else
    echo "❌ 未发现 uvicorn 进程"
fi
echo ""

echo "4. 前端文件"
echo "----------------------------------------"
if [ -d "/usr/share/nginx/html/qualityguard" ]; then
    FILE_COUNT=$(ls -1 /usr/share/nginx/html/qualityguard/ 2>/dev/null | wc -l)
    if [ "$FILE_COUNT" -gt 0 ]; then
        echo "✅ 前端文件存在 ($FILE_COUNT 个文件)"
        ls -la /usr/share/nginx/html/qualityguard/ | head -5
    else
        echo "⚠️ 前端目录存在但为空"
    fi
else
    echo "❌ 前端文件目录不存在"
fi

if [ -d "$PROJECT_PATH/frontend/dist" ]; then
    echo "✅ 前端构建目录存在"
else
    echo "⚠️ 前端构建目录不存在"
fi
echo ""

echo "5. 后端依赖"
echo "----------------------------------------"
cd $PROJECT_PATH/backend
if [ -f "requirements.txt" ]; then
    echo "✅ requirements.txt 存在"
    if python3.11 -m pip list 2>/dev/null | grep -q fastapi; then
        echo "✅ FastAPI 已安装"
    else
        echo "❌ FastAPI 未安装"
    fi
else
    echo "❌ requirements.txt 不存在"
fi
echo ""

echo "6. 网络访问测试"
echo "----------------------------------------"
echo "测试后端 API:"
if curl -s http://localhost:8000/docs >/dev/null 2>&1; then
    echo "✅ 后端 API 可访问 (http://localhost:8000/docs)"
else
    echo "❌ 后端 API 不可访问"
fi

echo "测试 HTTPS:"
if curl -sI https://zhihome.com.cn 2>/dev/null | head -1 | grep -q "HTTP"; then
    echo "✅ HTTPS 可访问 (https://zhihome.com.cn)"
else
    echo "⚠️ HTTPS 访问可能有问题"
fi
echo ""

echo "=========================================="
echo "部署状态总结"
echo "=========================================="
echo ""
