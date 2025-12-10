"""
测试计划管理API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()


class TestPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    project_id: int
    test_case_ids: List[int] = []


@router.get("/")
async def get_test_plans(
    project_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取测试计划列表"""
    # TODO: 实现获取测试计划列表逻辑
    return {"test_plans": []}


@router.post("/")
async def create_test_plan(test_plan: TestPlanCreate, db: AsyncSession = Depends(get_db)):
    """创建测试计划"""
    # TODO: 实现创建测试计划逻辑
    return {"id": 1, **test_plan.dict()}


@router.post("/{test_plan_id}/execute")
async def execute_test_plan(test_plan_id: int, db: AsyncSession = Depends(get_db)):
    """执行测试计划"""
    # TODO: 实现执行测试计划逻辑
    return {"execution_id": 1, "status": "running"}

