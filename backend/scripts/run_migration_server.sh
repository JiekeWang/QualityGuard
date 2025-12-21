#!/bin/bash
# 在服务器上执行数据库迁移脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATION_FILE="$PROJECT_ROOT/migrations/create_test_data_config_tables.sql"

# 数据库连接信息（从环境变量或默认值）
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-qualityguard}"
DB_USER="${DB_USER:-qualityguard}"
DB_PASSWORD="${DB_PASSWORD:-qualityguard123}"

# 如果设置了DATABASE_URL，从中解析
if [ -n "$DATABASE_URL" ]; then
    # 解析格式: postgresql://user:password@host:port/dbname
    DB_INFO=$(echo "$DATABASE_URL" | sed -n 's|postgresql\(+[^:]*\)\?://\([^:]*\):\([^@]*\)@\([^:]*\):\([^/]*\)/\(.*\)|\2 \3 \4 \5 \6|p')
    if [ -n "$DB_INFO" ]; then
        DB_USER=$(echo $DB_INFO | cut -d' ' -f1)
        DB_PASSWORD=$(echo $DB_INFO | cut -d' ' -f2)
        DB_HOST=$(echo $DB_INFO | cut -d' ' -f3)
        DB_PORT=$(echo $DB_INFO | cut -d' ' -f4)
        DB_NAME=$(echo $DB_INFO | cut -d' ' -f5)
    fi
fi

echo "=========================================="
echo "数据库迁移脚本执行"
echo "=========================================="
echo ""
echo "数据库连接信息:"
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"
echo ""

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "[ERROR] 迁移脚本不存在: $MIGRATION_FILE"
    exit 1
fi

echo "[INFO] 迁移脚本: $MIGRATION_FILE"
echo ""

# 检查psql是否可用
if ! command -v psql &> /dev/null; then
    echo "[ERROR] psql 命令未找到，请安装 PostgreSQL 客户端"
    exit 1
fi

# 设置密码环境变量
export PGPASSWORD="$DB_PASSWORD"

echo "[INFO] 开始执行迁移..."
echo "=========================================="

# 执行SQL脚本
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE" -v ON_ERROR_STOP=1

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "[SUCCESS] 迁移完成！"
    echo "=========================================="
    exit 0
else
    echo ""
    echo "=========================================="
    echo "[ERROR] 迁移失败！"
    echo "=========================================="
    exit 1
fi

