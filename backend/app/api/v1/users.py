"""
用户管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.schemas.auth import UserResponse, UserUpdate
from pydantic import BaseModel, EmailStr
from typing import Optional

router = APIRouter()


class UserProfileUpdate(BaseModel):
    """用户个人信息更新模型"""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    bio: Optional[str] = None


class PasswordUpdate(BaseModel):
    """密码更新模型"""
    current_password: str
    new_password: str


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """获取当前用户信息"""
    user_dict = {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }
    return UserResponse(**user_dict)


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    profile_update: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新当前用户个人信息"""
    # 检查用户名是否已被使用
    if profile_update.username and profile_update.username != current_user.username:
        existing_user = await db.execute(
            select(User).where(User.username == profile_update.username)
        )
        if existing_user.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户名已被使用"
            )
        current_user.username = profile_update.username
    
    # 检查邮箱是否已被使用
    if profile_update.email and profile_update.email != current_user.email:
        existing_user = await db.execute(
            select(User).where(User.email == profile_update.email)
        )
        if existing_user.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="邮箱已被使用"
            )
        current_user.email = profile_update.email
    
    # 更新其他字段（如果有扩展字段的话）
    # 目前User模型只有username和email，其他字段需要扩展模型
    
    await db.commit()
    await db.refresh(current_user)
    
    user_dict = {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }
    return UserResponse(**user_dict)


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def update_password(
    password_update: PasswordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新密码"""
    from app.core.security import verify_password, get_password_hash
    
    # 验证当前密码
    if not verify_password(password_update.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码错误"
        )
    
    # 更新密码
    current_user.hashed_password = get_password_hash(password_update.new_password)
    await db.commit()
    
    return None


@router.get("/", response_model=list[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取用户列表（所有用户都可以查看）"""
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    return [
        UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            created_at=user.created_at.isoformat() if user.created_at else None
        )
        for user in users
    ]
