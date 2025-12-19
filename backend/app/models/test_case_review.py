"""
测试用例评审模型
"""
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ReviewStatus(str, enum.Enum):
    """评审状态枚举"""
    PENDING = "pending"  # 待评审
    REVIEWING = "reviewing"  # 评审中
    APPROVED = "approved"  # 已通过
    REJECTED = "rejected"  # 已拒绝
    REVISED = "revised"  # 已修订


class TestCaseReview(Base):
    """测试用例评审模型"""
    __tablename__ = "test_case_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=False)  # 关联的测试用例
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)  # 项目ID
    title = Column(String(200), nullable=False)  # 评审标题
    description = Column(Text)  # 评审描述
    status = Column(Enum(ReviewStatus), nullable=False, default=ReviewStatus.PENDING)  # 评审状态
    reviewer_ids = Column(JSON, default=[])  # 评审人ID列表
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # 创建人（发起评审的人）
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # 当前评审人
    review_comments = Column(JSON, default=[])  # 评审意见列表
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    reviewed_at = Column(DateTime(timezone=True))  # 评审完成时间
    
    # 关系
    test_case = relationship("TestCase", backref="reviews")
    project = relationship("Project", backref="test_case_reviews")
    creator = relationship("User", foreign_keys=[created_by], backref="created_test_case_reviews")
    reviewer = relationship("User", foreign_keys=[reviewed_by], backref="reviewing_test_case_reviews")


class ReviewComment(Base):
    """评审意见模型"""
    __tablename__ = "review_comments"
    
    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("test_case_reviews.id"), nullable=False)  # 关联的评审
    commenter_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # 评论人
    content = Column(Text, nullable=False)  # 评论内容
    type = Column(String(50), default='comment')  # 评论类型：comment（普通评论）、approve（通过）、reject（拒绝）
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    review = relationship("TestCaseReview", backref="comments")
    commenter = relationship("User", foreign_keys=[commenter_id], backref="review_comments")

