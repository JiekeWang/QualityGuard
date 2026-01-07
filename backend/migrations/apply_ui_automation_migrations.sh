#!/bin/bash
# 应用UI自动化数据库迁移脚本

set -e

echo "=========================================="
echo "应用UI自动化数据库迁移"
echo "=========================================="
echo ""

# 数据库连接信息
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-qualityguard}"
DB_USER="${DB_USER:-qualityguard}"
DB_PASSWORD="${DB_PASSWORD:-qualityguard123}"

export PGPASSWORD="$DB_PASSWORD"

echo "步骤 1: 创建页面对象表..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/create_page_objects_table.sql"
echo "✅ 页面对象表创建完成"
echo ""

echo "步骤 2: 创建UI元素表..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/create_ui_elements_table.sql"
echo "✅ UI元素表创建完成"
echo ""

echo "=========================================="
echo "✅ UI自动化数据库迁移完成"
echo "=========================================="

unset PGPASSWORD

