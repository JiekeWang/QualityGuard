"""
环境管理 API
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.environment import Environment
from app.models.user import User
from app.schemas.environment import (
    EnvironmentCreate,
    EnvironmentUpdate,
    EnvironmentResponse,
)

router = APIRouter()


@router.get("/", response_model=List[EnvironmentResponse])
async def list_environments(
    only_active: bool = Query(False, description="是否仅返回启用的环境"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取环境列表"""
    query = select(Environment)
    if only_active:
        query = query.where(Environment.is_active.is_(True))
    query = query.order_by(Environment.created_at.desc())

    result = await db.execute(query)
    items = result.scalars().all()
    return items


@router.post("/", response_model=EnvironmentResponse, status_code=status.HTTP_201_CREATED)
async def create_environment(
    env: EnvironmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """创建环境"""
    # 检查 key 或 name 是否重复
    exists_query = select(Environment).where(
        (Environment.key == env.key) | (Environment.name == env.name)
    )
    result = await db.execute(exists_query)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="环境名称或标识已存在",
        )

    new_env = Environment(**env.model_dump())
    db.add(new_env)
    await db.commit()
    await db.refresh(new_env)
    return new_env


@router.get("/{env_id}", response_model=EnvironmentResponse)
async def get_environment(
    env_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """获取环境详情"""
    result = await db.execute(select(Environment).where(Environment.id == env_id))
    env = result.scalar_one_or_none()
    if not env:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="环境不存在",
        )
    return env


@router.put("/{env_id}", response_model=EnvironmentResponse)
async def update_environment(
    env_id: int,
    env_update: EnvironmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """更新环境"""
    result = await db.execute(select(Environment).where(Environment.id == env_id))
    env = result.scalar_one_or_none()
    if not env:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="环境不存在",
        )

    # 如果修改 key/name，检查是否冲突
    if (env_update.key and env_update.key != env.key) or (
        env_update.name and env_update.name != env.name
    ):
        check_query = select(Environment).where(
            (Environment.id != env_id)
            & (
                (Environment.key == env_update.key)
                | (Environment.name == env_update.name)
            )
        )
        existed = await db.execute(check_query)
        if existed.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="环境名称或标识已存在",
            )

    update_data = env_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(env, field, value)

    await db.commit()
    await db.refresh(env)
    return env


@router.delete("/{env_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_environment(
    env_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """删除环境"""
    result = await db.execute(select(Environment).where(Environment.id == env_id))
    env = result.scalar_one_or_none()
    if not env:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="环境不存在",
        )

    await db.delete(env)
    await db.commit()
    return None


