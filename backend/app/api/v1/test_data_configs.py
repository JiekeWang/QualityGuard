"""
测试数据配置管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, or_, func
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.test_data_config import TestDataConfig, TestCaseTestDataConfig
from app.models.test_case import TestCase
from app.models.user import User
from app.models.project import Project
from app.schemas.test_data_config import (
    TestDataConfigCreate,
    TestDataConfigUpdate,
    TestDataConfigResponse,
    TestDataConfigListResponse,
    TestDataItem,
    UsageInfoResponse,
)

router = APIRouter()


# ========== 测试数据配置管理 ==========
@router.get("/test-data-configs", response_model=List[TestDataConfigListResponse])
async def get_test_data_configs(
    project_id: Optional[int] = Query(None, description="项目ID"),
    is_active: Optional[bool] = Query(None, description="是否激活"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取测试数据配置列表（包含统计信息）"""
    query = select(
        TestDataConfig,
        func.count(TestCaseTestDataConfig.id).label('associated_case_count')
    ).outerjoin(
        TestCaseTestDataConfig,
        TestDataConfig.id == TestCaseTestDataConfig.test_data_config_id
    )
    
    conditions = []
    
    if project_id is not None:
        conditions.append(
            or_(
                TestDataConfig.project_id == project_id,
                TestDataConfig.project_id == None
            )
        )
    if is_active is not None:
        conditions.append(TestDataConfig.is_active == is_active)
    if search:
        conditions.append(
            or_(
                TestDataConfig.name.ilike(f"%{search}%"),
                TestDataConfig.description.ilike(f"%{search}%")
            )
        )
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.group_by(TestDataConfig.id).order_by(TestDataConfig.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    rows = result.all()
    
    configs = []
    for config, count in rows:
        # 计算数据行数
        data_count = len(config.data) if config.data else 0
        configs.append(TestDataConfigListResponse(
            id=config.id,
            name=config.name,
            description=config.description,
            project_id=config.project_id,
            is_active=config.is_active,
            data_count=data_count,
            associated_case_count=count or 0,
            created_by=config.created_by,
            created_at=config.created_at,
            updated_at=config.updated_at
        ))
    
    return configs


@router.post("/test-data-configs", response_model=TestDataConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_test_data_config(
    config: TestDataConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建测试数据配置"""
    # 验证项目是否存在
    if config.project_id:
        project_result = await db.execute(select(Project).where(Project.id == config.project_id))
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    
    # 转换数据格式（Pydantic模型转字典）
    # 如果data是TestDataItem列表，转换为字典；如果已经是字典，直接使用
    data_dict = []
    if config.data:
        for item in config.data:
            if isinstance(item, dict):
                data_dict.append(item)
            else:
                data_dict.append(item.model_dump())
    
    new_config = TestDataConfig(
        name=config.name,
        description=config.description,
        project_id=config.project_id,
        data=data_dict,
        is_active=config.is_active if config.is_active is not None else True,
        created_by=current_user.id
    )
    
    db.add(new_config)
    await db.commit()
    await db.refresh(new_config)
    
    # 转换回Pydantic模型
    response_data = []
    if new_config.data:
        for item in new_config.data:
            if isinstance(item, dict):
                response_data.append(TestDataItem(**item))
            else:
                response_data.append(item)
    
    return TestDataConfigResponse(
        id=new_config.id,
        name=new_config.name,
        description=new_config.description,
        project_id=new_config.project_id,
        data=response_data,
        is_active=new_config.is_active,
        created_by=new_config.created_by,
        created_at=new_config.created_at,
        updated_at=new_config.updated_at
    )


@router.get("/test-data-configs/{config_id}", response_model=TestDataConfigResponse)
async def get_test_data_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取测试数据配置详情"""
    config = await db.get(TestDataConfig, config_id)
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试数据配置不存在")
    
    # 转换数据格式
    response_data = []
    if config.data:
        for item in config.data:
            if isinstance(item, dict):
                response_data.append(TestDataItem(**item))
            else:
                response_data.append(item)
    
    return TestDataConfigResponse(
        id=config.id,
        name=config.name,
        description=config.description,
        project_id=config.project_id,
        data=response_data,
        is_active=config.is_active,
        created_by=config.created_by,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.put("/test-data-configs/{config_id}", response_model=TestDataConfigResponse)
async def update_test_data_config(
    config_id: int,
    config_update: TestDataConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新测试数据配置"""
    config = await db.get(TestDataConfig, config_id)
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试数据配置不存在")
    
    update_data = config_update.model_dump(exclude_unset=True)
    
    # 处理项目ID验证
    if 'project_id' in update_data and update_data['project_id']:
        project_result = await db.execute(select(Project).where(Project.id == update_data['project_id']))
        project = project_result.scalar_one_or_none()
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    
    # 处理data字段（转换为字典列表）
    if 'data' in update_data and update_data['data'] is not None:
        data_list = update_data['data']
        data_dict = []
        for item in data_list:
            if isinstance(item, dict):
                data_dict.append(item)
            else:
                data_dict.append(item.model_dump())
        update_data['data'] = data_dict
    
    for key, value in update_data.items():
        setattr(config, key, value)
    
    await db.commit()
    await db.refresh(config)
    
    # 转换数据格式
    response_data = []
    if config.data:
        for item in config.data:
            if isinstance(item, dict):
                response_data.append(TestDataItem(**item))
            else:
                response_data.append(item)
    
    return TestDataConfigResponse(
        id=config.id,
        name=config.name,
        description=config.description,
        project_id=config.project_id,
        data=response_data,
        is_active=config.is_active,
        created_by=config.created_by,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.delete("/test-data-configs/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_data_config(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除测试数据配置"""
    config = await db.get(TestDataConfig, config_id)
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试数据配置不存在")
    
    # 检查是否有用例关联（可选，如果有关联也可以删除，关联会被级联删除）
    relation_count_result = await db.execute(
        select(func.count(TestCaseTestDataConfig.id)).where(
            TestCaseTestDataConfig.test_data_config_id == config_id
        )
    )
    relation_count = relation_count_result.scalar() or 0
    
    # 注意：级联删除会自动处理关联关系（ON DELETE CASCADE）
    await db.execute(delete(TestDataConfig).where(TestDataConfig.id == config_id))
    await db.commit()
    
    return None


@router.get("/test-data-configs/{config_id}/usage", response_model=List[UsageInfoResponse])
async def get_test_data_config_usage(
    config_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取测试数据配置的使用情况（关联的用例列表）"""
    config = await db.get(TestDataConfig, config_id)
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试数据配置不存在")
    
    # 查询关联的用例
    query = select(
        TestCase.id,
        TestCase.name,
        TestCase.project_id,
        Project.name.label('project_name'),
        TestCaseTestDataConfig.created_at.label('associated_at')
    ).join(
        TestCaseTestDataConfig,
        TestCase.id == TestCaseTestDataConfig.test_case_id
    ).join(
        Project,
        TestCase.project_id == Project.id
    ).where(
        TestCaseTestDataConfig.test_data_config_id == config_id
    )
    
    result = await db.execute(query)
    rows = result.all()
    
    usage_list = []
    for row in rows:
        usage_list.append(UsageInfoResponse(
            test_case_id=row.id,
            test_case_name=row.name,
            project_id=row.project_id,
            project_name=row.project_name,
            associated_at=row.associated_at
        ))
    
    return usage_list

