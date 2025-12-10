"""
认证相关API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """用户登录"""
    # TODO: 实现登录逻辑
    return {"access_token": "fake-token", "token_type": "bearer"}


@router.post("/logout")
async def logout():
    """用户登出"""
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_current_user(token: str = Depends(oauth2_scheme)):
    """获取当前用户信息"""
    # TODO: 实现获取当前用户逻辑
    return {"username": "admin", "email": "admin@example.com"}

