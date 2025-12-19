"""
数据驱动配置管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, or_
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.data_driver import DataSource, DataTemplate, DataGenerator
from app.models.user import User
from app.models.project import Project
from app.schemas.data_driver import (
    DataSourceCreate, DataSourceUpdate, DataSourceResponse,
    DataTemplateCreate, DataTemplateUpdate, DataTemplateResponse,
    DataGeneratorCreate, DataGeneratorUpdate, DataGeneratorResponse
)

router = APIRouter()


# ========== 数据源管理 ==========
@router.get("/data-sources", response_model=List[DataSourceResponse])
async def get_data_sources(
    project_id: Optional[int] = Query(None, description="项目ID"),
    type: Optional[str] = Query(None, description="数据源类型"),
    is_active: Optional[bool] = Query(None, description="是否激活"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取数据源列表"""
    query = select(DataSource)
    conditions = []
    
    if project_id is not None:
        conditions.append(
            or_(
                DataSource.project_id == project_id,
                DataSource.project_id == None
            )
        )
    if type:
        conditions.append(DataSource.type == type)
    if is_active is not None:
        conditions.append(DataSource.is_active == is_active)
    if search:
        conditions.append(
            or_(
                DataSource.name.ilike(f"%{search}%"),
                DataSource.description.ilike(f"%{search}%")
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(DataSource.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    sources = result.scalars().all()
    
    return [DataSourceResponse.model_validate(s) for s in sources]


@router.post("/data-sources", response_model=DataSourceResponse, status_code=status.HTTP_201_CREATED)
async def create_data_source(
    source: DataSourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建数据源"""
    if source.project_id:
        project_result = await db.execute(select(Project).where(Project.id == source.project_id))
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    
    new_source = DataSource(**source.model_dump())
    new_source.created_by = current_user.id
    db.add(new_source)
    await db.commit()
    await db.refresh(new_source)
    return DataSourceResponse.model_validate(new_source)


@router.get("/data-sources/{source_id}", response_model=DataSourceResponse)
async def get_data_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取数据源详情"""
    source = await db.get(DataSource, source_id)
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据源不存在")
    return DataSourceResponse.model_validate(source)


@router.put("/data-sources/{source_id}", response_model=DataSourceResponse)
async def update_data_source(
    source_id: int,
    source_update: DataSourceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新数据源"""
    source = await db.get(DataSource, source_id)
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据源不存在")
    
    update_data = source_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(source, key, value)
    
    await db.commit()
    await db.refresh(source)
    return DataSourceResponse.model_validate(source)


@router.delete("/data-sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_data_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除数据源"""
    source = await db.get(DataSource, source_id)
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据源不存在")
    
    await db.execute(delete(DataSource).where(DataSource.id == source_id))
    await db.commit()
    return {"message": "数据源删除成功"}


# ========== 数据模板管理 ==========
@router.get("/data-templates", response_model=List[DataTemplateResponse])
async def get_data_templates(
    project_id: Optional[int] = Query(None, description="项目ID"),
    data_source_id: Optional[int] = Query(None, description="数据源ID"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取数据模板列表"""
    query = select(DataTemplate)
    conditions = []
    
    if project_id is not None:
        conditions.append(
            or_(
                DataTemplate.project_id == project_id,
                DataTemplate.project_id == None
            )
        )
    if data_source_id:
        conditions.append(DataTemplate.data_source_id == data_source_id)
    if search:
        conditions.append(
            or_(
                DataTemplate.name.ilike(f"%{search}%"),
                DataTemplate.description.ilike(f"%{search}%")
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(DataTemplate.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    templates = result.scalars().all()
    
    return [DataTemplateResponse.model_validate(t) for t in templates]


@router.post("/data-templates", response_model=DataTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_data_template(
    template: DataTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建数据模板"""
    # 检查数据源是否存在
    source_result = await db.execute(select(DataSource).where(DataSource.id == template.data_source_id))
    source = source_result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据源不存在")
    
    new_template = DataTemplate(**template.model_dump())
    new_template.created_by = current_user.id
    db.add(new_template)
    await db.commit()
    await db.refresh(new_template)
    return DataTemplateResponse.model_validate(new_template)


@router.get("/data-templates/{template_id}", response_model=DataTemplateResponse)
async def get_data_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取数据模板详情"""
    template = await db.get(DataTemplate, template_id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据模板不存在")
    return DataTemplateResponse.model_validate(template)


@router.put("/data-templates/{template_id}", response_model=DataTemplateResponse)
async def update_data_template(
    template_id: int,
    template_update: DataTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新数据模板"""
    template = await db.get(DataTemplate, template_id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据模板不存在")
    
    update_data = template_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)
    
    await db.commit()
    await db.refresh(template)
    return DataTemplateResponse.model_validate(template)


@router.delete("/data-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_data_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除数据模板"""
    template = await db.get(DataTemplate, template_id)
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据模板不存在")
    
    await db.execute(delete(DataTemplate).where(DataTemplate.id == template_id))
    await db.commit()
    return {"message": "数据模板删除成功"}


# ========== 数据生成器管理 ==========
@router.get("/data-generators", response_model=List[DataGeneratorResponse])
async def get_data_generators(
    project_id: Optional[int] = Query(None, description="项目ID"),
    type: Optional[str] = Query(None, description="生成器类型"),
    is_active: Optional[bool] = Query(None, description="是否激活"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取数据生成器列表"""
    query = select(DataGenerator)
    conditions = []
    
    if project_id is not None:
        conditions.append(
            or_(
                DataGenerator.project_id == project_id,
                DataGenerator.project_id == None
            )
        )
    if type:
        conditions.append(DataGenerator.type == type)
    if is_active is not None:
        conditions.append(DataGenerator.is_active == is_active)
    if search:
        conditions.append(
            or_(
                DataGenerator.name.ilike(f"%{search}%"),
                DataGenerator.description.ilike(f"%{search}%")
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(DataGenerator.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    generators = result.scalars().all()
    
    return [DataGeneratorResponse.model_validate(g) for g in generators]


@router.post("/data-generators", response_model=DataGeneratorResponse, status_code=status.HTTP_201_CREATED)
async def create_data_generator(
    generator: DataGeneratorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建数据生成器"""
    new_generator = DataGenerator(**generator.model_dump())
    new_generator.created_by = current_user.id
    db.add(new_generator)
    await db.commit()
    await db.refresh(new_generator)
    return DataGeneratorResponse.model_validate(new_generator)


@router.get("/data-generators/{generator_id}", response_model=DataGeneratorResponse)
async def get_data_generator(
    generator_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取数据生成器详情"""
    generator = await db.get(DataGenerator, generator_id)
    if not generator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据生成器不存在")
    return DataGeneratorResponse.model_validate(generator)


@router.put("/data-generators/{generator_id}", response_model=DataGeneratorResponse)
async def update_data_generator(
    generator_id: int,
    generator_update: DataGeneratorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新数据生成器"""
    generator = await db.get(DataGenerator, generator_id)
    if not generator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据生成器不存在")
    
    update_data = generator_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(generator, key, value)
    
    await db.commit()
    await db.refresh(generator)
    return DataGeneratorResponse.model_validate(generator)


@router.delete("/data-generators/{generator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_data_generator(
    generator_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除数据生成器"""
    generator = await db.get(DataGenerator, generator_id)
    if not generator:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="数据生成器不存在")
    
    await db.execute(delete(DataGenerator).where(DataGenerator.id == generator_id))
    await db.commit()
    return {"message": "数据生成器删除成功"}

