"""
API v1 路由
"""
from fastapi import APIRouter

api_router = APIRouter()

# 延迟导入避免循环依赖
def register_routes():
    # 直接导入模块，不使用 from app.api.v1 import
    import app.api.v1.auth as auth
    import app.api.v1.users as users
    import app.api.v1.dashboard as dashboard
    import app.api.v1.projects as projects
    import app.api.v1.interfaces as interfaces
    import app.api.v1.test_cases as test_cases
    import app.api.v1.test_cases_favorite as test_cases_favorite
    import app.api.v1.test_cases_common as test_cases_common
    import app.api.v1.test_case_collections as test_case_collections
    import app.api.v1.tags as tags
    import app.api.v1.test_plans as test_plans
    import app.api.v1.test_executions as test_executions
    import app.api.v1.reports as reports
    import app.api.v1.devices as devices
    import app.api.v1.modules as modules
    import app.api.v1.directories as directories
    import app.api.v1.test_case_versions as test_case_versions
    import app.api.v1.assertion_libraries as assertion_libraries
    import app.api.v1.data_drivers as data_drivers
    import app.api.v1.test_case_reviews as test_case_reviews
    import app.api.v1.environments as environments
    import app.api.v1.data_driver as data_driver
    
    # 注册各个模块的路由
    api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
    api_router.include_router(users.router, prefix="/users", tags=["用户管理"])
    api_router.include_router(dashboard.router, prefix="/dashboard", tags=["仪表盘"])
    api_router.include_router(projects.router, prefix="/projects", tags=["项目管理"])
    api_router.include_router(interfaces.router, prefix="/interfaces", tags=["接口管理"])
    api_router.include_router(test_cases.router, prefix="/test-cases", tags=["测试用例"])
    api_router.include_router(test_cases_favorite.router, prefix="/test-cases", tags=["测试用例"])
    api_router.include_router(test_cases_common.router, prefix="/test-cases", tags=["测试用例"])
    api_router.include_router(test_case_collections.router, prefix="/test-case-collections", tags=["测试用例集"])
    api_router.include_router(tags.router, prefix="/tags", tags=["标签管理"])
    api_router.include_router(test_plans.router, prefix="/test-plans", tags=["测试计划"])
    api_router.include_router(test_executions.router, prefix="/test-executions", tags=["测试执行"])
    api_router.include_router(reports.router, prefix="/reports", tags=["测试报告"])
    api_router.include_router(devices.router, prefix="/devices", tags=["设备管理"])
    api_router.include_router(modules.router, prefix="/modules", tags=["模块管理"])
    api_router.include_router(directories.router, prefix="/directories", tags=["目录管理"])
    api_router.include_router(test_case_versions.router, prefix="/test-case-versions", tags=["测试用例版本"])
    api_router.include_router(assertion_libraries.router, prefix="/assertion-libraries", tags=["预设断言库"])
    api_router.include_router(data_drivers.router, prefix="/data-drivers", tags=["数据驱动配置"])
    api_router.include_router(data_driver.router, tags=["数据驱动文件导入"])
    api_router.include_router(test_case_reviews.router, prefix="/test-case-reviews", tags=["测试用例评审"])
    api_router.include_router(environments.router, prefix="/environments", tags=["环境管理"])

# 立即注册路由
register_routes()
