"""
UI元素管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import Optional, List
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.ui_element import UIElement, LocatorType, ElementType
from app.models.page_object import PageObject
from app.models.user import User
from app.schemas.ui_element import UIElementCreate, UIElementUpdate, UIElementResponse

router = APIRouter()


def _ensure_json_fields(element: UIElement) -> UIElement:
    """确保 JSON 字段不为 None"""
    json_fields = ['locator_alternative', 'wait_strategy', 'operations', 'tags']
    for field in json_fields:
        if getattr(element, field) is None:
            setattr(element, field, [] if field in ['locator_alternative', 'tags'] else {})
    return element


@router.get("/", response_model=List[UIElementResponse])
async def get_ui_elements(
    page_object_id: Optional[int] = Query(None, description="页面对象ID"),
    locator_type: Optional[LocatorType] = Query(None, description="定位策略"),
    element_type: Optional[ElementType] = Query(None, description="元素类型"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取UI元素列表"""
    query = select(UIElement)
    conditions = []
    
    if page_object_id:
        conditions.append(UIElement.page_object_id == page_object_id)
    if locator_type:
        conditions.append(UIElement.locator_type == locator_type)
    if element_type:
        conditions.append(UIElement.element_type == element_type)
    if search:
        conditions.append(
            or_(
                UIElement.name.ilike(f"%{search}%"),
                UIElement.description.ilike(f"%{search}%"),
                UIElement.locator_value.ilike(f"%{search}%")
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.offset(skip).limit(limit).order_by(UIElement.created_at.desc())
    
    result = await db.execute(query)
    elements = result.scalars().all()
    return [_ensure_json_fields(elem) for elem in elements]


@router.post("/", response_model=UIElementResponse, status_code=status.HTTP_201_CREATED)
async def create_ui_element(
    element: UIElementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建UI元素"""
    # 检查页面对象是否存在
    page_object_result = await db.execute(select(PageObject).where(PageObject.id == element.page_object_id))
    page_object = page_object_result.scalar_one_or_none()
    if not page_object:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="页面对象不存在"
        )
    
    # 创建UI元素
    element_data = element.dict(exclude_unset=True)
    # 确保 JSON 字段不为 None
    json_fields = ['locator_alternative', 'wait_strategy', 'operations', 'tags']
    for field in json_fields:
        if field in element_data and element_data[field] is None:
            element_data[field] = [] if field in ['locator_alternative', 'tags'] else {}
    
    new_element = UIElement(
        **element_data,
        created_by=current_user.id
    )
    
    db.add(new_element)
    await db.commit()
    await db.refresh(new_element)
    
    return _ensure_json_fields(new_element)


@router.get("/{element_id}", response_model=UIElementResponse)
async def get_ui_element(
    element_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取UI元素详情"""
    result = await db.execute(select(UIElement).where(UIElement.id == element_id))
    element = result.scalar_one_or_none()
    
    if not element:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="UI元素不存在"
        )
    
    return _ensure_json_fields(element)


@router.put("/{element_id}", response_model=UIElementResponse)
async def update_ui_element(
    element_id: int,
    element: UIElementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新UI元素"""
    result = await db.execute(select(UIElement).where(UIElement.id == element_id))
    existing_element = result.scalar_one_or_none()
    
    if not existing_element:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="UI元素不存在"
        )
    
    # 如果更新页面对象ID，检查页面对象是否存在
    if element.page_object_id is not None:
        page_object_result = await db.execute(select(PageObject).where(PageObject.id == element.page_object_id))
        page_object = page_object_result.scalar_one_or_none()
        if not page_object:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="页面对象不存在"
            )
    
    # 更新字段
    update_data = element.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(existing_element, field, value)
    
    await db.commit()
    await db.refresh(existing_element)
    
    return _ensure_json_fields(existing_element)


@router.delete("/{element_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ui_element(
    element_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除UI元素"""
    result = await db.execute(select(UIElement).where(UIElement.id == element_id))
    element = result.scalar_one_or_none()
    
    if not element:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="UI元素不存在"
        )
    
    await db.delete(element)
    await db.commit()
    
    return None

