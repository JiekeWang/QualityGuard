"""
测试用例集管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, List
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.test_case_collection import TestCaseCollection
from app.models.user import User
from app.schemas.test_case_collection import TestCaseCollectionCreate, TestCaseCollectionUpdate, TestCaseCollectionResponse

router = APIRouter()


@router.get("/", response_model=List[TestCaseCollectionResponse])
async def get_test_case_collections(
    project_id: Optional[int] = Query(None, description="项目ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取测试用例集列表"""
    query = select(TestCaseCollection)
    conditions = []
    
    if project_id:
        conditions.append(TestCaseCollection.project_id == project_id)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(TestCaseCollection.order.asc(), TestCaseCollection.created_at.desc())
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    collections = result.scalars().all()
    return collections


@router.post("/", response_model=TestCaseCollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_test_case_collection(
    collection: TestCaseCollectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建测试用例集"""
    # 检查项目是否存在
    from app.models.project import Project
    project_result = await db.execute(select(Project).where(Project.id == collection.project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 创建测试用例集
    new_collection = TestCaseCollection(**collection.dict())
    
    db.add(new_collection)
    await db.commit()
    await db.refresh(new_collection)
    
    return new_collection


@router.get("/{collection_id}", response_model=TestCaseCollectionResponse)
async def get_test_case_collection(
    collection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取测试用例集详情"""
    result = await db.execute(select(TestCaseCollection).where(TestCaseCollection.id == collection_id))
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例集不存在"
        )
    
    return collection


@router.put("/{collection_id}", response_model=TestCaseCollectionResponse)
async def update_test_case_collection(
    collection_id: int,
    collection_update: TestCaseCollectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新测试用例集"""
    result = await db.execute(select(TestCaseCollection).where(TestCaseCollection.id == collection_id))
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例集不存在"
        )
    
    # 更新字段
    update_data = collection_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(collection, field, value)
    
    await db.commit()
    await db.refresh(collection)
    
    return collection


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_case_collection(
    collection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除测试用例集"""
    result = await db.execute(select(TestCaseCollection).where(TestCaseCollection.id == collection_id))
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例集不存在"
        )
    
    from sqlalchemy import delete
    await db.execute(delete(TestCaseCollection).where(TestCaseCollection.id == collection_id))
    await db.commit()
    
    return None

