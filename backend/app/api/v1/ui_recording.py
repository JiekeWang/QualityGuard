"""
UI录制API
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.services.recording_service import recording_service
import json
import uuid

router = APIRouter()


@router.post("/start")
async def start_recording(
    config: Dict[str, Any],
    current_user: User = Depends(get_current_active_user)
):
    """开始录制"""
    session_id = str(uuid.uuid4())
    
    # 在服务器环境中，默认使用 headless 模式
    # 如果需要非无头模式，需要确保服务器有 X Server 或 xvfb
    headless = config.get("headless", True)
    
    result = await recording_service.start_recording(
        session_id=session_id,
        browser_type=config.get("browser", "chromium"),
        headless=headless,
        viewport=config.get("viewport")
    )
    
    return result


@router.post("/{session_id}/navigate")
async def navigate(
    session_id: str,
    request_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user)
):
    """导航到URL"""
    url = request_data.get("url")
    if not url:
        return {"status": "error", "error": "URL不能为空"}
    
    result = await recording_service.navigate(session_id, url)
    return result


@router.post("/{session_id}/click")
async def click(
    session_id: str,
    request_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user)
):
    """点击元素"""
    selector = request_data.get("selector")
    if not selector:
        return {"status": "error", "error": "选择器不能为空"}
    
    result = await recording_service.click(session_id, selector)
    return result


@router.post("/{session_id}/fill")
async def fill(
    session_id: str,
    request_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user)
):
    """填充输入框"""
    selector = request_data.get("selector")
    value = request_data.get("value", "")
    if not selector:
        return {"status": "error", "error": "选择器不能为空"}
    
    result = await recording_service.fill(session_id, selector, value)
    return result


@router.post("/{session_id}/select")
async def select_option(
    session_id: str,
    request_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user)
):
    """选择下拉框选项"""
    selector = request_data.get("selector")
    value = request_data.get("value")
    if not selector or not value:
        return {"status": "error", "error": "选择器和值不能为空"}
    
    result = await recording_service.select_option(session_id, selector, value)
    return result


@router.get("/{session_id}/snapshots")
async def get_snapshots(
    session_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """获取所有页面快照"""
    snapshots = await recording_service.get_page_snapshots(session_id)
    return {"snapshots": snapshots}


@router.get("/{session_id}/snapshot/{step_index}")
async def get_snapshot(
    session_id: str,
    step_index: int,
    current_user: User = Depends(get_current_active_user)
):
    """获取指定步骤的页面快照"""
    snapshot = await recording_service.get_snapshot(session_id, step_index)
    if not snapshot:
        return {"status": "error", "error": "快照不存在"}
    return {"snapshot": snapshot}


@router.get("/{session_id}/checkpoints")
async def get_checkpoints(
    session_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """获取检查点"""
    checkpoints = await recording_service.get_checkpoints(session_id)
    return {"checkpoints": checkpoints}


@router.post("/{session_id}/identify-checkpoints")
async def identify_checkpoints(
    session_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """手动触发检查点识别"""
    result = await recording_service.identify_checkpoints_after_navigation(session_id)
    return result


@router.get("/{session_id}/steps")
async def get_steps(
    session_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """获取录制步骤"""
    steps = await recording_service.get_steps(session_id)
    return {"steps": steps}


@router.post("/{session_id}/stop")
async def stop_recording(
    session_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """停止录制"""
    result = await recording_service.stop_recording(session_id)
    return result


@router.post("/{session_id}/generate-test-case")
async def generate_test_case(
    session_id: str,
    config: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """生成测试用例"""
    from app.models.test_case import TestCase
    from app.schemas.test_case import TestCaseCreate
    
    # 获取录制数据
    steps = await recording_service.get_steps(session_id)
    
    # 获取用户选择的检查点（格式：{step_index: [element_indices]}）
    selected_checkpoints = config.get("selected_checkpoints", {})
    
    # 转换步骤
    test_steps = []
    for step in steps:
        step_index = step.get("step_index", len(test_steps))
        test_steps.append({
            "action": step.get("action"),
            "selector": step.get("selector", ""),
            "url": step.get("url", ""),
            "value": step.get("value", ""),
            "name": f"步骤 {len(test_steps) + 1}"
        })
        
        # 添加该步骤选中的检查点作为断言
        if str(step_index) in selected_checkpoints:
            element_indices = selected_checkpoints[str(step_index)]
            snapshot = await recording_service.get_snapshot(session_id, step_index)
            if snapshot and snapshot.get("elements"):
                for elem_idx in element_indices:
                    elem = snapshot["elements"][elem_idx] if elem_idx < len(snapshot["elements"]) else None
                    if elem:
                        # 根据元素类型生成断言
                        if elem.get("text"):
                            test_steps.append({
                                "action": "assert",
                                "assertion_type": "text_equals",
                                "selector": elem.get("selector", ""),
                                "expected": elem.get("text", ""),
                                "name": f"断言: 文本等于 '{elem.get('text', '')[:30]}'"
                            })
                        elif elem.get("value"):
                            test_steps.append({
                                "action": "assert",
                                "assertion_type": "text_equals",
                                "selector": elem.get("selector", ""),
                                "expected": elem.get("value", ""),
                                "name": f"断言: 值等于 '{elem.get('value', '')[:30]}'"
                            })
                        elif elem.get("id"):
                            test_steps.append({
                                "action": "assert",
                                "assertion_type": "element_exists",
                                "selector": f"#{elem.get('id', '')}",
                                "expected": elem.get("id", ""),
                                "name": f"断言: 元素存在 #{elem.get('id', '')}"
                            })
    
    # 创建测试用例
    test_case_data = TestCaseCreate(
        name=config.get("name", f"录制用例_{session_id[:8]}"),
        description=config.get("description", "通过录制生成的测试用例"),
        project_id=config.get("project_id"),
        test_type="ui",
        steps=test_steps,
        config={
            "browser_config": {
                "browser": config.get("browser", "chromium"),
                "headless": config.get("headless", True)
            }
        }
    )
    
    # 保存到数据库
    new_test_case = TestCase(
        **test_case_data.dict(),
        created_by=current_user.id
    )
    db.add(new_test_case)
    await db.commit()
    await db.refresh(new_test_case)
    
    return {
        "test_case_id": new_test_case.id,
        "name": new_test_case.name,
        "steps_count": len(test_steps)
    }


@router.websocket("/{session_id}/ws")
async def websocket_recording(
    websocket: WebSocket,
    session_id: str
):
    """WebSocket连接用于实时录制"""
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            action = message.get("action")
            
            if action == "navigate":
                url = message.get("url")
                result = await recording_service.navigate(session_id, url)
                await websocket.send_json(result)
            
            elif action == "click":
                # 处理点击事件
                selector = message.get("selector", "")
                # 这里可以添加点击处理逻辑
                await websocket.send_json({"status": "recorded", "action": "click"})
            
            elif action == "get_checkpoints":
                checkpoints = await recording_service.get_checkpoints(session_id)
                await websocket.send_json({"checkpoints": checkpoints})
            
            elif action == "stop":
                result = await recording_service.stop_recording(session_id)
                await websocket.send_json(result)
                break
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"status": "error", "error": str(e)})

