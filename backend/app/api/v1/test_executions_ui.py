"""
UI测试执行逻辑
"""
from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.test_execution import TestExecution, ExecutionStatus
from app.models.test_case import TestCase
from app.models.project import Project
from app.engines.engine_factory import EngineFactory
import json


async def _execute_ui_test_case(execution: TestExecution, test_case: TestCase, db: AsyncSession):
    """执行UI测试用例"""
    try:
        execution.status = ExecutionStatus.RUNNING
        execution.started_at = datetime.utcnow()
        execution.logs = "UI测试执行已启动\n"
        await db.commit()
        
        # 获取项目信息
        from app.models.project import Project
        project_result = await db.execute(
            select(Project).where(Project.id == execution.project_id)
        )
        project = project_result.scalar_one_or_none()
        
        execution.logs += f"项目: {project.name if project else execution.project_id}\n"
        execution.logs += f"测试用例: {test_case.name}\n"
        execution.logs += f"测试类型: UI\n\n"
        
        # 准备测试用例数据
        test_case_data: Dict[str, Any] = {
            "steps": test_case.steps or [],
            "config": test_case.config or {},
            "variables": {}
        }
        
        # 合并执行配置中的浏览器配置
        if execution.config:
            browser_config = execution.config.get("browser_config", {})
            if browser_config:
                if "config" not in test_case_data:
                    test_case_data["config"] = {}
                test_case_data["config"]["browser_config"] = browser_config
        
        # 创建UI引擎
        engine_config = {
            "browser": test_case_data.get("config", {}).get("browser_config", {}).get("browser", "chromium"),
            "headless": test_case_data.get("config", {}).get("browser_config", {}).get("headless", True),
        }
        
        ui_engine = EngineFactory.create_engine("ui", engine_config)
        
        # 验证测试用例
        is_valid = await ui_engine.validate(test_case_data)
        if not is_valid:
            execution.status = ExecutionStatus.ERROR
            execution.logs += "❌ 测试用例配置无效：缺少必需的steps字段\n"
            execution.finished_at = datetime.utcnow()
            await db.commit()
            return
        
        # 执行测试
        execution.logs += "开始执行UI测试步骤...\n"
        await db.commit()
        
        result = await ui_engine.execute(test_case_data)
        
        # 更新执行结果
        execution.result = result
        execution.logs += f"\n执行完成\n"
        execution.logs += f"状态: {result.get('status', 'unknown')}\n"
        
        if result.get("status") == "passed":
            execution.status = ExecutionStatus.PASSED
            execution.logs += "✅ 测试通过\n"
        elif result.get("status") == "failed":
            execution.status = ExecutionStatus.FAILED
            execution.logs += "❌ 测试失败\n"
        else:
            execution.status = ExecutionStatus.ERROR
            execution.logs += f"⚠️ 执行错误: {result.get('error', '未知错误')}\n"
        
        # 记录步骤结果
        if result.get("results"):
            execution.logs += f"\n步骤详情:\n"
            for idx, step_result in enumerate(result.get("results", []), 1):
                status_icon = "✅" if step_result.get("status") == "passed" else "❌"
                execution.logs += f"{status_icon} 步骤 {idx}: {step_result.get('name', step_result.get('action', '未知'))}\n"
                if step_result.get("error"):
                    execution.logs += f"   错误: {step_result.get('error')}\n"
        
        # 记录截图信息
        if result.get("screenshots"):
            execution.logs += f"\n截图数量: {len(result.get('screenshots', []))}\n"
        
        execution.finished_at = datetime.utcnow()
        await db.commit()
        
        # 生成报告
        try:
            from app.services.report_service import ReportService
            report_service = ReportService(db)
            await report_service.generate_report(execution.id)
        except Exception as e:
            execution.logs += f"\n⚠️ 报告生成失败: {str(e)}\n"
            await db.commit()
            
    except Exception as e:
        execution.status = ExecutionStatus.ERROR
        execution.logs += f"\n❌ 执行异常: {str(e)}\n"
        execution.finished_at = datetime.utcnow()
        execution.result = {
            "status": "error",
            "error": str(e)
        }
        await db.commit()

