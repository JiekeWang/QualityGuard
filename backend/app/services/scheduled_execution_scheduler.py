"""
定时任务执行调度器
定期检查并执行到期的定时任务
"""
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from app.core.database import AsyncSessionLocal
from app.models.test_execution import TestExecution, ExecutionStatus
from app.models.test_case import TestCase
from app.models.project import Project
from app.models.environment import Environment
from app.models.test_data_config import TestDataConfig, TestCaseTestDataConfig
import json
import httpx
import copy
import logging

logger = logging.getLogger(__name__)


class ScheduledExecutionScheduler:
    """定时任务执行调度器"""
    
    def __init__(self):
        self.running = False
        self.check_interval = 600  # 每10分钟（600秒）检查一次
        
    async def start(self):
        """启动调度器"""
        if self.running:
            logger.warning("调度器已经在运行")
            return
        
        self.running = True
        logger.info("定时任务调度器已启动")
        asyncio.create_task(self._scheduler_loop())
    
    async def stop(self):
        """停止调度器"""
        self.running = False
        logger.info("定时任务调度器已停止")
    
    async def _scheduler_loop(self):
        """调度器主循环"""
        logger.info("调度器主循环已启动，每10分钟检查一次定时任务")
        # 启动后立即检查一次
        try:
            logger.info("执行首次检查...")
            await self._check_and_execute_scheduled_tasks()
            logger.info("首次检查完成")
        except Exception as e:
            logger.error(f"调度器首次检查任务时出错: {e}", exc_info=True)
        
        check_count = 0
        while self.running:
            try:
                check_count += 1
                if check_count % 10 == 0:  # 每10次检查记录一次
                    logger.info(f"调度器运行中，已执行 {check_count} 次检查")
                await self._check_and_execute_scheduled_tasks()
            except Exception as e:
                logger.error(f"调度器检查任务时出错: {e}", exc_info=True)
            
            await asyncio.sleep(self.check_interval)
    
    async def _check_and_execute_scheduled_tasks(self):
        """检查并执行到期的定时任务"""
        # 获取数据库会话
        async with AsyncSessionLocal() as db:
            try:
                # 查询所有pending状态的定时任务
                query = select(TestExecution).where(
                    and_(
                        TestExecution.status == ExecutionStatus.PENDING,
                        text("config IS NOT NULL AND config->'scheduling' IS NOT NULL AND (config->'scheduling'->>'mode') = 'schedule'")
                    )
                )
                result = await db.execute(query)
                all_pending = result.scalars().all()
                
                # 对于time_range类型，过滤掉刚刚创建的任务，避免频繁执行
                # time_range类型默认每小时执行一次，所以需要过滤掉60分钟内创建的任务
                # 但实际执行间隔会在执行逻辑中判断
                pending_executions = []
                for exec in all_pending:
                    pending_executions.append(exec)
                
                logger.info(f"查询到 {len(pending_executions)} 个pending状态的定时任务")
                
                if not pending_executions:
                    logger.info("没有找到待执行的定时任务（pending状态且scheduling.mode=schedule）")
                    return
                
                logger.info(f"找到 {len(pending_executions)} 个待执行的定时任务")
                
                # 使用本地时间进行比较（因为前端保存的是本地时间字符串）
                # 服务器时区是 CST (UTC+8)
                from datetime import timezone
                cst = timezone(timedelta(hours=8))  # CST = UTC+8
                current_utc = datetime.utcnow()
                current_local = current_utc.replace(tzinfo=timezone.utc).astimezone(cst).replace(tzinfo=None)
                current_time = current_local  # 使用本地时间进行比较
                logger.info(f"当前UTC时间: {current_utc.strftime('%Y-%m-%d %H:%M:%S')}")
                logger.info(f"当前本地时间(CST): {current_time.strftime('%Y-%m-%d %H:%M:%S')}")
                
                for execution in pending_executions:
                    try:
                        scheduling = execution.config.get("scheduling", {}) if execution.config else {}
                        schedule_type = scheduling.get("schedule_type", "once")
                        scheduled_at = scheduling.get("scheduled_at")
                        schedule_config = scheduling.get("schedule_config", {})
                        
                        logger.info(f"检查定时任务 {execution.id}: schedule_type={schedule_type}, scheduled_at={scheduled_at}, schedule_config={schedule_config}")
                        
                        if not scheduled_at and schedule_type not in ("weekly", "time_range"):
                            logger.warning(f"定时任务 {execution.id} 没有 scheduled_at 且不是 weekly/time_range 类型")
                            continue
                        
                        # 检查是否到了执行时间
                        should_execute = False
                        
                        if schedule_type == "once":
                            # 单次执行：检查 scheduled_at 是否到了
                            try:
                                scheduled_time = datetime.strptime(scheduled_at, "%Y-%m-%d %H:%M:%S")
                                time_diff = (current_time - scheduled_time).total_seconds() / 60  # 分钟差
                                logger.info(f"任务 {execution.id} (once): 计划时间={scheduled_at}, 当前时间={current_time.strftime('%Y-%m-%d %H:%M:%S')}, 时间差={time_diff:.1f}分钟")
                                # 允许1分钟的时间误差，且必须已经过了计划时间
                                if time_diff >= -1:  # 允许1分钟的提前执行
                                    should_execute = True
                                    logger.info(f"任务 {execution.id} 已到执行时间（时间差={time_diff:.1f}分钟），准备执行")
                                else:
                                    logger.info(f"任务 {execution.id} 还未到执行时间（时间差={time_diff:.1f}分钟，需要>= -1分钟）")
                            except ValueError:
                                # 如果格式不对，尝试只解析日期
                                try:
                                    scheduled_time = datetime.strptime(scheduled_at, "%Y-%m-%d")
                                    if current_time.date() >= scheduled_time.date():
                                        should_execute = True
                                        logger.info(f"任务 {execution.id} 日期已到，准备执行")
                                except ValueError:
                                    logger.warning(f"无法解析 scheduled_at: {scheduled_at}")
                                    continue
                        
                        elif schedule_type == "daily":
                            # 每天执行：每天只执行一次，在指定时间点执行
                            # 检查当前日期是否等于scheduled_at日期，且时间匹配
                            time_str = schedule_config.get("time", "00:00:00")
                            
                            if not scheduled_at:
                                logger.warning(f"任务 {execution.id} (daily) 缺少 scheduled_at")
                                continue
                            
                            # 检查任务是否已经被执行过（通过检查started_at）
                            if execution.started_at is not None:
                                logger.debug(f"任务 {execution.id} 已经执行过（started_at={execution.started_at}），跳过")
                                continue
                            
                            try:
                                # 解析scheduled_at日期
                                scheduled_date = datetime.strptime(scheduled_at, "%Y-%m-%d").date()
                                current_date = current_time.date()
                                
                                # 只有当当前日期等于scheduled_at日期时，才检查时间匹配
                                if current_date != scheduled_date:
                                    logger.debug(f"任务 {execution.id} (daily): 当前日期({current_date})不等于计划日期({scheduled_date})，跳过")
                                    continue
                                
                                # 解析时间 HH:mm:ss（本地时间）
                                time_parts = time_str.split(":")
                                current_hour = current_time.hour  # 当前本地时间的小时
                                current_minute = current_time.minute  # 当前本地时间的分钟
                                scheduled_hour = int(time_parts[0])
                                scheduled_minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                                
                                minute_diff = abs(current_minute - scheduled_minute)
                                logger.info(f"任务 {execution.id} (daily): 计划日期={scheduled_date}, 计划时间(本地)={time_str}, 当前本地时间={current_time.strftime('%H:%M:%S')}, 小时匹配={current_hour == scheduled_hour}, 分钟差={minute_diff}")
                                
                                # 计算计划执行时间
                                scheduled_datetime = datetime.combine(scheduled_date, datetime.min.time().replace(hour=scheduled_hour, minute=scheduled_minute))
                                
                                # 如果当前时间已经超过了计划时间，执行（补执行）
                                # 允许在当天执行，即使时间已经过了
                                if current_time >= scheduled_datetime:
                                    should_execute = True
                                    # 检查是否精确匹配（允许1分钟误差）
                                    time_match = (current_hour == scheduled_hour and minute_diff <= 1)
                                    if time_match:
                                        logger.info(f"任务 {execution.id} 日期和时间都匹配，准备执行")
                                    else:
                                        logger.info(f"任务 {execution.id} 日期匹配但时间已过（计划={scheduled_hour}:{scheduled_minute:02d}, 当前={current_hour}:{current_minute:02d}），补执行")
                                else:
                                    logger.debug(f"任务 {execution.id} 日期匹配但还未到计划时间（计划={scheduled_hour}:{scheduled_minute:02d}, 当前={current_hour}:{current_minute:02d}），等待")
                            except (ValueError, IndexError) as e:
                                logger.warning(f"无法解析时间或日期: scheduled_at={scheduled_at}, time={time_str}, 错误: {e}")
                                continue
                        
                        elif schedule_type == "weekly":
                            # 每周执行：每周只执行一次，在指定星期和时间点执行
                            # 如果星期匹配且任务未被执行过，无论时间是否匹配都应该执行（补执行）
                            weekdays = schedule_config.get("weekdays", [])
                            time_str = schedule_config.get("time", "00:00:00")
                            
                            # 获取当前星期（0=周一，6=周日，需要转换为1-7格式）
                            # Python的weekday(): 0=周一, 1=周二, ..., 6=周日
                            # 我们的格式: 1=周一, 2=周二, ..., 7=周日
                            current_weekday = current_time.weekday() + 1  # 转换为1-7格式
                            
                            logger.info(f"任务 {execution.id} (weekly): 当前星期={current_weekday}, 计划星期={weekdays}, 计划时间(本地)={time_str}, 当前本地时间={current_time.strftime('%H:%M:%S')}, 任务状态={execution.status}")
                            
                            if str(current_weekday) in weekdays:
                                # 检查任务是否已经被执行过（通过检查started_at）
                                # 如果任务已经执行过（started_at不为None），跳过
                                if execution.started_at is not None:
                                    logger.debug(f"任务 {execution.id} 已经执行过（started_at={execution.started_at}），跳过")
                                    continue
                                
                                # 检查任务的创建时间，防止新创建的任务在本周重复执行
                                # weekly任务执行后会创建新记录，新记录应该在下周执行，不应该在本周执行
                                if execution.created_at:
                                    created_at_local = execution.created_at.replace(tzinfo=None) if execution.created_at.tzinfo else execution.created_at
                                    # 计算本周的开始日期（周一）
                                    current_week_start = current_time.date() - timedelta(days=current_time.weekday())
                                    created_week_start = created_at_local.date() - timedelta(days=created_at_local.weekday())
                                    
                                    # 如果任务是在本周创建的，说明是刚创建的新记录，应该跳过（等待下周执行）
                                    # weekly任务执行后会创建新记录，新记录应该在下周执行，不应该在本周执行
                                    if created_week_start == current_week_start:
                                        # 任务是在本周创建的，跳过（等待下周执行）
                                        logger.info(f"任务 {execution.id} 是在本周创建的新记录（创建周={created_week_start}, 当前周={current_week_start}），跳过，等待下周执行")
                                        continue
                                    else:
                                        # 任务不是在本周创建的，说明是历史任务，应该执行（补执行）
                                        should_execute = True
                                        try:
                                            time_parts = time_str.split(":")
                                            current_hour = current_time.hour
                                            current_minute = current_time.minute
                                            scheduled_hour = int(time_parts[0])
                                            scheduled_minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                                            minute_diff = abs(current_minute - scheduled_minute)
                                            time_match = (current_hour == scheduled_hour and minute_diff <= 1)
                                            
                                            if time_match:
                                                logger.info(f"任务 {execution.id} 星期和时间都匹配，准备执行（历史任务补执行）")
                                            else:
                                                logger.info(f"任务 {execution.id} 星期匹配但时间已过（计划={scheduled_hour}:{scheduled_minute:02d}, 当前={current_hour}:{current_minute:02d}），补执行")
                                        except (ValueError, IndexError) as e:
                                            logger.warning(f"无法解析时间: {time_str}, 错误: {e}，但仍将执行")
                                else:
                                    # 如果没有创建时间，使用旧的逻辑（允许执行）
                                    should_execute = True
                                    logger.warning(f"任务 {execution.id} 没有创建时间，使用旧逻辑执行")
                            else:
                                logger.debug(f"任务 {execution.id} 当前星期 {current_weekday} 不在计划星期 {weekdays} 中")
                        
                        elif schedule_type == "time_range":
                            # 时间段执行：每天只执行一次，在开始时间的同一时间点执行
                            # 第一次执行：开始时间的日期和时间点（如 2025/12/21 17:05:02）
                            # 执行完成后，开始时间更新为下一天的同一时间点（如 2025/12/22 17:05:02）
                            start_str = schedule_config.get("start")
                            end_str = schedule_config.get("end")
                            
                            if not start_str or not end_str:
                                logger.warning(f"任务 {execution.id} (time_range) 缺少 start 或 end 配置")
                                continue
                            
                            try:
                                start_time = datetime.strptime(start_str, "%Y-%m-%d %H:%M:%S")
                                end_time = datetime.strptime(end_str, "%Y-%m-%d %H:%M:%S")
                                
                                logger.info(f"任务 {execution.id} (time_range): 开始时间={start_str}, 结束时间={end_str}, 当前本地时间={current_time.strftime('%Y-%m-%d %H:%M:%S')}, 任务状态={execution.status}")
                                
                                # 如果当前时间超过结束时间，不再执行
                                if current_time > end_time:
                                    logger.info(f"任务 {execution.id} 已超过结束时间，不再执行")
                                    # 将状态更新为cancelled
                                    execution.status = ExecutionStatus.CANCELLED
                                    await db.commit()
                                    continue
                                
                                # 如果当前时间还未到开始时间，不执行
                                if current_time < start_time:
                                    logger.debug(f"任务 {execution.id} 还未到开始时间")
                                    continue
                                
                                # 检查任务是否已经被执行过（通过检查started_at）
                                # 如果任务已经执行过，跳过
                                if execution.started_at is not None:
                                    logger.debug(f"任务 {execution.id} 已经执行过（started_at={execution.started_at}），跳过")
                                    continue
                                
                                # 如果当前时间在时间段内，且任务未被执行过，执行任务
                                # 允许补执行：如果执行时间已过，但在时间段内，仍然执行一次
                                # 每天在开始时间的同一时间点执行（如每天17:05:02）
                                start_hour = start_time.hour
                                start_minute = start_time.minute
                                
                                current_hour = current_time.hour
                                current_minute = current_time.minute
                                
                                # 检查是否到了每天的执行时间点（时、分匹配，允许1分钟误差）
                                hour_match = current_hour == start_hour
                                minute_diff = abs(current_minute - start_minute)
                                time_match = hour_match and minute_diff <= 1
                                
                                # 当前时间的日期必须 >= 开始时间的日期
                                if current_time.date() >= start_time.date():
                                    if time_match:
                                        should_execute = True
                                        logger.info(f"任务 {execution.id} 时间匹配，准备执行（当前日期={current_time.date()}, 开始日期={start_time.date()}, 时间点={start_hour}:{start_minute:02d}）")
                                    else:
                                        # 时间已过，但在时间段内，补执行一次
                                        should_execute = True
                                        logger.info(f"任务 {execution.id} 执行时间已过但仍在时间段内，补执行（计划时间={start_hour}:{start_minute:02d}, 当前时间={current_hour}:{current_minute:02d}）")
                                else:
                                    logger.debug(f"任务 {execution.id} 当前日期还未到开始日期")
                                    
                            except ValueError as e:
                                logger.warning(f"无法解析时间范围: start={start_str}, end={end_str}, 错误: {e}")
                                continue
                        
                        if should_execute:
                            logger.info(f"执行定时任务: execution_id={execution.id}")
                            await self._execute_scheduled_task(execution, db)
                    
                    except Exception as e:
                        logger.error(f"处理定时任务 {execution.id} 时出错: {e}", exc_info=True)
                        continue
            
            except Exception as e:
                logger.error(f"检查定时任务时出错: {e}", exc_info=True)
    
    async def _execute_scheduled_task(self, execution: TestExecution, db: AsyncSession):
        """执行定时任务"""
        try:
            # 先更新当前任务状态为running（避免重复执行）
            execution.status = ExecutionStatus.RUNNING
            execution.started_at = datetime.utcnow()
            execution.logs = "定时任务已触发，开始执行"
            await db.commit()
            await db.refresh(execution)
            
            # 调用执行逻辑（异步执行，不阻塞调度器）
            # 传递execution.id和config，用于执行完成后创建新记录
            asyncio.create_task(self._run_execution(execution.id, execution.config))
            
        except Exception as e:
            logger.error(f"执行定时任务 {execution.id} 失败: {e}", exc_info=True)
            execution.status = ExecutionStatus.ERROR
            execution.logs = f"执行失败: {str(e)}"
            await db.commit()
    
    async def _create_next_scheduled_task(self, original_config: dict, execution: TestExecution):
        """为周期性任务创建下一次执行记录（在任务执行完成后调用）"""
        try:
            scheduling = original_config.get("scheduling", {}) if original_config else {}
            schedule_type = scheduling.get("schedule_type", "once")
            
            # 只有daily、weekly、time_range类型需要创建新记录
            if schedule_type not in ("daily", "weekly", "time_range"):
                return
            
            from app.core.database import AsyncSessionLocal
            from datetime import timezone
            import copy
            
            # 复制配置并更新计划执行时间
            new_config = copy.deepcopy(original_config)
            new_scheduling = new_config.get("scheduling", {})
            schedule_config = new_scheduling.get("schedule_config", {})
            
            # 获取当前本地时间（用于计算下一次执行时间）
            cst = timezone(timedelta(hours=8))  # CST = UTC+8
            current_utc = datetime.utcnow()
            current_local = current_utc.replace(tzinfo=timezone.utc).astimezone(cst).replace(tzinfo=None)
            
            if schedule_type == "daily":
                # daily类型：更新scheduled_at为下一天的日期
                current_scheduled_at = new_scheduling.get("scheduled_at", "")
                if current_scheduled_at:
                    try:
                        # 解析当前日期
                        scheduled_date = datetime.strptime(current_scheduled_at, "%Y-%m-%d")
                        # 加1天
                        next_date = scheduled_date + timedelta(days=1)
                        new_scheduling["scheduled_at"] = next_date.strftime("%Y-%m-%d")
                        logger.info(f"daily任务：更新scheduled_at从 {current_scheduled_at} 到 {new_scheduling['scheduled_at']}")
                    except ValueError:
                        # 如果解析失败，使用当前日期+1天
                        next_date = current_local.date() + timedelta(days=1)
                        new_scheduling["scheduled_at"] = next_date.strftime("%Y-%m-%d")
                        logger.info(f"daily任务：无法解析原日期，使用明天日期 {new_scheduling['scheduled_at']}")
                else:
                    # 如果没有scheduled_at，使用明天日期
                    next_date = current_local.date() + timedelta(days=1)
                    new_scheduling["scheduled_at"] = next_date.strftime("%Y-%m-%d")
                    logger.info(f"daily任务：添加scheduled_at为明天 {new_scheduling['scheduled_at']}")
            
            elif schedule_type == "weekly":
                # weekly类型：不需要更新scheduled_at（weekly类型没有scheduled_at）
                # weekdays和time保持不变
                logger.info(f"weekly任务：保持weekdays={schedule_config.get('weekdays')}和time={schedule_config.get('time')}")
            
            elif schedule_type == "time_range":
                # time_range类型：每天执行一次，执行后将开始时间更新为下一天的同一时间点
                start_str = schedule_config.get("start", "")
                end_str = schedule_config.get("end", "")
                should_create_new = True
                if start_str and end_str:
                    try:
                        start_time = datetime.strptime(start_str, "%Y-%m-%d %H:%M:%S")
                        end_time = datetime.strptime(end_str, "%Y-%m-%d %H:%M:%S")
                        
                        # 计算下一天的开始时间（保持相同的时、分、秒）
                        next_start_time = start_time + timedelta(days=1)
                        
                        # 如果下一天的开始时间已经超过结束时间，不创建新记录
                        if next_start_time > end_time:
                            logger.info(f"time_range任务：下一天的开始时间({next_start_time.strftime('%Y-%m-%d %H:%M:%S')})已超过结束时间({end_str})，不创建新记录")
                            return
                        else:
                            # 更新开始时间为下一天的同一时间点
                            new_start_str = next_start_time.strftime("%Y-%m-%d %H:%M:%S")
                            schedule_config["start"] = new_start_str
                            # 结束时间保持不变
                            new_scheduling["schedule_config"] = schedule_config
                            logger.info(f"time_range任务：更新开始时间从 {start_str} 到 {new_start_str}，结束时间保持为 {end_str}")
                    except ValueError as e:
                        logger.warning(f"time_range任务：无法解析时间范围，错误: {e}")
                        return
                else:
                    logger.warning(f"time_range任务：缺少start或end配置，不创建新记录")
                    return
            
            # 更新配置中的scheduling
            new_config["scheduling"] = new_scheduling
            
            async with AsyncSessionLocal() as new_db:
                from app.models.test_execution import TestExecution as NewExecution
                new_execution = NewExecution(
                    test_case_id=execution.test_case_id,
                    project_id=execution.project_id,
                    environment=execution.environment,
                    config=new_config,
                    status=ExecutionStatus.PENDING,
                    started_at=None,
                    logs="定时任务已创建，等待执行",
                    result=None,
                )
                new_db.add(new_execution)
                await new_db.commit()
                logger.info(f"任务 {execution.id} 执行完成后，为 {schedule_type} 类型任务创建了新的执行记录: {new_execution.id}，配置: {new_config.get('scheduling', {})}")
        
        except Exception as e:
            logger.error(f"创建新的执行记录失败: {e}", exc_info=True)
    
    async def _run_execution(self, execution_id: int, original_config: dict = None):
        """执行测试任务（异步）"""
        async with AsyncSessionLocal() as db:
            try:
                # 获取执行记录
                result = await db.execute(
                    select(TestExecution).where(TestExecution.id == execution_id)
                )
                execution = result.scalar_one_or_none()
                
                if not execution:
                    logger.error(f"找不到执行记录: {execution_id}")
                    return
                
                if execution.status != ExecutionStatus.RUNNING:
                    logger.warning(f"执行记录状态不是RUNNING: {execution_id}, status={execution.status}")
                    return
                
                # 如果original_config未提供，使用execution.config
                if original_config is None:
                    original_config = execution.config
                
                # 调用执行逻辑
                from app.api.v1.test_executions import _execute_pending_test_execution
                await _execute_pending_test_execution(execution, db)
                
                # 刷新execution状态
                await db.refresh(execution)
                
                # 执行完成后，检查是否需要创建下一次执行记录
                # 只有当任务成功完成（passed或failed）或错误完成（error）时才创建新记录
                if execution.status in (ExecutionStatus.PASSED, ExecutionStatus.FAILED, ExecutionStatus.ERROR):
                    await self._create_next_scheduled_task(original_config, execution)
                    
            except Exception as e:
                logger.error(f"执行任务 {execution_id} 时出错: {e}", exc_info=True)
                # 更新执行状态为错误
                try:
                    result = await db.execute(
                        select(TestExecution).where(TestExecution.id == execution_id)
                    )
                    exec_record = result.scalar_one_or_none()
                    if exec_record:
                        exec_record.status = ExecutionStatus.ERROR
                        exec_record.logs = f"执行出错: {str(e)}"
                        exec_record.finished_at = datetime.utcnow()
                        await db.commit()
                        
                        # 即使出错，如果原任务是周期性的，也尝试创建新记录
                        if original_config:
                            await self._create_next_scheduled_task(original_config, exec_record)
                except Exception as e2:
                    logger.error(f"更新执行状态失败: {e2}", exc_info=True)


# 全局调度器实例
_scheduler: Optional[ScheduledExecutionScheduler] = None


async def get_scheduler() -> ScheduledExecutionScheduler:
    """获取调度器实例"""
    global _scheduler
    if _scheduler is None:
        _scheduler = ScheduledExecutionScheduler()
    return _scheduler

