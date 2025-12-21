"""
执行数据库迁移脚本
"""
import asyncio
import sys
import os
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings


async def run_migration():
    """执行迁移脚本"""
    # 读取迁移脚本
    migration_file = project_root / "migrations" / "create_test_data_config_tables.sql"
    
    if not migration_file.exists():
        print(f"❌ 迁移脚本不存在: {migration_file}")
        return False
    
    print(f"📄 读取迁移脚本: {migration_file}")
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_script = f.read()
    
    # 获取数据库URL
    database_url = settings.DATABASE_URL
    print(f"🔗 数据库连接: {database_url.replace(settings.DATABASE_URL.split('@')[0].split('//')[1] if '@' in settings.DATABASE_URL else '', '***')}")
    
    # 将asyncpg URL转换为psycopg2 URL用于执行原始SQL
    # asyncpg URL格式: postgresql+asyncpg://user:pass@host:port/db
    # psycopg2 URL格式: postgresql+psycopg2://user:pass@host:port/db
    if '+asyncpg' in database_url:
        sync_url = database_url.replace('+asyncpg', '+psycopg2')
    elif '+psycopg2' in database_url:
        sync_url = database_url.replace('+psycopg2', '+psycopg2')
    else:
        sync_url = database_url.replace('postgresql://', 'postgresql+psycopg2://')
    
    try:
        from sqlalchemy import create_engine, text
        from sqlalchemy.engine import Engine
        
        # 创建同步引擎（用于执行DDL语句）
        sync_engine = create_engine(sync_url, echo=True)
        
        print("\n🚀 开始执行迁移...")
        print("=" * 60)
        
        with sync_engine.connect() as conn:
            # 执行SQL脚本
            # 分割SQL语句（以分号和换行分隔）
            statements = []
            current_stmt = []
            for line in sql_script.split('\n'):
                line = line.strip()
                if not line or line.startswith('--'):
                    continue
                current_stmt.append(line)
                if line.endswith(';'):
                    stmt = ' '.join(current_stmt)
                    if stmt:
                        statements.append(stmt)
                    current_stmt = []
            
            # 执行每个SQL语句
            for i, stmt in enumerate(statements, 1):
                try:
                    print(f"\n执行语句 {i}/{len(statements)}:")
                    print(stmt[:100] + ('...' if len(stmt) > 100 else ''))
                    conn.execute(text(stmt))
                    conn.commit()
                    print(f"✅ 语句 {i} 执行成功")
                except Exception as e:
                    print(f"❌ 语句 {i} 执行失败: {str(e)}")
                    # 如果是"表已存在"的错误，继续执行
                    if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                        print("⚠️  表或索引已存在，跳过...")
                        continue
                    else:
                        raise
        
        print("\n" + "=" * 60)
        print("✅ 迁移脚本执行完成！")
        return True
        
    except ImportError:
        print("❌ 缺少psycopg2库，尝试安装...")
        print("   请运行: pip install psycopg2-binary")
        return False
    except Exception as e:
        print(f"\n❌ 迁移失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if 'sync_engine' in locals():
            sync_engine.dispose()


if __name__ == "__main__":
    print("=" * 60)
    print("数据库迁移脚本执行工具")
    print("=" * 60)
    print()
    
    success = asyncio.run(run_migration())
    
    if success:
        print("\n✅ 迁移完成！")
        sys.exit(0)
    else:
        print("\n❌ 迁移失败！")
        sys.exit(1)

