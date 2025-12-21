#!/usr/bin/env python3
"""
临时迁移脚本：添加directory_id字段到test_cases表
"""
import asyncio
from app.core.database import engine
from sqlalchemy import text

async def run_migration():
    async with engine.begin() as conn:
        # 添加directory_id字段
        await conn.execute(text('''
            ALTER TABLE test_cases 
            ADD COLUMN IF NOT EXISTS directory_id INTEGER REFERENCES directories(id) ON DELETE SET NULL;
        '''))
        # 创建索引
        await conn.execute(text('''
            CREATE INDEX IF NOT EXISTS idx_test_cases_directory_id ON test_cases(directory_id);
        '''))
        print('Migration completed successfully')

if __name__ == '__main__':
    asyncio.run(run_migration())

