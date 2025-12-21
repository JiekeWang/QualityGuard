"""
执行数据库迁移脚本 - 简化版本
使用psycopg2直接连接
"""
import sys
from pathlib import Path

# 读取迁移脚本
migration_file = Path(__file__).parent.parent / "migrations" / "create_test_data_config_tables.sql"

if not migration_file.exists():
    print(f"[ERROR] Migration script not found: {migration_file}")
    sys.exit(1)

print(f"[INFO] Reading migration script: {migration_file}")
with open(migration_file, 'r', encoding='utf-8') as f:
    sql_script = f.read()

# 数据库连接信息（可以从环境变量读取）
import os

DB_HOST = os.getenv("DB_HOST", os.getenv("DATABASE_HOST", "localhost"))
DB_PORT = int(os.getenv("DB_PORT", os.getenv("DATABASE_PORT", "5432")))
DB_NAME = os.getenv("DB_NAME", os.getenv("DATABASE_NAME", "qualityguard"))
DB_USER = os.getenv("DB_USER", os.getenv("DATABASE_USER", "qualityguard"))
DB_PASSWORD = os.getenv("DB_PASSWORD", os.getenv("DATABASE_PASSWORD", "qualityguard123"))

# 或者从DATABASE_URL解析
DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL:
    # 解析格式: postgresql://user:password@host:port/dbname
    import re
    match = re.match(r'postgresql(\+[\w]+)?://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', DATABASE_URL)
    if match:
        DB_USER = match.group(2)
        DB_PASSWORD = match.group(3)
        DB_HOST = match.group(4)
        DB_PORT = int(match.group(5))
        DB_NAME = match.group(6)

print(f"[INFO] Using database connection:")
print(f"       Host: {DB_HOST}")
print(f"       Port: {DB_PORT}")
print(f"       Database: {DB_NAME}")
print(f"       User: {DB_USER}")
print(f"       Password: {'*' * len(DB_PASSWORD)}")

try:
    import psycopg2
    from psycopg2 import sql
    
    print(f"[INFO] Connecting to database: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    
    # 连接数据库
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    conn.autocommit = False
    
    try:
        cursor = conn.cursor()
        
        print("\n[INFO] Starting migration...")
        print("=" * 60)
        
        # 执行SQL脚本
        # 按分号分割语句，但要考虑字符串中的分号
        statements = []
        current_stmt = []
        in_string = False
        string_char = None
        
        for line in sql_script.split('\n'):
            # 跳过注释行
            line_stripped = line.strip()
            if not line_stripped or line_stripped.startswith('--'):
                if current_stmt:
                    current_stmt.append('')
                continue
            
            # 简单的字符串检测（不完美，但对于我们的SQL脚本足够）
            for char in line:
                if char in ("'", '"') and (len(current_stmt) == 0 or current_stmt[-1] != '\\'):
                    if not in_string:
                        in_string = True
                        string_char = char
                    elif char == string_char:
                        in_string = False
                        string_char = None
                current_stmt.append(char)
            
            # 检查是否以分号结尾（不在字符串中）
            if not in_string and line.rstrip().endswith(';'):
                stmt = ''.join(current_stmt).strip()
                if stmt:
                    statements.append(stmt)
                current_stmt = []
            else:
                current_stmt.append('\n')
        
        # 执行每个SQL语句
        success_count = 0
        skip_count = 0
        
        for i, stmt in enumerate(statements, 1):
            try:
                # 显示语句预览
                preview = stmt[:80].replace('\n', ' ') + ('...' if len(stmt) > 80 else '')
                print(f"\n[{i}/{len(statements)}] 执行: {preview}")
                
                cursor.execute(stmt)
                conn.commit()
                success_count += 1
                print(f"[OK] Success")
            except psycopg2.errors.DuplicateTable as e:
                print(f"[WARN] Table already exists, skipping: {str(e).split('(')[0]}")
                skip_count += 1
                conn.rollback()
                continue
            except psycopg2.errors.DuplicateObject as e:
                print(f"[WARN] Object already exists, skipping: {str(e).split('(')[0]}")
                skip_count += 1
                conn.rollback()
                continue
            except Exception as e:
                error_msg = str(e).split('\n')[0]
                print(f"[ERROR] Failed: {error_msg}")
                # 如果是"已存在"相关的错误，继续执行
                if any(keyword in str(e).lower() for keyword in ['already exists', 'duplicate', '已存在']):
                    print(f"[WARN] Object already exists, skipping...")
                    skip_count += 1
                    conn.rollback()
                    continue
                else:
                    raise
        
        print("\n" + "=" * 60)
        print(f"[SUCCESS] Migration completed!")
        print(f"   - Success: {success_count}")
        print(f"   - Skipped (already exists): {skip_count}")
        print(f"   - Total: {len(statements)}")
        
    finally:
        cursor.close()
        conn.close()
    
except ImportError:
    print("[ERROR] Missing psycopg2 library")
    print("   Please run: pip install psycopg2-binary")
    sys.exit(1)
except psycopg2.OperationalError as e:
    print(f"[ERROR] Database connection failed: {str(e)}")
    print(f"   Please check if database is running and connection info is correct")
    print(f"   Connection info: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    sys.exit(1)
except Exception as e:
    print(f"\n[ERROR] Migration failed: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

