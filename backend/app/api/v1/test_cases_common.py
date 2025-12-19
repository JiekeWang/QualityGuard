"""
测试用例常用功能API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.test_case import TestCase
from app.models.user import User

router = APIRouter()


@router.post("/{test_case_id}/mark-as-common", status_code=status.HTTP_200_OK)
async def mark_as_common(
    test_case_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """标记为常用用例"""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    test_case = result.scalar_one_or_none()
    
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )
    
    test_case.is_common = True
    await db.commit()
    await db.refresh(test_case)
    
    return {"message": "已标记为常用用例", "test_case": test_case}


@router.delete("/{test_case_id}/mark-as-common", status_code=status.HTTP_200_OK)
async def unmark_as_common(
    test_case_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """取消常用用例标记"""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    test_case = result.scalar_one_or_none()
    
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )
    
    test_case.is_common = False
    await db.commit()
    await db.refresh(test_case)
    
    return {"message": "已取消常用用例标记", "test_case": test_case}


@router.post("/{test_case_id}/share", status_code=status.HTTP_200_OK)
async def share_test_case(
    test_case_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """共享测试用例"""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    test_case = result.scalar_one_or_none()
    
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )
    
    # 检查权限：只有创建人或负责人可以共享
    if test_case.created_by != current_user.id and test_case.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权共享此测试用例"
        )
    
    test_case.is_shared = True
    await db.commit()
    await db.refresh(test_case)
    
    return {"message": "已共享测试用例", "test_case": test_case}


@router.delete("/{test_case_id}/share", status_code=status.HTTP_200_OK)
async def unshare_test_case(
    test_case_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """取消共享测试用例"""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    test_case = result.scalar_one_or_none()
    
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )
    
    # 检查权限：只有创建人或负责人可以取消共享
    if test_case.created_by != current_user.id and test_case.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权取消共享此测试用例"
        )
    
    test_case.is_shared = False
    await db.commit()
    await db.refresh(test_case)
    
    return {"message": "已取消共享测试用例", "test_case": test_case}


@router.post("/{test_case_id}/use", status_code=status.HTTP_200_OK)
async def use_test_case(
    test_case_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """使用测试用例（增加使用次数）"""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    test_case = result.scalar_one_or_none()
    
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )
    
    # 增加使用次数
    test_case.usage_count = (test_case.usage_count or 0) + 1
    await db.commit()
    await db.refresh(test_case)
    
    return {"message": "使用次数已更新", "usage_count": test_case.usage_count}

