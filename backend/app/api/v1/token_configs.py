"""
Token配置管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, or_
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.token_config import TokenConfig
from app.models.user import User
from app.schemas.token_config import (
    TokenConfigCreate,
    TokenConfigUpdate,
    TokenConfigResponse,
    TokenConfigListResponse,
)

router = APIRouter()


# ========== Token配置管理 ==========
@router.get("/token-configs", response_model=List[TokenConfigResponse])
async def get_token_configs(
    project_id: Optional[int] = Query(None, description="项目ID"),
    is_active: Optional[bool] = Query(None, description="是否启用"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取Token配置列表"""
    query = select(TokenConfig)
    
    conditions = []
    
    if project_id is not None:
        conditions.append(
            or_(
                TokenConfig.project_id == project_id,
                TokenConfig.project_id == None
            )
        )
    if is_active is not None:
        conditions.append(TokenConfig.is_active == is_active)
    if search:
        conditions.append(
            or_(
                TokenConfig.name.ilike(f"%{search}%"),
                TokenConfig.description.ilike(f"%{search}%")
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(TokenConfig.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    configs = result.scalars().all()
    
    return [TokenConfigResponse.model_validate(config) for config in configs]


@router.get("/token-configs/{config_id}", response_model=TokenConfigResponse)
async def get_token_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取Token配置详情"""
    result = await db.execute(select(TokenConfig).where(TokenConfig.id == config_id))
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token配置不存在"
        )
    
    return TokenConfigResponse.model_validate(config)


@router.post("/token-configs", response_model=TokenConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_token_config(
    data: TokenConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建Token配置"""
    # 检查名称是否已存在
    existing = await db.execute(
        select(TokenConfig).where(TokenConfig.name == data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token配置名称已存在"
        )
    
    # 创建新配置
    config_dict = data.model_dump()
    config_dict['created_by'] = current_user.id
    config_dict['config'] = data.config.model_dump()  # 将Pydantic模型转为字典
    
    new_config = TokenConfig(**config_dict)
    db.add(new_config)
    await db.commit()
    await db.refresh(new_config)
    
    return TokenConfigResponse.model_validate(new_config)


@router.put("/token-configs/{config_id}", response_model=TokenConfigResponse)
async def update_token_config(
    config_id: int,
    data: TokenConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新Token配置"""
    result = await db.execute(select(TokenConfig).where(TokenConfig.id == config_id))
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token配置不存在"
        )
    
    # 如果更新名称，检查是否与其他配置冲突
    if data.name and data.name != config.name:
        existing = await db.execute(
            select(TokenConfig).where(
                and_(
                    TokenConfig.name == data.name,
                    TokenConfig.id != config_id
                )
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token配置名称已存在"
            )
    
    # 更新字段
    update_data = data.model_dump(exclude_unset=True)
    if 'config' in update_data and update_data['config']:
        # 如果config是Pydantic模型，转换为字典；如果已经是字典，直接使用
        if hasattr(update_data['config'], 'model_dump'):
            update_data['config'] = update_data['config'].model_dump()
        # 如果已经是字典，不需要转换
    
    for key, value in update_data.items():
        setattr(config, key, value)
    
    await db.commit()
    await db.refresh(config)
    
    return TokenConfigResponse.model_validate(config)


@router.delete("/token-configs/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_token_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除Token配置"""
    result = await db.execute(select(TokenConfig).where(TokenConfig.id == config_id))
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Token配置不存在"
        )
    
    await db.delete(config)
    await db.commit()
    
    return

