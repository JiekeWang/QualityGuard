"""
认证相关API
"""
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token,
    TokenRefresh,
    UserResponse,
)
from app.services.auth_service import AuthService
from app.models.user import User

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """用户注册"""
    auth_service = AuthService(db)
    user = await auth_service.register_user(user_data)
    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """用户登录（OAuth2 兼容）"""
    login_data = UserLogin(username=form_data.username, password=form_data.password)
    auth_service = AuthService(db)
    result = await auth_service.login(login_data)
    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "token_type": result["token_type"]
    }


@router.post("/login/json", response_model=Token)
async def login_json(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """用户登录（JSON 格式）"""
    auth_service = AuthService(db)
    result = await auth_service.login(login_data)
    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "token_type": result["token_type"]
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh,
    db: AsyncSession = Depends(get_db)
):
    """刷新访问令牌"""
    auth_service = AuthService(db)
    result = await auth_service.refresh_access_token(token_data.refresh_token)
    return {
        "access_token": result["access_token"],
        "refresh_token": token_data.refresh_token,  # 刷新令牌保持不变
        "token_type": result["token_type"]
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """获取当前用户信息"""
    # 手动转换 datetime 为字符串
    user_dict = {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }
    return UserResponse(**user_dict)


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_active_user)
):
    """用户登出"""
    # TODO: 可以实现 token 黑名单机制，将 token 加入 Redis 黑名单
    return {"message": "登出成功"}

