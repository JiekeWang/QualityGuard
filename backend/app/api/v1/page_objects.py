"""
页面对象管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import Optional, List
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.page_object import PageObject, PageObjectStatus
from app.models.user import User
from app.models.project import Project
from app.schemas.page_object import PageObjectCreate, PageObjectUpdate, PageObjectResponse

router = APIRouter()


def _ensure_json_fields(page_object: PageObject) -> PageObject:
    """确保 JSON 字段不为 None"""
    json_fields = ['page_config', 'tags']
    for field in json_fields:
        if getattr(page_object, field) is None:
            setattr(page_object, field, {} if field == 'page_config' else [])
    return page_object


@router.get("/", response_model=List[PageObjectResponse])
async def get_page_objects(
    project_id: Optional[int] = Query(None, description="项目ID"),
    status: Optional[PageObjectStatus] = Query(None, description="页面对象状态"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取页面对象列表"""
    query = select(PageObject)
    conditions = []
    
    if project_id:
        conditions.append(PageObject.project_id == project_id)
    if status:
        conditions.append(PageObject.status == status)
    if search:
        conditions.append(
            or_(
                PageObject.name.ilike(f"%{search}%"),
                PageObject.url.ilike(f"%{search}%"),
                PageObject.description.ilike(f"%{search}%")
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.offset(skip).limit(limit).order_by(PageObject.created_at.desc())
    
    result = await db.execute(query)
    page_objects = result.scalars().all()
    return [_ensure_json_fields(po) for po in page_objects]


@router.post("/", response_model=PageObjectResponse, status_code=status.HTTP_201_CREATED)
async def create_page_object(
    page_object: PageObjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建页面对象"""
    # 检查项目是否存在
    project_result = await db.execute(select(Project).where(Project.id == page_object.project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 创建页面对象
    page_object_data = page_object.dict(exclude_unset=True)
    # 确保 JSON 字段不为 None
    json_fields = ['page_config', 'tags']
    for field in json_fields:
        if field in page_object_data and page_object_data[field] is None:
            page_object_data[field] = {} if field == 'page_config' else []
    
    new_page_object = PageObject(
        **page_object_data,
        created_by=current_user.id
    )
    
    db.add(new_page_object)
    await db.commit()
    await db.refresh(new_page_object)
    
    return _ensure_json_fields(new_page_object)


@router.get("/{page_object_id}", response_model=PageObjectResponse)
async def get_page_object(
    page_object_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取页面对象详情"""
    result = await db.execute(select(PageObject).where(PageObject.id == page_object_id))
    page_object = result.scalar_one_or_none()
    
    if not page_object:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="页面对象不存在"
        )
    
    return _ensure_json_fields(page_object)


@router.put("/{page_object_id}", response_model=PageObjectResponse)
async def update_page_object(
    page_object_id: int,
    page_object: PageObjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新页面对象"""
    result = await db.execute(select(PageObject).where(PageObject.id == page_object_id))
    existing_page_object = result.scalar_one_or_none()
    
    if not existing_page_object:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="页面对象不存在"
        )
    
    # 如果更新项目ID，检查项目是否存在
    if page_object.project_id is not None:
        project_result = await db.execute(select(Project).where(Project.id == page_object.project_id))
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="项目不存在"
            )
    
    # 更新字段
    update_data = page_object.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(existing_page_object, field, value)
    
    await db.commit()
    await db.refresh(existing_page_object)
    
    return _ensure_json_fields(existing_page_object)


@router.delete("/{page_object_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page_object(
    page_object_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除页面对象"""
    result = await db.execute(select(PageObject).where(PageObject.id == page_object_id))
    page_object = result.scalar_one_or_none()
    
    if not page_object:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="页面对象不存在"
        )
    
    await db.delete(page_object)
    await db.commit()
    
    return None

