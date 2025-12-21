"""
测试报告API
"""
from typing import Optional, List

from fastapi import APIRouter, Depends, Query, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.services.report_service import ReportService


class BatchDeleteRequest(BaseModel):
    """批量删除请求模型"""
    report_ids: List[int]

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


@router.delete("/batch", status_code=status.HTTP_204_NO_CONTENT)
async def batch_delete_reports(
    request: BatchDeleteRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    批量删除测试报告
    """
    from fastapi import HTTPException
    from sqlalchemy import delete
    from app.models.test_execution import TestExecution
    
    report_ids = request.report_ids
    if not report_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请提供要删除的报告ID列表"
        )
    
    result = await db.execute(
        delete(TestExecution).where(TestExecution.id.in_(report_ids))
    )
    await db.commit()


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    删除测试报告（实际上是删除对应的测试执行记录）
    """
    from fastapi import HTTPException
    from sqlalchemy import delete
    from app.models.test_execution import TestExecution
    
    # 由于报告ID就是执行ID，直接删除执行记录
    result = await db.execute(
        delete(TestExecution).where(TestExecution.id == report_id)
    )
    await db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="报告不存在"
        )


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    删除测试报告（实际上是删除对应的测试执行记录）
    """
    from fastapi import HTTPException
    from sqlalchemy import delete
    from app.models.test_execution import TestExecution
    
    # 由于报告ID就是执行ID，直接删除执行记录
    result = await db.execute(
        delete(TestExecution).where(TestExecution.id == report_id)
    )
    await db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="报告不存在"
        )

