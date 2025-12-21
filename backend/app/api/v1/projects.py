"""
项目管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from typing import List

router = APIRouter()


@router.get("/", response_model=List[ProjectResponse])
async def get_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取项目列表"""
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    projects = result.scalars().all()
    return projects


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建项目"""
    # 检查项目名称是否已存在
    existing_project = await db.execute(
        select(Project).where(Project.name == project.name)
    )
    if existing_project.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="项目名称已存在"
        )
    
    # 创建项目
    new_project = Project(
        **project.dict(),
        owner_id=current_user.id
    )
    
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    
    return new_project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取项目详情"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新项目"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 如果更新名称，检查是否重复
    if project_update.name and project_update.name != project.name:
        existing_project = await db.execute(
            select(Project).where(Project.name == project_update.name)
        )
        if existing_project.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="项目名称已存在"
            )
    
    # 更新字段
    update_data = project_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    await db.commit()
    await db.refresh(project)
    
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除项目"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 检查是否有关联数据，如果有则不允许删除
    from app.models.test_case import TestCase
    from app.models.interface import Interface
    from app.models.module import Module
    from app.models.directory import Directory
    from app.models.test_execution import TestExecution
    from app.models.test_case_collection import TestCaseCollection
    from app.models.test_plan import TestPlan
    
    # 检查测试用例
    test_case_result = await db.execute(select(func.count(TestCase.id)).where(TestCase.project_id == project_id))
    test_case_count = test_case_result.scalar() or 0
    
    # 检查接口
    interface_result = await db.execute(select(func.count(Interface.id)).where(Interface.project_id == project_id))
    interface_count = interface_result.scalar() or 0
    
    # 检查模块
    module_result = await db.execute(select(func.count(Module.id)).where(Module.project_id == project_id))
    module_count = module_result.scalar() or 0
    
    # 检查目录
    directory_result = await db.execute(select(func.count(Directory.id)).where(Directory.project_id == project_id))
    directory_count = directory_result.scalar() or 0
    
    # 检查测试执行
    execution_result = await db.execute(select(func.count(TestExecution.id)).where(TestExecution.project_id == project_id))
    execution_count = execution_result.scalar() or 0
    
    # 检查用例集
    collection_result = await db.execute(select(func.count(TestCaseCollection.id)).where(TestCaseCollection.project_id == project_id))
    collection_count = collection_result.scalar() or 0
    
    # 检查测试计划
    plan_result = await db.execute(select(func.count(TestPlan.id)).where(TestPlan.project_id == project_id))
    plan_count = plan_result.scalar() or 0
    
    # 汇总关联数据
    related_counts = []
    if test_case_count > 0:
        related_counts.append(f"测试用例({test_case_count})")
    if interface_count > 0:
        related_counts.append(f"接口({interface_count})")
    if module_count > 0:
        related_counts.append(f"模块({module_count})")
    if directory_count > 0:
        related_counts.append(f"目录({directory_count})")
    if execution_count > 0:
        related_counts.append(f"测试执行({execution_count})")
    if collection_count > 0:
        related_counts.append(f"用例集({collection_count})")
    if plan_count > 0:
        related_counts.append(f"测试计划({plan_count})")
    
    if related_counts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无法删除项目，该项目下存在关联数据：{', '.join(related_counts)}。请先删除这些关联数据后再删除项目。"
        )
    
    # 使用 delete 语句删除
    await db.execute(delete(Project).where(Project.id == project_id))
    await db.commit()
    
    return None

