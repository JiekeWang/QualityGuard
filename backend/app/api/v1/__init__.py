"""
API v1 路由
"""
from fastapi import APIRouter
from app.api.v1 import (
    projects,
    test_cases,
    test_plans,
    test_executions,
    reports,
    devices,
    users,
    auth,
)

api_router = APIRouter()

# 注册各个模块的路由
api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(users.router, prefix="/users", tags=["用户管理"])
api_router.include_router(projects.router, prefix="/projects", tags=["项目管理"])
api_router.include_router(test_cases.router, prefix="/test-cases", tags=["测试用例"])
api_router.include_router(test_plans.router, prefix="/test-plans", tags=["测试计划"])
api_router.include_router(test_executions.router, prefix="/test-executions", tags=["测试执行"])
api_router.include_router(reports.router, prefix="/reports", tags=["测试报告"])
api_router.include_router(devices.router, prefix="/devices", tags=["设备管理"])

