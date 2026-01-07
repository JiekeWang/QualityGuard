#!/bin/bash
# UI自动化功能快速部署脚本

set -e

echo "=========================================="
echo "UI自动化功能部署脚本"
echo "=========================================="
echo ""

PROJECT_PATH="${PROJECT_PATH:-/root/QualityGuard}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-qualityguard}"
DB_USER="${DB_USER:-qualityguard}"
DB_PASSWORD="${DB_PASSWORD:-qualityguard123}"

cd "$PROJECT_PATH"

echo "步骤 1: 检查数据库连接..."
export PGPASSWORD="$DB_PASSWORD"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ 数据库连接成功"
else
    echo "❌ 数据库连接失败，请检查配置"
    exit 1
fi
echo ""

echo "步骤 2: 应用数据库迁移..."
cd "$PROJECT_PATH/backend/migrations"
if [ -f "create_page_objects_table.sql" ] && [ -f "create_ui_elements_table.sql" ]; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f create_page_objects_table.sql
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f create_ui_elements_table.sql
    echo "✅ 数据库迁移完成"
else
    echo "❌ 迁移脚本不存在"
    exit 1
fi
echo ""

echo "步骤 3: 检查Playwright安装..."
cd "$PROJECT_PATH/backend"
if python3 -c "import playwright" 2>/dev/null; then
    echo "✅ Playwright已安装"
    echo "   正在安装Playwright浏览器..."
    python3 -m playwright install chromium 2>/dev/null || echo "⚠️ 浏览器安装可能需要手动执行: python3 -m playwright install"
else
    echo "⚠️ Playwright未安装，正在安装..."
    pip3 install playwright==1.40.0
    python3 -m playwright install chromium 2>/dev/null || echo "⚠️ 浏览器安装可能需要手动执行"
fi
echo ""

echo "步骤 4: 检查后端代码..."
if [ -f "app/models/page_object.py" ] && [ -f "app/api/v1/page_objects.py" ]; then
    echo "✅ 后端代码文件存在"
else
    echo "❌ 后端代码文件缺失"
    exit 1
fi
echo ""

echo "步骤 5: 检查前端代码..."
cd "$PROJECT_PATH/frontend"
if [ -f "src/pages/UIAutomation/PageObjects.tsx" ]; then
    echo "✅ 前端代码文件存在"
    echo "   建议重新构建前端: npm run build"
else
    echo "⚠️ 前端代码文件可能缺失"
fi
echo ""

echo "步骤 6: 验证数据库表..."
export PGPASSWORD="$DB_PASSWORD"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\d page_objects" > /dev/null 2>&1; then
    echo "✅ page_objects 表存在"
else
    echo "❌ page_objects 表不存在"
    exit 1
fi

if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\d ui_elements" > /dev/null 2>&1; then
    echo "✅ ui_elements 表存在"
else
    echo "❌ ui_elements 表不存在"
    exit 1
fi
echo ""

echo "=========================================="
echo "✅ UI自动化功能部署检查完成"
echo "=========================================="
echo ""
echo "下一步操作："
echo "1. 重启后端服务: systemctl restart qualityguard-backend"
echo "2. 重新构建前端: cd frontend && npm run build"
echo "3. 访问页面: http://your-domain/ui-automation/page-objects"
echo ""

unset PGPASSWORD

