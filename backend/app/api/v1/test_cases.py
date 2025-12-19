"""
测试用例管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import Optional, List
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.test_case import TestCase, TestType
from app.models.user import User
from app.schemas.test_case import TestCaseCreate, TestCaseUpdate, TestCaseResponse

router = APIRouter()


@router.get("/", response_model=List[TestCaseResponse])
async def get_test_cases(
    project_id: Optional[int] = Query(None, description="项目ID"),
    test_type: Optional[TestType] = Query(None, description="测试类型"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    status: Optional[str] = Query(None, description="状态筛选"),
    created_by: Optional[int] = Query(None, description="创建人ID"),
    owner_id: Optional[int] = Query(None, description="负责人ID"),
    module: Optional[str] = Query(None, description="模块"),
    favorite: Optional[bool] = Query(None, description="是否收藏（true表示只显示我收藏的）"),
    is_template: Optional[bool] = Query(None, description="是否为系统模板"),
    is_shared: Optional[bool] = Query(None, description="是否共享"),
    is_common: Optional[bool] = Query(None, description="是否为常用用例"),
    start_date: Optional[str] = Query(None, description="开始日期（YYYY-MM-DD）"),
    end_date: Optional[str] = Query(None, description="结束日期（YYYY-MM-DD）"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取测试用例列表"""
    query = select(TestCase)
    conditions = []
    
    if project_id:
        conditions.append(TestCase.project_id == project_id)
    
    if test_type:
        conditions.append(TestCase.test_type == test_type)
    
    if status:
        conditions.append(TestCase.status == status)
    
    if created_by is not None:
        if created_by == 0:  # 特殊值0表示查询我创建的
            conditions.append(TestCase.created_by == current_user.id)
        else:
            conditions.append(TestCase.created_by == created_by)
    
    if owner_id is not None:
        if owner_id == 0:  # 特殊值0表示查询我负责的
            conditions.append(TestCase.owner_id == current_user.id)
        else:
            conditions.append(TestCase.owner_id == owner_id)
    
    if module:
        conditions.append(TestCase.module == module)
    
    if favorite:  # 查询我收藏的
        from sqlalchemy import cast, String
        conditions.append(
            cast(TestCase.is_favorite, String).like(f'%{current_user.id}%')
        )
    
    if search:
        conditions.append(
            or_(
                TestCase.name.ilike(f"%{search}%"),
                TestCase.description.ilike(f"%{search}%")
            )
        )
    
    # 时间筛选
    if start_date:
        from datetime import datetime
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            conditions.append(TestCase.created_at >= start_dt)
        except ValueError:
            pass
    
    if end_date:
        from datetime import datetime, timedelta
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            conditions.append(TestCase.created_at < end_dt)
        except ValueError:
            pass
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(TestCase.created_at.desc())
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    test_cases = result.scalars().all()
    return test_cases


@router.post("/", response_model=TestCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_test_case(
    test_case: TestCaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建测试用例"""
    # 检查项目是否存在
    from app.models.project import Project
    project_result = await db.execute(select(Project).where(Project.id == test_case.project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 创建测试用例
    test_case_data = test_case.dict()
    test_case_data['created_by'] = current_user.id
    if not test_case_data.get('owner_id'):
        test_case_data['owner_id'] = current_user.id  # 默认负责人为创建人
    new_test_case = TestCase(**test_case_data)
    
    db.add(new_test_case)
    await db.commit()
    await db.refresh(new_test_case)
    
    return new_test_case


@router.get("/{test_case_id}", response_model=TestCaseResponse)
async def get_test_case(
    test_case_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取测试用例详情"""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    test_case = result.scalar_one_or_none()
    
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )
    
    return test_case


@router.put("/{test_case_id}", response_model=TestCaseResponse)
async def update_test_case(
    test_case_id: int,
    test_case_update: TestCaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新测试用例"""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    test_case = result.scalar_one_or_none()
    
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )
    
    # 更新字段
    update_data = test_case_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(test_case, field, value)
    
    await db.commit()
    await db.refresh(test_case)
    
    return test_case


@router.delete("/{test_case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_case(
    test_case_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除测试用例"""
    try:
        result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
        test_case = result.scalar_one_or_none()
        
        if not test_case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="测试用例不存在"
            )
        
        # 删除关联数据（按依赖顺序）
        from sqlalchemy import delete, update
        from app.models.test_execution import TestExecution
        from app.models.test_case_version import TestCaseVersion
        from app.models.test_case_review import TestCaseReview
        from app.models.test_plan import TestPlan
        from app.models.test_case_collection import TestCaseCollection
        
        # 1. 删除执行记录
        await db.execute(delete(TestExecution).where(TestExecution.test_case_id == test_case_id))
        
        # 2. 删除版本记录
        await db.execute(delete(TestCaseVersion).where(TestCaseVersion.test_case_id == test_case_id))
        
        # 3. 删除评审记录
        await db.execute(delete(TestCaseReview).where(TestCaseReview.test_case_id == test_case_id))
        
        # 4. 从测试计划中移除（更新JSON字段）
        plans_result = await db.execute(select(TestPlan))
        plans = plans_result.scalars().all()
        for plan in plans:
            if plan.test_case_ids and test_case_id in plan.test_case_ids:
                plan.test_case_ids = [id for id in plan.test_case_ids if id != test_case_id]
        
        # 5. 从用例集合中移除（更新JSON字段）
        collections_result = await db.execute(select(TestCaseCollection))
        collections = collections_result.scalars().all()
        for collection in collections:
            if collection.test_case_ids and test_case_id in collection.test_case_ids:
                collection.test_case_ids = [id for id in collection.test_case_ids if id != test_case_id]
        
        # 6. 最后删除测试用例本身
        await db.execute(delete(TestCase).where(TestCase.id == test_case_id))
        
        await db.commit()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        import traceback
        error_detail = f"删除测试用例失败: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)  # 记录到日志
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除测试用例失败: {str(e)}"
        )

