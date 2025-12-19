"""
测试用例评审相关的 Pydantic 模型
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.test_case_review import ReviewStatus


class ReviewCommentBase(BaseModel):
    """评审意见基础模型"""
    content: str = Field(..., min_length=1, description="评论内容")
    type: Optional[str] = Field(default='comment', description="评论类型")


class ReviewCommentCreate(ReviewCommentBase):
    """创建评审意见模型"""
    pass


class ReviewCommentResponse(ReviewCommentBase):
    """评审意见响应模型"""
    id: int
    review_id: int
    commenter_id: int
    commenter_name: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TestCaseReviewBase(BaseModel):
    """测试用例评审基础模型"""
    test_case_id: int = Field(..., description="测试用例ID")
    project_id: int = Field(..., description="项目ID")
    title: str = Field(..., min_length=1, max_length=200, description="评审标题")
    description: Optional[str] = Field(None, description="评审描述")
    reviewer_ids: Optional[List[int]] = Field(default=[], description="评审人ID列表")


class TestCaseReviewCreate(TestCaseReviewBase):
    """创建测试用例评审模型"""
    pass


class TestCaseReviewUpdate(BaseModel):
    """更新测试用例评审模型"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[ReviewStatus] = None
    reviewer_ids: Optional[List[int]] = None
    reviewed_by: Optional[int] = None


class TestCaseReviewResponse(TestCaseReviewBase):
    """测试用例评审响应模型"""
    id: int
    status: ReviewStatus
    created_by: int
    reviewed_by: Optional[int] = None
    review_comments: List[Dict[str, Any]] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    test_case_name: Optional[str] = None
    creator_name: Optional[str] = None
    reviewer_name: Optional[str] = None
    
    class Config:
        from_attributes = True

