"""
测试报告API
"""
from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter()
service = ReportService()


@router.get("/")
async def get_reports(
    project_id: Optional[int] = Query(None, description="项目ID"),
    skip: int = Query(0, ge=0, description="偏移量"),
    limit: int = Query(20, ge=1, le=100, description="返回数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[dict]:
    """
    获取测试报告列表

    当前实现：
    - 以已完成的测试执行为基础，动态生成报告摘要列表
    - 报告 ID == 执行 ID
    """
    reports = await service.get_report_list(
        db=db,
        project_id=project_id,
        limit=limit,
        offset=skip,
    )
    return reports


@router.get("/{report_id}")
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    获取测试报告详情

    当前实现中 report_id 即 execution_id。
    """
    report = await service.get_report(db=db, report_id=report_id)
    return report


@router.get("/{report_id}/export")
async def export_report(
    report_id: int,
    format: str = Query("html", description="导出格式：html、json 或 doc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    导出测试报告

    返回简单的文本内容，由前端决定如何保存为文件（包括 .doc）。
    """
    content = await service.export_report(db=db, report_id=report_id, format=format)
    return {
        "report_id": report_id,
        "format": format,
        "content": content,
    }

