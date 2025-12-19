#!/usr/bin/env python3
"""初始化数据库表"""
import asyncio
from app.core.database import engine, Base
from app.models import Interface, TestCase, TestExecution

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("数据库表创建完成")

if __name__ == "__main__":
    asyncio.run(init_db())

