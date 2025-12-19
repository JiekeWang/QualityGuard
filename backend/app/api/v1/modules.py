"""
模块管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.module import Module
from app.models.user import User
from app.models.project import Project
from app.schemas.module import ModuleCreate, ModuleUpdate, ModuleResponse

router = APIRouter()


@router.get("/", response_model=List[ModuleResponse])
async def get_modules(
    project_id: Optional[int] = Query(None, description="项目ID"),
    parent_id: Optional[int] = Query(None, description="父模块ID"),
    is_active: Optional[bool] = Query(None, description="是否激活"),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取模块列表"""
    query = select(Module)
    conditions = []
    
    if project_id:
        conditions.append(Module.project_id == project_id)
    if parent_id is not None:
        conditions.append(Module.parent_id == parent_id)
    if is_active is not None:
        conditions.append(Module.is_active == is_active)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(Module.order.asc(), Module.created_at.asc())
    
    result = await db.execute(query.offset(skip).limit(limit))
    modules = result.scalars().all()
    
    # 构建层级结构
    module_dict = {m.id: ModuleResponse.model_validate(m) for m in modules}
    root_modules = []
    
    for module in modules:
        module_response = module_dict[module.id]
        if module.parent_id is None:
            root_modules.append(module_response)
        else:
            if module.parent_id in module_dict:
                parent = module_dict[module.parent_id]
                if parent.children is None:
                    parent.children = []
                parent.children.append(module_response)
    
    return root_modules if parent_id is None else [module_dict[m.id] for m in modules if m.parent_id == parent_id]


@router.post("/", response_model=ModuleResponse, status_code=status.HTTP_201_CREATED)
async def create_module(
    module: ModuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建模块"""
    # 检查项目是否存在
    project_result = await db.execute(select(Project).where(Project.id == module.project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 如果指定了父模块，检查父模块是否存在
    if module.parent_id:
        parent_result = await db.execute(select(Module).where(Module.id == module.parent_id))
        parent = parent_result.scalar_one_or_none()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="父模块不存在"
            )
    
    # 检查同项目下是否已有同名模块
    existing_result = await db.execute(
        select(Module).where(
            and_(
                Module.project_id == module.project_id,
                Module.name == module.name,
                Module.parent_id == module.parent_id
            )
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="同项目下已存在同名模块"
        )
    
    new_module = Module(**module.model_dump())
    new_module.created_by = current_user.id
    db.add(new_module)
    await db.commit()
    await db.refresh(new_module)
    
    return ModuleResponse.model_validate(new_module)


@router.get("/{module_id}", response_model=ModuleResponse)
async def get_module(
    module_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取模块详情"""
    module = await db.get(Module, module_id)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模块不存在"
        )
    return ModuleResponse.model_validate(module)


@router.put("/{module_id}", response_model=ModuleResponse)
async def update_module(
    module_id: int,
    module_update: ModuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新模块"""
    module = await db.get(Module, module_id)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模块不存在"
        )
    
    update_data = module_update.model_dump(exclude_unset=True)
    
    # 如果更新了名称，检查是否与同项目下其他模块重名
    if "name" in update_data:
        existing_result = await db.execute(
            select(Module).where(
                and_(
                    Module.project_id == module.project_id,
                    Module.name == update_data["name"],
                    Module.parent_id == (update_data.get("parent_id") or module.parent_id),
                    Module.id != module_id
                )
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="同项目下已存在同名模块"
            )
    
    for key, value in update_data.items():
        setattr(module, key, value)
    
    await db.commit()
    await db.refresh(module)
    
    return ModuleResponse.model_validate(module)


@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    module_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除模块"""
    module = await db.get(Module, module_id)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="模块不存在"
        )
    
    # 检查是否有子模块
    children_result = await db.execute(
        select(Module).where(Module.parent_id == module_id)
    )
    children = children_result.scalars().all()
    if children:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该模块下存在子模块，无法删除"
        )
    
    # 检查是否有测试用例使用该模块
    from app.models.test_case import TestCase
    test_cases_result = await db.execute(
        select(TestCase).where(TestCase.module == module.name)
    )
    test_cases = test_cases_result.scalars().all()
    if test_cases:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该模块下存在测试用例，无法删除"
        )
    
    await db.execute(delete(Module).where(Module.id == module_id))
    await db.commit()
    
    return {"message": "模块删除成功"}

