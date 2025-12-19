"""
预设断言库管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, or_, func as sql_func
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.assertion_library import AssertionLibrary
from app.models.user import User
from app.models.project import Project
from app.schemas.assertion_library import AssertionLibraryCreate, AssertionLibraryUpdate, AssertionLibraryResponse

router = APIRouter()


@router.get("/", response_model=List[AssertionLibraryResponse])
async def get_assertion_libraries(
    project_id: Optional[int] = Query(None, description="项目ID"),
    type: Optional[str] = Query(None, description="断言类型"),
    is_public: Optional[bool] = Query(None, description="是否公开"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取预设断言库列表"""
    query = select(AssertionLibrary)
    conditions = []
    
    if project_id is not None:
        # 如果指定了项目ID，显示该项目和全局的断言
        conditions.append(
            or_(
                AssertionLibrary.project_id == project_id,
                AssertionLibrary.is_public == True,
                AssertionLibrary.project_id == None
            )
        )
    else:
        # 如果没有指定项目ID，只显示全局的断言
        conditions.append(
            or_(
                AssertionLibrary.is_public == True,
                AssertionLibrary.project_id == None
            )
        )
    
    if type:
        conditions.append(AssertionLibrary.type == type)
    if is_public is not None:
        conditions.append(AssertionLibrary.is_public == is_public)
    if search:
        conditions.append(
            or_(
                AssertionLibrary.name.ilike(f"%{search}%"),
                AssertionLibrary.description.ilike(f"%{search}%")
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(AssertionLibrary.usage_count.desc(), AssertionLibrary.created_at.desc())
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    libraries = result.scalars().all()
    
    return [AssertionLibraryResponse.model_validate(lib) for lib in libraries]


@router.post("/", response_model=AssertionLibraryResponse, status_code=status.HTTP_201_CREATED)
async def create_assertion_library(
    library: AssertionLibraryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建预设断言库"""
    # 如果指定了项目，检查项目是否存在
    if library.project_id:
        project_result = await db.execute(select(Project).where(Project.id == library.project_id))
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="项目不存在"
            )
    
    # 检查同项目下是否已有同名断言
    existing_result = await db.execute(
        select(AssertionLibrary).where(
            and_(
                AssertionLibrary.name == library.name,
                AssertionLibrary.project_id == library.project_id
            )
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="已存在同名断言"
        )
    
    new_library = AssertionLibrary(**library.model_dump())
    new_library.created_by = current_user.id
    db.add(new_library)
    await db.commit()
    await db.refresh(new_library)
    
    return AssertionLibraryResponse.model_validate(new_library)


@router.get("/{library_id}", response_model=AssertionLibraryResponse)
async def get_assertion_library(
    library_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取预设断言库详情"""
    library = await db.get(AssertionLibrary, library_id)
    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="预设断言库不存在"
        )
    return AssertionLibraryResponse.model_validate(library)


@router.put("/{library_id}", response_model=AssertionLibraryResponse)
async def update_assertion_library(
    library_id: int,
    library_update: AssertionLibraryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新预设断言库"""
    library = await db.get(AssertionLibrary, library_id)
    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="预设断言库不存在"
        )
    
    # 检查权限：只有创建人或管理员可以修改
    if library.created_by != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权修改此断言库"
        )
    
    update_data = library_update.model_dump(exclude_unset=True)
    
    # 如果更新了名称，检查是否与同项目下其他断言重名
    if "name" in update_data:
        existing_result = await db.execute(
            select(AssertionLibrary).where(
                and_(
                    AssertionLibrary.name == update_data["name"],
                    AssertionLibrary.project_id == (update_data.get("project_id") or library.project_id),
                    AssertionLibrary.id != library_id
                )
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="已存在同名断言"
            )
    
    for key, value in update_data.items():
        setattr(library, key, value)
    
    await db.commit()
    await db.refresh(library)
    
    return AssertionLibraryResponse.model_validate(library)


@router.delete("/{library_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assertion_library(
    library_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除预设断言库"""
    library = await db.get(AssertionLibrary, library_id)
    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="预设断言库不存在"
        )
    
    # 检查权限：只有创建人或管理员可以删除
    if library.created_by != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权删除此断言库"
        )
    
    await db.execute(delete(AssertionLibrary).where(AssertionLibrary.id == library_id))
    await db.commit()
    
    return {"message": "预设断言库删除成功"}


@router.post("/{library_id}/use", response_model=AssertionLibraryResponse)
async def use_assertion_library(
    library_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """使用预设断言库（增加使用次数）"""
    library = await db.get(AssertionLibrary, library_id)
    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="预设断言库不存在"
        )
    
    library.usage_count = (library.usage_count or 0) + 1
    await db.commit()
    await db.refresh(library)
    
    return AssertionLibraryResponse.model_validate(library)

