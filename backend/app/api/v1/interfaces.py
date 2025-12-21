"""
接口管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import Optional, List
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.interface import Interface, HttpMethod, InterfaceStatus
from app.models.user import User
from app.schemas.interface import InterfaceCreate, InterfaceUpdate, InterfaceResponse

router = APIRouter()


def _ensure_json_fields(interface: Interface) -> Interface:
    """确保 JSON 字段不为 None"""
    json_fields = ['headers', 'query_params', 'path_params', 'body_params', 'form_params', 
                   'response_schema', 'response_example', 'retry_strategy']
    for field in json_fields:
        if getattr(interface, field) is None:
            setattr(interface, field, {})
    return interface


@router.get("/", response_model=List[InterfaceResponse])
async def get_interfaces(
    project_id: Optional[int] = Query(None, description="项目ID"),
    method: Optional[HttpMethod] = Query(None, description="请求方法"),
    status: Optional[InterfaceStatus] = Query(None, description="接口状态"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取接口列表"""
    query = select(Interface)
    conditions = []
    
    if project_id:
        conditions.append(Interface.project_id == project_id)
    if method:
        conditions.append(Interface.method == method)
    if status:
        conditions.append(Interface.status == status)
    if search:
        conditions.append(
            or_(
                Interface.name.ilike(f"%{search}%"),
                Interface.path.ilike(f"%{search}%"),
                Interface.description.ilike(f"%{search}%")
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.offset(skip).limit(limit).order_by(Interface.created_at.desc())
    
    result = await db.execute(query)
    interfaces = result.scalars().all()
    # 确保 JSON 字段不为 None
    return [_ensure_json_fields(iface) for iface in interfaces]


@router.post("/", response_model=InterfaceResponse, status_code=status.HTTP_201_CREATED)
async def create_interface(
    interface: InterfaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建接口"""
    # 检查项目是否存在
    from app.models.project import Project
    project_result = await db.execute(select(Project).where(Project.id == interface.project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 创建接口
    interface_data = interface.dict(exclude_unset=True)
    # 确保 JSON 字段不为 None
    json_fields = ['headers', 'query_params', 'path_params', 'body_params', 'form_params', 
                   'response_schema', 'response_example', 'retry_strategy']
    for field in json_fields:
        if field in interface_data and interface_data[field] is None:
            interface_data[field] = {}
    
    new_interface = Interface(
        **interface_data,
        created_by=current_user.id
    )
    
    db.add(new_interface)
    await db.commit()
    await db.refresh(new_interface)
    
    # 确保返回时 JSON 字段不为 None
    return _ensure_json_fields(new_interface)


@router.get("/{interface_id}", response_model=InterfaceResponse)
async def get_interface(
    interface_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取接口详情"""
    result = await db.execute(select(Interface).where(Interface.id == interface_id))
    interface = result.scalar_one_or_none()
    
    if not interface:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="接口不存在"
        )
    
    return _ensure_json_fields(interface)


@router.put("/{interface_id}", response_model=InterfaceResponse)
async def update_interface(
    interface_id: int,
    interface_update: InterfaceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新接口"""
    result = await db.execute(select(Interface).where(Interface.id == interface_id))
    interface = result.scalar_one_or_none()
    
    if not interface:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="接口不存在"
        )
    
    # 如果更新了项目ID，检查项目是否存在
    if interface_update.project_id is not None:
        from app.models.project import Project
        project_result = await db.execute(select(Project).where(Project.id == interface_update.project_id))
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="项目不存在"
            )
    
    # 更新字段
    update_data = interface_update.dict(exclude_unset=True)
    # 确保 JSON 字段不为 None
    json_fields = ['headers', 'query_params', 'path_params', 'body_params', 'form_params', 
                   'response_schema', 'response_example', 'retry_strategy']
    for field in json_fields:
        if field in update_data and update_data[field] is None:
            update_data[field] = {}
    
    for field, value in update_data.items():
        setattr(interface, field, value)
    
    await db.commit()
    await db.refresh(interface)
    
    return _ensure_json_fields(interface)


@router.delete("/{interface_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interface(
    interface_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除接口"""
    result = await db.execute(select(Interface).where(Interface.id == interface_id))
    interface = result.scalar_one_or_none()
    
    if not interface:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="接口不存在"
        )
    
    from sqlalchemy import delete
    await db.execute(delete(Interface).where(Interface.id == interface_id))
    await db.commit()
    
    return None

