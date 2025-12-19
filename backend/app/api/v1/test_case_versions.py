"""
测试用例版本管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, desc
from typing import List, Optional
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.test_case_version import TestCaseVersion
from app.models.test_case import TestCase
from app.models.user import User
from app.schemas.test_case_version import TestCaseVersionCreate, TestCaseVersionUpdate, TestCaseVersionResponse

router = APIRouter()


@router.get("/", response_model=List[TestCaseVersionResponse])
async def get_test_case_versions(
    test_case_id: Optional[int] = Query(None, description="测试用例ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取测试用例版本列表"""
    query = select(TestCaseVersion)
    
    if test_case_id:
        query = query.where(TestCaseVersion.test_case_id == test_case_id)
    
    query = query.order_by(desc(TestCaseVersion.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    versions = result.scalars().all()
    
    return [TestCaseVersionResponse.model_validate(v) for v in versions]


@router.post("/", response_model=TestCaseVersionResponse, status_code=status.HTTP_201_CREATED)
async def create_test_case_version(
    version: TestCaseVersionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建测试用例版本"""
    # 检查测试用例是否存在
    test_case = await db.get(TestCase, version.test_case_id)
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )
    
    # 检查版本号是否已存在
    existing_result = await db.execute(
        select(TestCaseVersion).where(
            and_(
                TestCaseVersion.test_case_id == version.test_case_id,
                TestCaseVersion.version == version.version
            )
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="该版本号已存在"
        )
    
    # 如果没有提供content，自动从当前测试用例创建快照
    if not version.content:
        version.content = {
            "name": test_case.name,
            "description": test_case.description,
            "project_id": test_case.project_id,
            "test_type": test_case.test_type.value if hasattr(test_case.test_type, 'value') else str(test_case.test_type),
            "steps": test_case.steps or [],
            "config": test_case.config or {},
            "tags": test_case.tags or [],
            "module": test_case.module,
            "status": test_case.status,
            "workflow": test_case.workflow,
            "is_multi_interface": test_case.is_multi_interface,
            "data_driver": test_case.data_driver,
            "is_data_driven": test_case.is_data_driven,
        }
    
    new_version = TestCaseVersion(**version.model_dump())
    new_version.created_by = current_user.id
    db.add(new_version)
    await db.commit()
    await db.refresh(new_version)
    
    return TestCaseVersionResponse.model_validate(new_version)


@router.get("/{version_id}", response_model=TestCaseVersionResponse)
async def get_test_case_version(
    version_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取测试用例版本详情"""
    version = await db.get(TestCaseVersion, version_id)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="版本不存在"
        )
    return TestCaseVersionResponse.model_validate(version)


@router.put("/{version_id}", response_model=TestCaseVersionResponse)
async def update_test_case_version(
    version_id: int,
    version_update: TestCaseVersionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新测试用例版本（仅更新名称和备注）"""
    version = await db.get(TestCaseVersion, version_id)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="版本不存在"
        )
    
    update_data = version_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(version, key, value)
    
    await db.commit()
    await db.refresh(version)
    
    return TestCaseVersionResponse.model_validate(version)


@router.delete("/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_case_version(
    version_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除测试用例版本"""
    version = await db.get(TestCaseVersion, version_id)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="版本不存在"
        )
    
    await db.execute(delete(TestCaseVersion).where(TestCaseVersion.id == version_id))
    await db.commit()
    
    return {"message": "版本删除成功"}


@router.post("/{version_id}/restore", response_model=dict)
async def restore_test_case_version(
    version_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """恢复测试用例到指定版本"""
    version = await db.get(TestCaseVersion, version_id)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="版本不存在"
        )
    
    test_case = await db.get(TestCase, version.test_case_id)
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )
    
    # 恢复版本内容到测试用例
    content = version.content or {}
    if "name" in content:
        test_case.name = content["name"]
    if "description" in content:
        test_case.description = content.get("description")
    if "steps" in content:
        test_case.steps = content.get("steps")
    if "config" in content:
        test_case.config = content.get("config")
    if "tags" in content:
        test_case.tags = content.get("tags")
    if "module" in content:
        test_case.module = content.get("module")
    if "status" in content:
        test_case.status = content.get("status")
    if "workflow" in content:
        test_case.workflow = content.get("workflow")
    if "is_multi_interface" in content:
        test_case.is_multi_interface = content.get("is_multi_interface", False)
    if "data_driver" in content:
        test_case.data_driver = content.get("data_driver")
    if "is_data_driven" in content:
        test_case.is_data_driven = content.get("is_data_driven", False)
    
    await db.commit()
    await db.refresh(test_case)
    
    return {"message": "版本恢复成功", "test_case_id": test_case.id}


@router.get("/{version_id}/compare", response_model=dict)
async def compare_test_case_versions(
    version_id: int,
    compare_with: Optional[int] = Query(None, description="要对比的版本ID（不提供则与当前版本对比）"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """对比测试用例版本"""
    version = await db.get(TestCaseVersion, version_id)
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="版本不存在"
        )
    
    test_case = await db.get(TestCase, version.test_case_id)
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )
    
    # 获取对比版本
    if compare_with:
        compare_version = await db.get(TestCaseVersion, compare_with)
        if not compare_version:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="对比版本不存在"
            )
        compare_content = compare_version.content or {}
    else:
        # 与当前版本对比
        compare_content = {
            "name": test_case.name,
            "description": test_case.description,
            "steps": test_case.steps or [],
            "config": test_case.config or {},
            "tags": test_case.tags or [],
            "module": test_case.module,
            "status": test_case.status,
        }
    
    version_content = version.content or {}
    
    # 简单的字段对比
    differences = {}
    for key in ["name", "description", "module", "status"]:
        if version_content.get(key) != compare_content.get(key):
            differences[key] = {
                "version": version_content.get(key),
                "compare": compare_content.get(key)
            }
    
    # 对比复杂字段（JSON）
    for key in ["steps", "config", "tags"]:
        import json
        version_str = json.dumps(version_content.get(key, []), sort_keys=True)
        compare_str = json.dumps(compare_content.get(key, []), sort_keys=True)
        if version_str != compare_str:
            differences[key] = {
                "version": version_content.get(key),
                "compare": compare_content.get(key)
            }
    
    return {
        "version_id": version_id,
        "version": version.version,
        "compare_with": compare_with or "current",
        "differences": differences
    }

