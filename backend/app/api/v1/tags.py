"""
标签管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func as sql_func
from typing import Optional, List
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.tag import Tag
from app.models.user import User
from app.schemas.tag import TagCreate, TagUpdate, TagResponse, TagStatsResponse

router = APIRouter()


@router.get("/", response_model=List[TagResponse])
async def get_tags(
    project_id: Optional[int] = Query(None, description="项目ID"),
    category: Optional[str] = Query(None, description="标签分类"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取标签列表"""
    query = select(Tag)
    conditions = []
    
    if project_id is not None:
        conditions.append(Tag.project_id == project_id)
    else:
        # 如果project_id为None，只返回全局标签（project_id为null）
        conditions.append(Tag.project_id.is_(None))
    
    if category:
        conditions.append(Tag.category == category)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(Tag.usage_count.desc(), Tag.created_at.desc())
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    tags = result.scalars().all()
    return tags


@router.get("/stats", response_model=List[TagStatsResponse])
async def get_tag_stats(
    project_id: Optional[int] = Query(None, description="项目ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取标签统计信息"""
    query = select(
        Tag.id,
        Tag.name,
        Tag.usage_count,
        Tag.category
    )
    
    conditions = []
    if project_id is not None:
        conditions.append(Tag.project_id == project_id)
    else:
        conditions.append(Tag.project_id.is_(None))
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(Tag.usage_count.desc())
    
    result = await db.execute(query)
    stats = []
    for row in result.all():
        stats.append(TagStatsResponse(
            tag_id=row.id,
            tag_name=row.name,
            usage_count=row.usage_count,
            category=row.category
        ))
    
    return stats


@router.get("/categories", response_model=List[str])
async def get_tag_categories(
    project_id: Optional[int] = Query(None, description="项目ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取标签分类列表"""
    query = select(Tag.category).distinct()
    conditions = []
    
    if project_id is not None:
        conditions.append(Tag.project_id == project_id)
    else:
        conditions.append(Tag.project_id.is_(None))
    
    if conditions:
        query = query.where(and_(*conditions))
    
    result = await db.execute(query)
    categories = [row[0] for row in result.all() if row[0]]
    return categories


@router.post("/", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建标签"""
    # 检查标签名称是否已存在
    if tag.project_id:
        existing = await db.execute(
            select(Tag).where(
                and_(
                    Tag.name == tag.name,
                    Tag.project_id == tag.project_id
                )
            )
        )
    else:
        existing = await db.execute(
            select(Tag).where(
                and_(
                    Tag.name == tag.name,
                    Tag.project_id.is_(None)
                )
            )
        )
    
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="标签名称已存在"
        )
    
    # 如果指定了项目ID，检查项目是否存在
    if tag.project_id:
        from app.models.project import Project
        project_result = await db.execute(select(Project).where(Project.id == tag.project_id))
        if not project_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="项目不存在"
            )
    
    new_tag = Tag(**tag.dict())
    db.add(new_tag)
    await db.commit()
    await db.refresh(new_tag)
    
    return new_tag


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: int,
    tag_update: TagUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新标签"""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="标签不存在"
        )
    
    # 如果更新名称，检查是否重复
    if tag_update.name and tag_update.name != tag.name:
        if tag.project_id:
            existing = await db.execute(
                select(Tag).where(
                    and_(
                        Tag.name == tag_update.name,
                        Tag.project_id == tag.project_id,
                        Tag.id != tag_id
                    )
                )
            )
        else:
            existing = await db.execute(
                select(Tag).where(
                    and_(
                        Tag.name == tag_update.name,
                        Tag.project_id.is_(None),
                        Tag.id != tag_id
                    )
                )
            )
        
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="标签名称已存在"
            )
    
    update_data = tag_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tag, field, value)
    
    await db.commit()
    await db.refresh(tag)
    
    return tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除标签"""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="标签不存在"
        )
    
    from sqlalchemy import delete
    await db.execute(delete(Tag).where(Tag.id == tag_id))
    await db.commit()
    
    return None

