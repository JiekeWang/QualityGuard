"""
报告服务

当前版本不单独持久化「报告」实体，而是基于测试执行记录（`TestExecution`）
动态生成报告视图：

- 报告 ID == 执行 ID
- 报告列表 = 带有结果的执行列表
"""
from typing import Dict, List, Optional
from datetime import datetime
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.test_execution import TestExecution, ExecutionStatus
from app.models.test_case import TestCase


class ReportService:
    """报告服务类"""

    async def _get_execution(
        self,
        db: AsyncSession,
        execution_id: int,
    ) -> TestExecution:
        result = await db.execute(
            select(TestExecution).where(TestExecution.id == execution_id)
        )
        execution = result.scalar_one_or_none()
        if not execution:
            from fastapi import HTTPException, status

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="测试执行不存在",
            )
        return execution

    async def generate_report(
        self,
        db: AsyncSession,
        execution_id: int,
    ) -> Dict:
        """
        生成测试执行的报告视图

        说明：
        - 目前直接基于 `TestExecution` 记录生成，不额外落库
        - 后续如果引入独立报告表，可以在此处补充持久化逻辑
        """
        execution = await self._get_execution(db, execution_id)

        # 尝试获取已存在的结果摘要与详情
        result = execution.result or {}
        summary = result.get("summary") or {}

        # 尝试补充用例信息
        case_name = None
        if execution.test_case_id:
            case_result = await db.execute(
                select(TestCase).where(TestCase.id == execution.test_case_id)
            )
            test_case = case_result.scalar_one_or_none()
            if test_case:
                case_name = test_case.name

        # 默认摘要结构
        summary_data = {
            "total": summary.get("total", 1),
            "passed": summary.get(
                "passed",
                1 if execution.status == ExecutionStatus.PASSED else 0,
            ),
            "failed": summary.get(
                "failed",
                1 if execution.status in {ExecutionStatus.FAILED, ExecutionStatus.ERROR} else 0,
            ),
            "skipped": summary.get("skipped", 0),
        }

        report = {
            "id": execution.id,
            "execution_id": execution.id,
            "project_id": execution.project_id,
            "test_case_id": execution.test_case_id,
            "test_case_name": case_name,
            "status": execution.status.value if hasattr(execution.status, "value") else execution.status,
            "summary": summary_data,
            "created_at": (execution.created_at or datetime.utcnow()).isoformat(),
            "started_at": execution.started_at.isoformat() if execution.started_at else None,
            "finished_at": execution.finished_at.isoformat() if execution.finished_at else None,
            "environment": execution.environment,
        }

        # 将完整 result 结构返回，便于前端展示请求/响应/断言明细
        if result:
            report["result"] = result

        return report

    async def get_report(
        self,
        db: AsyncSession,
        report_id: int,
    ) -> Dict:
        """
        获取单个报告详情

        当前实现中 report_id 即 execution_id。
        """
        return await self.generate_report(db, execution_id=report_id)

    async def get_report_list(
        self,
        db: AsyncSession,
        project_id: Optional[int] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Dict]:
        """
        获取报告列表

        - 以有执行结果/已结束的执行记录作为报告来源
        - 仅返回高层摘要信息
        """
        conditions = [
            TestExecution.status.in_(
                [
                    ExecutionStatus.PASSED,
                    ExecutionStatus.FAILED,
                    ExecutionStatus.ERROR,
                ]
            )
        ]

        if project_id is not None:
            conditions.append(TestExecution.project_id == project_id)

        query = (
            select(TestExecution)
            .where(and_(*conditions))
            .order_by(TestExecution.created_at.desc())
            .offset(offset)
            .limit(limit)
        )

        result = await db.execute(query)
        executions = result.scalars().all()

        reports: List[Dict] = []
        for execution in executions:
            # 这里不再单独查询用例名称，以降低 N+1 查询风险，只返回基础信息
            res = execution.result or {}
            summary = res.get("summary") or {}

            reports.append(
                {
                    "id": execution.id,
                    "execution_id": execution.id,
                    "project_id": execution.project_id,
                    "test_case_id": execution.test_case_id,
                    "status": execution.status.value
                    if hasattr(execution.status, "value")
                    else execution.status,
                    "summary": {
                        "total": summary.get("total", 1),
                        "passed": summary.get(
                            "passed",
                            1 if execution.status == ExecutionStatus.PASSED else 0,
                        ),
                        "failed": summary.get(
                            "failed",
                            1
                            if execution.status
                            in {ExecutionStatus.FAILED, ExecutionStatus.ERROR}
                            else 0,
                        ),
                        "skipped": summary.get("skipped", 0),
                    },
                    "created_at": (
                        execution.created_at or datetime.utcnow()
                    ).isoformat(),
                }
            )

        return reports

    async def export_report(
        self,
        db: AsyncSession,
        report_id: int,
        format: str = "html",
    ) -> str:
        """
        导出报告

        当前版本仅返回简单的文本/HTML 内容，方便前端下载。
        后续可以扩展为 PDF/Excel 等格式。
        """
        report = await self.get_report(db, report_id=report_id)

        if format == "json":
            return json.dumps(report, ensure_ascii=False, indent=2)

        # 富格式 HTML 模板（同时用于 HTML 与 DOC 导出）
        if format in ("html", "doc"):
            summary = report.get("summary") or {}
            result = report.get("result") or {}
            details = result.get("details") or []

            # 只展示第一步详情（当前为单接口执行场景），后续可扩展多步骤
            first_step = details[0] if details else {}
            step_request = first_step.get("request") or {}
            step_response = first_step.get("response") or {}

            html = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8" />
    <title>测试报告 #{report.get("id")}</title>
    <style>
      body {{
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Microsoft YaHei", sans-serif;
        margin: 24px;
        color: #111827;
        line-height: 1.6;
      }}
      h1 {{ font-size: 28px; margin-bottom: 8px; }}
      h2 {{ font-size: 20px; margin-top: 24px; }}
      h3 {{ font-size: 16px; margin-top: 16px; }}
      .status-passed {{ color: #16a34a; font-weight: bold; }}
      .status-failed {{ color: #dc2626; font-weight: bold; }}
      .status-error  {{ color: #b91c1c; font-weight: bold; }}
      .summary-table, .detail-table {{
        border-collapse: collapse;
        width: 100%;
        margin-top: 8px;
      }}
      .summary-table th, .summary-table td,
      .detail-table th, .detail-table td {{
        border: 1px solid #e5e7eb;
        padding: 8px 10px;
        font-size: 13px;
        vertical-align: top;
      }}
      .summary-table th {{
        background-color: #f9fafb;
        text-align: left;
        width: 140px;
      }}
      .badge {{
        display: inline-block;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 12px;
      }}
      .badge-passed {{ background-color: #dcfce7; color: #166534; }}
      .badge-failed {{ background-color: #fee2e2; color: #b91c1c; }}
      .badge-error  {{ background-color: #fee2e2; color: #b91c1c; }}
      .badge-running {{ background-color: #e0f2fe; color: #075985; }}
      .code-block {{
        font-family: Consolas, "Courier New", monospace;
        background-color: #f9fafb;
        border-radius: 4px;
        padding: 10px;
        border: 1px solid #e5e7eb;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 12px;
      }}
    </style>
</head>
<body>
    <h1>测试报告 #{report.get("id")}</h1>

    <h2>一、执行概览</h2>
    <table class="summary-table">
      <tr>
        <th>执行状态</th>
        <td>
          <span class="badge badge-{report.get("status")}">{report.get("status")}</span>
        </td>
      </tr>
      <tr>
        <th>项目 ID</th>
        <td>{report.get("project_id")}</td>
      </tr>
      <tr>
        <th>用例 ID / 名称</th>
        <td>{report.get("test_case_id") or "-"} / {report.get("test_case_name") or "-"}</td>
      </tr>
      <tr>
        <th>环境</th>
        <td>{report.get("environment") or "-"}</td>
      </tr>
      <tr>
        <th>开始时间</th>
        <td>{report.get("started_at") or "-"}</td>
      </tr>
      <tr>
        <th>完成时间</th>
        <td>{report.get("finished_at") or "-"}</td>
      </tr>
      <tr>
        <th>报告生成时间</th>
        <td>{report.get("created_at")}</td>
      </tr>
    </table>

    <h2>二、统计信息</h2>
    <table class="summary-table">
      <tr>
        <th>总数</th>
        <td>{summary.get("total", 1)}</td>
      </tr>
      <tr>
        <th>通过</th>
        <td>{summary.get("passed", 0)}</td>
      </tr>
      <tr>
        <th>失败</th>
        <td>{summary.get("failed", 0)}</td>
      </tr>
      <tr>
        <th>跳过</th>
        <td>{summary.get("skipped", 0)}</td>
      </tr>
    </table>

    <h2>三、步骤详情</h2>
    <table class="detail-table">
      <tr>
        <th>步骤</th>
        <th>名称</th>
        <th>状态</th>
      </tr>
      <tr>
        <td>1</td>
        <td>{first_step.get("name") or "HTTP 请求"}</td>
        <td>{first_step.get("status") or ("passed" if report.get("status") == "passed" else report.get("status"))}</td>
      </tr>
    </table>

    <h3>3.1 请求信息</h3>
    <div class="code-block">
{json.dumps(step_request or {{}}, ensure_ascii=False, indent=2)}
    </div>

    <h3>3.2 响应信息</h3>
    <div class="code-block">
{json.dumps(step_response or {{}}, ensure_ascii=False, indent=2)}
    </div>
</body>
</html>
""".strip()
            return html

        # 其他格式暂未实现，返回空字符串占位
        return ""

