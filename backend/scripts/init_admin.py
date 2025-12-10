"""
初始化管理员用户脚本
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User
from app.core.database import Base


async def init_admin():
    """初始化管理员用户"""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as session:
        from sqlalchemy import select
        
        # 检查是否已存在管理员
        stmt = select(User).where(User.username == "admin")
        result = await session.execute(stmt)
        admin_user = result.scalar_one_or_none()
        
        if admin_user:
            print("管理员用户已存在，跳过创建")
            return
        
        # 创建管理员用户
        admin = User(
            username="admin",
            email="admin@qualityguard.com",
            hashed_password=get_password_hash("admin123"),  # 默认密码，请及时修改
            is_active=True,
            is_superuser=True
        )
        
        session.add(admin)
        await session.commit()
        print("管理员用户创建成功！")
        print("用户名: admin")
        print("密码: admin123")
        print("⚠️  请及时修改默认密码！")
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init_admin())

