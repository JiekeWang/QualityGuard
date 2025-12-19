"""
添加测试用例新字段的迁移脚本
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine


async def migrate():
    """执行数据库迁移"""
    async with engine.begin() as conn:
        # 添加新字段（如果不存在）
        try:
            # 添加 created_by 字段
            await conn.execute(text("""
                ALTER TABLE test_cases 
                ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)
            """))
            print("✓ 添加 created_by 字段")
        except Exception as e:
            print(f"⚠ created_by 字段可能已存在: {e}")
        
        try:
            # 添加 owner_id 字段
            await conn.execute(text("""
                ALTER TABLE test_cases 
                ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id)
            """))
            print("✓ 添加 owner_id 字段")
        except Exception as e:
            print(f"⚠ owner_id 字段可能已存在: {e}")
        
        try:
            # 添加 status 字段
            await conn.execute(text("""
                ALTER TABLE test_cases 
                ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'
            """))
            print("✓ 添加 status 字段")
        except Exception as e:
            print(f"⚠ status 字段可能已存在: {e}")
        
        try:
            # 添加 module 字段
            await conn.execute(text("""
                ALTER TABLE test_cases 
                ADD COLUMN IF NOT EXISTS module VARCHAR(100)
            """))
            print("✓ 添加 module 字段")
        except Exception as e:
            print(f"⚠ module 字段可能已存在: {e}")
        
        try:
            # 添加 is_favorite 字段
            await conn.execute(text("""
                ALTER TABLE test_cases 
                ADD COLUMN IF NOT EXISTS is_favorite JSON
            """))
            print("✓ 添加 is_favorite 字段")
        except Exception as e:
            print(f"⚠ is_favorite 字段可能已存在: {e}")
        
        # 更新现有记录的 created_by 和 owner_id（如果有用户表）
        try:
            await conn.execute(text("""
                UPDATE test_cases 
                SET created_by = (SELECT id FROM users LIMIT 1),
                    owner_id = (SELECT id FROM users LIMIT 1)
                WHERE created_by IS NULL AND EXISTS (SELECT 1 FROM users LIMIT 1)
            """))
            print("✓ 更新现有记录的 created_by 和 owner_id")
        except Exception as e:
            print(f"⚠ 更新现有记录时出错: {e}")
        
        print("\n数据库迁移完成！")


if __name__ == "__main__":
    asyncio.run(migrate())

