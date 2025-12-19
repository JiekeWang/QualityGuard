"""
目录管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.directory import Directory
from app.models.user import User
from app.models.project import Project
from app.schemas.directory import DirectoryCreate, DirectoryUpdate, DirectoryResponse

router = APIRouter()


@router.get("/", response_model=List[DirectoryResponse])
async def get_directories(
    project_id: Optional[int] = Query(None, description="项目ID"),
    parent_id: Optional[int] = Query(None, description="父目录ID"),
    is_active: Optional[bool] = Query(None, description="是否激活"),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取目录列表"""
    query = select(Directory)
    conditions = []
    
    if project_id:
        conditions.append(Directory.project_id == project_id)
    if parent_id is not None:
        conditions.append(Directory.parent_id == parent_id)
    if is_active is not None:
        conditions.append(Directory.is_active == is_active)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(Directory.order.asc(), Directory.created_at.asc())
    
    result = await db.execute(query.offset(skip).limit(limit))
    directories = result.scalars().all()
    
    # 构建层级结构
    directory_dict = {d.id: DirectoryResponse.model_validate(d) for d in directories}
    root_directories = []
    
    for directory in directories:
        directory_response = directory_dict[directory.id]
        if directory.parent_id is None:
            root_directories.append(directory_response)
        else:
            if directory.parent_id in directory_dict:
                parent = directory_dict[directory.parent_id]
                if parent.children is None:
                    parent.children = []
                parent.children.append(directory_response)
    
    return root_directories if parent_id is None else [directory_dict[d.id] for d in directories if d.parent_id == parent_id]


@router.post("/", response_model=DirectoryResponse, status_code=status.HTTP_201_CREATED)
async def create_directory(
    directory: DirectoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建目录"""
    # 检查项目是否存在
    project_result = await db.execute(select(Project).where(Project.id == directory.project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 如果指定了父目录，检查父目录是否存在
    if directory.parent_id:
        parent_result = await db.execute(select(Directory).where(Directory.id == directory.parent_id))
        parent = parent_result.scalar_one_or_none()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="父目录不存在"
            )
    
    # 检查同项目下是否已有同名目录
    existing_result = await db.execute(
        select(Directory).where(
            and_(
                Directory.project_id == directory.project_id,
                Directory.name == directory.name,
                Directory.parent_id == directory.parent_id
            )
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="同项目下已存在同名目录"
        )
    
    new_directory = Directory(**directory.model_dump())
    new_directory.created_by = current_user.id
    db.add(new_directory)
    await db.commit()
    await db.refresh(new_directory)
    
    return DirectoryResponse.model_validate(new_directory)


@router.get("/{directory_id}", response_model=DirectoryResponse)
async def get_directory(
    directory_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取目录详情"""
    directory = await db.get(Directory, directory_id)
    if not directory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="目录不存在"
        )
    return DirectoryResponse.model_validate(directory)


@router.put("/{directory_id}", response_model=DirectoryResponse)
async def update_directory(
    directory_id: int,
    directory_update: DirectoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新目录"""
    directory = await db.get(Directory, directory_id)
    if not directory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="目录不存在"
        )
    
    update_data = directory_update.model_dump(exclude_unset=True)
    
    # 如果更新了名称，检查是否与同项目下其他目录重名
    if "name" in update_data:
        existing_result = await db.execute(
            select(Directory).where(
                and_(
                    Directory.project_id == directory.project_id,
                    Directory.name == update_data["name"],
                    Directory.parent_id == (update_data.get("parent_id") or directory.parent_id),
                    Directory.id != directory_id
                )
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="同项目下已存在同名目录"
            )
    
    for key, value in update_data.items():
        setattr(directory, key, value)
    
    await db.commit()
    await db.refresh(directory)
    
    return DirectoryResponse.model_validate(directory)


@router.delete("/{directory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_directory(
    directory_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除目录"""
    directory = await db.get(Directory, directory_id)
    if not directory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="目录不存在"
        )
    
    # 检查是否有子目录
    children_result = await db.execute(
        select(Directory).where(Directory.parent_id == directory_id)
    )
    children = children_result.scalars().all()
    if children:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该目录下存在子目录，无法删除"
        )
    
    await db.execute(delete(Directory).where(Directory.id == directory_id))
    await db.commit()
    
    return {"message": "目录删除成功"}

