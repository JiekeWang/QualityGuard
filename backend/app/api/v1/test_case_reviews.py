"""
测试用例评审管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, or_
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.test_case_review import TestCaseReview, ReviewComment, ReviewStatus
from app.models.test_case import TestCase
from app.models.user import User
from app.models.project import Project
from app.schemas.test_case_review import (
    TestCaseReviewCreate, TestCaseReviewUpdate, TestCaseReviewResponse,
    ReviewCommentCreate, ReviewCommentResponse
)

router = APIRouter()


@router.get("/", response_model=List[TestCaseReviewResponse])
async def get_test_case_reviews(
    project_id: Optional[int] = Query(None, description="项目ID"),
    test_case_id: Optional[int] = Query(None, description="测试用例ID"),
    status: Optional[ReviewStatus] = Query(None, description="评审状态"),
    reviewer_id: Optional[int] = Query(None, description="评审人ID（0表示当前用户）"),
    created_by: Optional[int] = Query(None, description="创建人ID（0表示当前用户）"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取测试用例评审列表"""
    query = select(TestCaseReview)
    conditions = []
    
    if project_id:
        conditions.append(TestCaseReview.project_id == project_id)
    if test_case_id:
        conditions.append(TestCaseReview.test_case_id == test_case_id)
    if status:
        conditions.append(TestCaseReview.status == status)
    if reviewer_id is not None:
        if reviewer_id == 0:
            # 查询当前用户作为评审人的评审
            conditions.append(TestCaseReview.reviewer_ids.contains([current_user.id]))
        else:
            conditions.append(TestCaseReview.reviewer_ids.contains([reviewer_id]))
    if created_by is not None:
        if created_by == 0:
            conditions.append(TestCaseReview.created_by == current_user.id)
        else:
            conditions.append(TestCaseReview.created_by == created_by)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(TestCaseReview.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    reviews = result.scalars().all()
    
    # 构建响应数据
    review_responses = []
    for review in reviews:
        review_data = TestCaseReviewResponse.model_validate(review)
        # 获取测试用例名称
        test_case = await db.get(TestCase, review.test_case_id)
        if test_case:
            review_data.test_case_name = test_case.name
        # 获取创建人名称
        creator = await db.get(User, review.created_by)
        if creator:
            review_data.creator_name = creator.username
        # 获取评审人名称
        if review.reviewed_by:
            reviewer = await db.get(User, review.reviewed_by)
            if reviewer:
                review_data.reviewer_name = reviewer.username
        review_responses.append(review_data)
    
    return review_responses


@router.post("/", response_model=TestCaseReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_test_case_review(
    review: TestCaseReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建测试用例评审"""
    # 检查测试用例是否存在
    test_case = await db.get(TestCase, review.test_case_id)
    if not test_case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="测试用例不存在")
    
    # 检查项目是否存在
    project = await db.get(Project, review.project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="项目不存在")
    
    # 检查评审人是否存在
    if review.reviewer_ids:
        for reviewer_id in review.reviewer_ids:
            reviewer = await db.get(User, reviewer_id)
            if not reviewer:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"评审人ID {reviewer_id} 不存在")
    
    new_review = TestCaseReview(**review.model_dump())
    new_review.created_by = current_user.id
    new_review.status = ReviewStatus.PENDING
    if review.reviewer_ids:
        new_review.reviewed_by = review.reviewer_ids[0]  # 设置第一个评审人为当前评审人
    
    db.add(new_review)
    await db.commit()
    await db.refresh(new_review)
    
    review_data = TestCaseReviewResponse.model_validate(new_review)
    review_data.test_case_name = test_case.name
    review_data.creator_name = current_user.username
    return review_data


@router.get("/{review_id}", response_model=TestCaseReviewResponse)
async def get_test_case_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取测试用例评审详情"""
    review = await db.get(TestCaseReview, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评审不存在")
    
    review_data = TestCaseReviewResponse.model_validate(review)
    # 获取测试用例名称
    test_case = await db.get(TestCase, review.test_case_id)
    if test_case:
        review_data.test_case_name = test_case.name
    # 获取创建人名称
    creator = await db.get(User, review.created_by)
    if creator:
        review_data.creator_name = creator.username
    # 获取评审人名称
    if review.reviewed_by:
        reviewer = await db.get(User, review.reviewed_by)
        if reviewer:
            review_data.reviewer_name = reviewer.username
    
    return review_data


@router.put("/{review_id}", response_model=TestCaseReviewResponse)
async def update_test_case_review(
    review_id: int,
    review_update: TestCaseReviewUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新测试用例评审"""
    review = await db.get(TestCaseReview, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评审不存在")
    
    update_data = review_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(review, key, value)
    
    await db.commit()
    await db.refresh(review)
    
    review_data = TestCaseReviewResponse.model_validate(review)
    test_case = await db.get(TestCase, review.test_case_id)
    if test_case:
        review_data.test_case_name = test_case.name
    return review_data


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test_case_review(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除测试用例评审"""
    review = await db.get(TestCaseReview, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评审不存在")
    
    # 只有创建人可以删除
    if review.created_by != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权删除此评审")
    
    await db.execute(delete(TestCaseReview).where(TestCaseReview.id == review_id))
    await db.commit()
    return {"message": "评审删除成功"}


@router.post("/{review_id}/comments", response_model=ReviewCommentResponse, status_code=status.HTTP_201_CREATED)
async def create_review_comment(
    review_id: int,
    comment: ReviewCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建评审意见"""
    review = await db.get(TestCaseReview, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评审不存在")
    
    new_comment = ReviewComment(
        review_id=review_id,
        commenter_id=current_user.id,
        content=comment.content,
        type=comment.type or 'comment'
    )
    db.add(new_comment)
    
    # 更新评审状态和意见列表
    if not review.review_comments:
        review.review_comments = []
    review.review_comments.append({
        "id": None,  # 将在提交后更新
        "commenter_id": current_user.id,
        "commenter_name": current_user.username,
        "content": comment.content,
        "type": comment.type or 'comment',
        "created_at": datetime.utcnow().isoformat()
    })
    
    # 如果评论类型是approve或reject，更新评审状态
    if comment.type == 'approve':
        review.status = ReviewStatus.APPROVED
        review.reviewed_at = datetime.utcnow()
    elif comment.type == 'reject':
        review.status = ReviewStatus.REJECTED
        review.reviewed_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(new_comment)
    
    comment_data = ReviewCommentResponse.model_validate(new_comment)
    comment_data.commenter_name = current_user.username
    return comment_data


@router.get("/{review_id}/comments", response_model=List[ReviewCommentResponse])
async def get_review_comments(
    review_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取评审意见列表"""
    review = await db.get(TestCaseReview, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评审不存在")
    
    result = await db.execute(
        select(ReviewComment).where(ReviewComment.review_id == review_id).order_by(ReviewComment.created_at.asc())
    )
    comments = result.scalars().all()
    
    comment_responses = []
    for comment in comments:
        comment_data = ReviewCommentResponse.model_validate(comment)
        commenter = await db.get(User, comment.commenter_id)
        if commenter:
            comment_data.commenter_name = commenter.username
        comment_responses.append(comment_data)
    
    return comment_responses


@router.post("/{review_id}/approve", response_model=TestCaseReviewResponse)
async def approve_review(
    review_id: int,
    comment: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """通过评审"""
    review = await db.get(TestCaseReview, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评审不存在")
    
    # 检查当前用户是否是评审人
    if current_user.id not in (review.reviewer_ids or []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="您不是此评审的评审人")
    
    review.status = ReviewStatus.APPROVED
    review.reviewed_by = current_user.id
    review.reviewed_at = datetime.utcnow()
    
    # 添加评审意见
    if comment:
        if not review.review_comments:
            review.review_comments = []
        review.review_comments.append({
            "commenter_id": current_user.id,
            "commenter_name": current_user.username,
            "content": comment,
            "type": "approve",
            "created_at": datetime.utcnow().isoformat()
        })
    
    await db.commit()
    await db.refresh(review)
    
    review_data = TestCaseReviewResponse.model_validate(review)
    test_case = await db.get(TestCase, review.test_case_id)
    if test_case:
        review_data.test_case_name = test_case.name
    return review_data


@router.post("/{review_id}/reject", response_model=TestCaseReviewResponse)
async def reject_review(
    review_id: int,
    comment: str = Query(..., description="拒绝原因"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """拒绝评审"""
    review = await db.get(TestCaseReview, review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="评审不存在")
    
    # 检查当前用户是否是评审人
    if current_user.id not in (review.reviewer_ids or []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="您不是此评审的评审人")
    
    review.status = ReviewStatus.REJECTED
    review.reviewed_by = current_user.id
    review.reviewed_at = datetime.utcnow()
    
    # 添加评审意见
    if not review.review_comments:
        review.review_comments = []
    review.review_comments.append({
        "commenter_id": current_user.id,
        "commenter_name": current_user.username,
        "content": comment,
        "type": "reject",
        "created_at": datetime.utcnow().isoformat()
    })
    
    await db.commit()
    await db.refresh(review)
    
    review_data = TestCaseReviewResponse.model_validate(review)
    test_case = await db.get(TestCase, review.test_case_id)
    if test_case:
        review_data.test_case_name = test_case.name
    return review_data

