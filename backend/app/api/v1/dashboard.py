"""
仪表盘API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.models.project import Project
from app.models.test_case import TestCase
from app.models.test_execution import TestExecution, ExecutionStatus
from app.models.interface import Interface
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter()


class DashboardStats(BaseModel):
    """仪表盘统计数据"""
    # 工作台数据
    pending_tasks: int = 0  # 待执行任务
    pending_reviews: int = 0  # 待评审用例
    today_completed: int = 0  # 今日已完成
    week_workload: Dict[str, Any] = {}  # 本周工作量统计
    
    # 项目健康度
    interface_coverage: float = 0.0  # 接口覆盖率
    case_coverage: float = 0.0  # 用例覆盖率
    automation_rate: float = 0.0  # 自动化率
    
    # 项目概览
    total_projects: int = 0  # 项目总数
    active_projects: int = 0  # 活跃项目数
    
    # 质量总览
    overall_pass_rate: float = 0.0  # 整体通过率
    total_executions: int = 0  # 总执行次数
    success_executions: int = 0  # 成功执行次数
    failed_executions: int = 0  # 失败执行次数
    
    # 今日数据
    today_executions: int = 0  # 今日执行次数
    today_success: int = 0  # 今日成功
    today_failed: int = 0  # 今日失败
    avg_response_time: float = 0.0  # 平均响应时间


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取仪表盘统计数据"""
    today = datetime.utcnow().date()
    week_start = today - timedelta(days=today.weekday())
    
    # 项目统计
    project_count = await db.execute(select(func.count(Project.id)))
    total_projects = project_count.scalar() or 0
    
    # 接口统计
    interface_count = await db.execute(select(func.count(Interface.id)))
    total_interfaces = interface_count.scalar() or 0
    
    # 测试用例统计
    case_count = await db.execute(select(func.count(TestCase.id)))
    total_cases = case_count.scalar() or 0
    
    # 测试执行统计
    execution_count = await db.execute(select(func.count(TestExecution.id)))
    total_executions = execution_count.scalar() or 0
    
    # 今日执行统计
    today_start = datetime.combine(today, datetime.min.time())
    today_executions_query = select(func.count(TestExecution.id)).where(
        TestExecution.created_at >= today_start
    )
    today_executions_result = await db.execute(today_executions_query)
    today_executions = today_executions_result.scalar() or 0
    
    # 成功/失败统计
    success_count = await db.execute(
        select(func.count(TestExecution.id)).where(TestExecution.status == ExecutionStatus.PASSED)
    )
    success_executions = success_count.scalar() or 0
    
    failed_count = await db.execute(
        select(func.count(TestExecution.id)).where(TestExecution.status == ExecutionStatus.FAILED)
    )
    failed_executions = failed_count.scalar() or 0
    
    # 今日成功/失败
    today_success_query = select(func.count(TestExecution.id)).where(
        and_(
            TestExecution.created_at >= today_start,
            TestExecution.status == ExecutionStatus.PASSED
        )
    )
    today_success_result = await db.execute(today_success_query)
    today_success = today_success_result.scalar() or 0
    
    today_failed_query = select(func.count(TestExecution.id)).where(
        and_(
            TestExecution.created_at >= today_start,
            TestExecution.status == ExecutionStatus.FAILED
        )
    )
    today_failed_result = await db.execute(today_failed_query)
    today_failed = today_failed_result.scalar() or 0
    
    # 计算通过率
    overall_pass_rate = 0.0
    if total_executions > 0:
        overall_pass_rate = (success_executions / total_executions) * 100
    
    # 计算覆盖率（简化计算）
    interface_coverage = 0.0
    case_coverage = 0.0
    if total_interfaces > 0:
        # 假设有接口的用例覆盖率
        cases_with_interface = await db.execute(
            select(func.count(func.distinct(TestCase.id)))
        )
        cases_with_interface_count = cases_with_interface.scalar() or 0
        if total_cases > 0:
            case_coverage = (cases_with_interface_count / total_cases) * 100
    
    # 自动化率（简化计算）
    automation_rate = 0.0
    if total_cases > 0:
        # 假设API类型的用例都是自动化的
        api_cases = await db.execute(
            select(func.count(TestCase.id)).where(TestCase.test_type == "api")
        )
        api_cases_count = api_cases.scalar() or 0
        automation_rate = (api_cases_count / total_cases) * 100
    
    return DashboardStats(
        pending_tasks=0,  # TODO: 实现任务统计
        pending_reviews=0,  # TODO: 实现评审统计
        today_completed=today_success,
        week_workload={},  # TODO: 实现周工作量统计
        interface_coverage=interface_coverage,
        case_coverage=case_coverage,
        automation_rate=automation_rate,
        total_projects=total_projects,
        active_projects=total_projects,  # 简化处理
        overall_pass_rate=overall_pass_rate,
        total_executions=total_executions,
        success_executions=success_executions,
        failed_executions=failed_executions,
        today_executions=today_executions,
        today_success=today_success,
        today_failed=today_failed,
        avg_response_time=0.0,  # TODO: 实现响应时间统计
    )

