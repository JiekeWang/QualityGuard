"""
测试用例收藏管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.test_case import TestCase
from app.models.user import User

router = APIRouter()


@router.post("/{test_case_id}/favorite", status_code=status.HTTP_200_OK)
async def add_favorite(
    test_case_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """收藏测试用例"""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    test_case = result.scalar_one_or_none()
    
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )
    
    # 更新收藏列表
    favorites = test_case.is_favorite or []
    if isinstance(favorites, list):
        if current_user.id not in favorites:
            favorites.append(current_user.id)
            test_case.is_favorite = favorites
    else:
        test_case.is_favorite = [current_user.id]
    
    await db.commit()
    await db.refresh(test_case)
    
    return {"message": "收藏成功", "favorites": test_case.is_favorite}


@router.delete("/{test_case_id}/favorite", status_code=status.HTTP_200_OK)
async def remove_favorite(
    test_case_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """取消收藏测试用例"""
    result = await db.execute(select(TestCase).where(TestCase.id == test_case_id))
    test_case = result.scalar_one_or_none()
    
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )
    
    # 更新收藏列表
    favorites = test_case.is_favorite or []
    if isinstance(favorites, list) and current_user.id in favorites:
        favorites.remove(current_user.id)
        test_case.is_favorite = favorites
    
    await db.commit()
    await db.refresh(test_case)
    
    return {"message": "取消收藏成功", "favorites": test_case.is_favorite}

