#!/usr/bin/env python3
"""
在服务器上执行数据库迁移脚本
"""
import sys
import os
from pathlib import Path

# 读取迁移脚本
script_dir = Path(__file__).parent
project_root = script_dir.parent
migration_file = project_root / "migrations" / "create_test_data_config_tables.sql"

if not migration_file.exists():
    print(f"[ERROR] Migration script not found: {migration_file}")
    sys.exit(1)

print(f"[INFO] Reading migration script: {migration_file}")
with open(migration_file, 'r', encoding='utf-8') as f:
    sql_script = f.read()

# 数据库连接信息（从环境变量读取）
DB_HOST = os.getenv("DB_HOST", os.getenv("DATABASE_HOST", "localhost"))
DB_PORT = int(os.getenv("DB_PORT", os.getenv("DATABASE_PORT", "5432")))
DB_NAME = os.getenv("DB_NAME", os.getenv("DATABASE_NAME", "qualityguard"))
DB_USER = os.getenv("DB_USER", os.getenv("DATABASE_USER", "qualityguard"))
DB_PASSWORD = os.getenv("DB_PASSWORD", os.getenv("DATABASE_PASSWORD", "qualityguard123"))

# 或者从DATABASE_URL解析
DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL:
    import re
    match = re.match(r'postgresql(\+[\w]+)?://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)', DATABASE_URL)
    if match:
        DB_USER = match.group(2)
        DB_PASSWORD = match.group(3)
        DB_HOST = match.group(4)
        DB_PORT = int(match.group(5))
        DB_NAME = match.group(6)

print(f"[INFO] Database connection:")
print(f"       Host: {DB_HOST}")
print(f"       Port: {DB_PORT}")
print(f"       Database: {DB_NAME}")
print(f"       User: {DB_USER}")
print("")

try:
    import psycopg2
    from psycopg2 import sql
    
    print(f"[INFO] Connecting to database...")
    
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
        
        print("[INFO] Starting migration...")
        print("=" * 60)
        
        # 执行SQL脚本（使用execute执行整个脚本）
        try:
            cursor.execute(sql_script)
            conn.commit()
            print("[SUCCESS] Migration completed successfully!")
            print("=" * 60)
        except psycopg2.errors.DuplicateTable as e:
            print(f"[WARN] Some tables already exist, but continuing...")
            conn.rollback()
            # 尝试逐条执行
            statements = [s.strip() for s in sql_script.split(';') if s.strip() and not s.strip().startswith('--')]
            success = 0
            skipped = 0
            for stmt in statements:
                if not stmt:
                    continue
                try:
                    cursor.execute(stmt)
                    conn.commit()
                    success += 1
                except (psycopg2.errors.DuplicateTable, psycopg2.errors.DuplicateObject) as e:
                    conn.rollback()
                    skipped += 1
                    continue
                except Exception as e:
                    if 'already exists' in str(e).lower() or 'duplicate' in str(e).lower():
                        conn.rollback()
                        skipped += 1
                        continue
                    raise
            print(f"[SUCCESS] Migration completed!")
            print(f"   - Success: {success}")
            print(f"   - Skipped (already exists): {skipped}")
        except Exception as e:
            error_msg = str(e).split('\n')[0]
            if 'already exists' in error_msg.lower() or 'duplicate' in error_msg.lower():
                print(f"[WARN] Some objects already exist, but migration may have succeeded")
                print(f"[INFO] Please check the database to confirm")
            else:
                raise
        
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
    sys.exit(1)
except Exception as e:
    print(f"\n[ERROR] Migration failed: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

