"""
用户管理API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

router = APIRouter()


@router.get("/")
async def get_users(db: AsyncSession = Depends(get_db)):
    """获取用户列表"""
    # TODO: 实现获取用户列表逻辑
    return {"users": []}


@router.get("/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """获取用户详情"""
    # TODO: 实现获取用户详情逻辑
    return {"id": user_id, "username": "user"}

