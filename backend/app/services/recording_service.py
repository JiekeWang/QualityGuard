"""
UI自动化录制服务
支持操作录制和智能检查点识别
"""
from typing import Dict, Any, List, Optional
from playwright.async_api import async_playwright, Browser, Page, BrowserContext
import json
import asyncio
from datetime import datetime


class RecordingService:
    """录制服务"""
    
    def __init__(self):
        self.recordings: Dict[str, Dict[str, Any]] = {}  # 存储录制会话
        self.browsers: Dict[str, Browser] = {}  # 存储浏览器实例
        self.pages: Dict[str, Page] = {}  # 存储页面实例
        self.page_snapshots: Dict[str, List[Dict[str, Any]]] = {}  # 存储页面快照（每次操作后的页面状态）
    
    async def start_recording(
        self, 
        session_id: str,
        browser_type: str = "chromium",
        headless: bool = False,
        viewport: Optional[Dict[str, int]] = None
    ) -> Dict[str, Any]:
        """开始录制会话"""
        try:
            playwright = await async_playwright().start()
            
            # 浏览器配置
            # 在服务器环境中，如果没有图形界面，使用 headless 模式
            import os
            if not headless and not os.environ.get("DISPLAY"):
                import shutil
                xvfb_available = shutil.which("xvfb-run")
                if not xvfb_available:
                    headless = True
            
            browser_launch_config = {
                "headless": headless
            }
            viewport_config = viewport or {"width": 1280, "height": 720}
            
            # 启动浏览器
            if browser_type == "chromium":
                browser = await playwright.chromium.launch(**browser_launch_config)
            elif browser_type == "firefox":
                browser = await playwright.firefox.launch(**browser_launch_config)
            elif browser_type == "webkit":
                browser = await playwright.webkit.launch(**browser_launch_config)
            else:
                browser = await playwright.chromium.launch(**browser_launch_config)
            
            context = await browser.new_context(viewport=viewport_config)
            page = await context.new_page()
            
            # 设置事件监听
            steps: List[Dict[str, Any]] = []
            page_snapshots: List[Dict[str, Any]] = []
            
            # 存储录制会话
            self.recordings[session_id] = {
                "session_id": session_id,
                "browser_type": browser_type,
                "started_at": datetime.now().isoformat(),
                "steps": steps,
                "playwright": playwright,
                "browser": browser,
                "page": page,
                "context": context
            }
            
            self.browsers[session_id] = browser
            self.pages[session_id] = page
            self.page_snapshots[session_id] = page_snapshots
            
            return {
                "session_id": session_id,
                "status": "recording",
                "message": "录制已开始"
            }
            
        except Exception as e:
            return {
                "session_id": session_id,
                "status": "error",
                "error": str(e)
            }
    
    async def capture_page_snapshot(self, session_id: str, step_index: int = None) -> Dict[str, Any]:
        """捕获页面快照（所有元素的状态）"""
        if session_id not in self.pages:
            return {"status": "error", "error": "录制会话不存在"}
        
        try:
            page = self.pages[session_id]
            
            # 等待页面稳定
            await page.wait_for_load_state("networkidle", timeout=5000)
            await asyncio.sleep(0.5)  # 额外等待500ms确保页面完全渲染
            
            # 获取页面所有元素信息
            elements_data = await page.evaluate("""
                () => {
                    const results = [];
                    const seen = new Set();
                    
                    // 获取所有可见元素
                    const allElements = document.querySelectorAll('*');
                    allElements.forEach((el, index) => {
                        // 跳过不可见元素
                        const style = window.getComputedStyle(el);
                        if (style.display === 'none' || style.visibility === 'hidden' || 
                            parseFloat(style.opacity) === 0 || style.width === '0px' || style.height === '0px') {
                            return;
                        }
                        
                        const rect = el.getBoundingClientRect();
                        if (rect.width === 0 && rect.height === 0) {
                            return;
                        }
                        
                        // 获取元素信息
                        const tagName = el.tagName.toLowerCase();
                        const id = el.id || '';
                        const className = el.className || '';
                        const text = (el.innerText || el.textContent || '').trim();
                        const value = el.value || '';
                        const placeholder = el.placeholder || '';
                        const alt = el.alt || '';
                        const href = el.href || '';
                        const src = el.src || '';
                        const type = el.type || '';
                        const name = el.name || '';
                        const role = el.getAttribute('role') || '';
                        const ariaLabel = el.getAttribute('aria-label') || '';
                        const title = el.title || '';
                        
                        // 生成选择器
                        let selector = '';
                        if (id) {
                            selector = '#' + id;
                        } else if (className && typeof className === 'string') {
                            const classes = className.split(' ').filter(c => c && !c.includes(' ')).slice(0, 2).join('.');
                            if (classes) {
                                selector = tagName + '.' + classes;
                            } else {
                                selector = tagName;
                            }
                        } else {
                            selector = tagName;
                        }
                        
                        // 去重
                        const key = selector + '|' + text.substring(0, 30) + '|' + value.substring(0, 30);
                        if (seen.has(key) && !id) {
                            return;
                        }
                        seen.add(key);
                        
                        // 判断元素类型
                        const isButton = tagName === 'button' || type === 'button' || type === 'submit' || 
                                       type === 'reset' || role === 'button' || 
                                       (tagName === 'a' && el.onclick);
                        const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
                        const isLink = tagName === 'a' && href;
                        const isImage = tagName === 'img';
                        const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
                        const isLabel = tagName === 'label';
                        const isVisible = rect.width > 0 && rect.height > 0;
                        
                        // 只收集有意义的元素
                        if (text || id || value || placeholder || alt || href || isButton || isInput || isHeading) {
                            results.push({
                                index: index,
                                tag: tagName,
                                selector: selector,
                                text: text,
                                id: id,
                                className: className,
                                value: value,
                                placeholder: placeholder,
                                alt: alt,
                                href: href,
                                src: src,
                                type: type,
                                name: name,
                                role: role,
                                ariaLabel: ariaLabel,
                                title: title,
                                isButton: isButton,
                                isInput: isInput,
                                isLink: isLink,
                                isImage: isImage,
                                isHeading: isHeading,
                                isLabel: isLabel,
                                isVisible: isVisible,
                                x: Math.round(rect.x),
                                y: Math.round(rect.y),
                                width: Math.round(rect.width),
                                height: Math.round(rect.height)
                            });
                        }
                    });
                    
                    return results;
                }
            """)
            
            # 获取页面基本信息
            current_url = page.url
            page_title = await page.title()
            
            snapshot = {
                "timestamp": datetime.now().isoformat(),
                "step_index": step_index,
                "url": current_url,
                "title": page_title,
                "elements": elements_data,
                "elements_count": len(elements_data)
            }
            
            # 保存快照
            if session_id in self.page_snapshots:
                self.page_snapshots[session_id].append(snapshot)
            
            return {
                "status": "success",
                "snapshot": snapshot
            }
            
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def navigate(self, session_id: str, url: str) -> Dict[str, Any]:
        """导航到指定URL"""
        if session_id not in self.pages:
            return {"status": "error", "error": "录制会话不存在"}
        
        try:
            page = self.pages[session_id]
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await page.wait_for_load_state("networkidle")
            
            # 记录步骤
            step_index = len(self.recordings[session_id]["steps"])
            step = {
                "action": "navigate",
                "url": url,
                "timestamp": datetime.now().isoformat(),
                "step_index": step_index
            }
            self.recordings[session_id]["steps"].append(step)
            
            # 捕获页面快照
            snapshot_result = await self.capture_page_snapshot(session_id, step_index)
            
            return {
                "status": "success",
                "url": url,
                "step_index": step_index,
                "snapshot": snapshot_result.get("snapshot")
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def click(self, session_id: str, selector: str) -> Dict[str, Any]:
        """点击元素"""
        if session_id not in self.pages:
            return {"status": "error", "error": "录制会话不存在"}
        
        try:
            page = self.pages[session_id]
            await page.click(selector, timeout=10000)
            
            # 等待页面响应
            await asyncio.sleep(0.5)
            
            # 记录步骤
            step_index = len(self.recordings[session_id]["steps"])
            step = {
                "action": "click",
                "selector": selector,
                "timestamp": datetime.now().isoformat(),
                "step_index": step_index
            }
            self.recordings[session_id]["steps"].append(step)
            
            # 捕获页面快照
            snapshot_result = await self.capture_page_snapshot(session_id, step_index)
            
            return {
                "status": "success",
                "selector": selector,
                "step_index": step_index,
                "snapshot": snapshot_result.get("snapshot")
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def fill(self, session_id: str, selector: str, value: str) -> Dict[str, Any]:
        """填充输入框"""
        if session_id not in self.pages:
            return {"status": "error", "error": "录制会话不存在"}
        
        try:
            page = self.pages[session_id]
            await page.fill(selector, value, timeout=10000)
            
            # 等待页面响应
            await asyncio.sleep(0.3)
            
            # 记录步骤
            step_index = len(self.recordings[session_id]["steps"])
            step = {
                "action": "fill",
                "selector": selector,
                "value": value,
                "timestamp": datetime.now().isoformat(),
                "step_index": step_index
            }
            self.recordings[session_id]["steps"].append(step)
            
            # 捕获页面快照
            snapshot_result = await self.capture_page_snapshot(session_id, step_index)
            
            return {
                "status": "success",
                "selector": selector,
                "value": value,
                "step_index": step_index,
                "snapshot": snapshot_result.get("snapshot")
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def select_option(self, session_id: str, selector: str, value: str) -> Dict[str, Any]:
        """选择下拉框选项"""
        if session_id not in self.pages:
            return {"status": "error", "error": "录制会话不存在"}
        
        try:
            page = self.pages[session_id]
            await page.select_option(selector, value, timeout=10000)
            
            # 等待页面响应
            await asyncio.sleep(0.5)
            
            # 记录步骤
            step_index = len(self.recordings[session_id]["steps"])
            step = {
                "action": "select",
                "selector": selector,
                "value": value,
                "timestamp": datetime.now().isoformat(),
                "step_index": step_index
            }
            self.recordings[session_id]["steps"].append(step)
            
            # 捕获页面快照
            snapshot_result = await self.capture_page_snapshot(session_id, step_index)
            
            return {
                "status": "success",
                "selector": selector,
                "value": value,
                "step_index": step_index,
                "snapshot": snapshot_result.get("snapshot")
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def get_page_snapshots(self, session_id: str) -> List[Dict[str, Any]]:
        """获取所有页面快照"""
        if session_id not in self.page_snapshots:
            return []
        return self.page_snapshots[session_id]
    
    async def get_snapshot(self, session_id: str, step_index: int) -> Optional[Dict[str, Any]]:
        """获取指定步骤的页面快照"""
        snapshots = await self.get_page_snapshots(session_id)
        for snapshot in snapshots:
            if snapshot.get("step_index") == step_index:
                return snapshot
        return None
    
    async def get_steps(self, session_id: str) -> List[Dict[str, Any]]:
        """获取录制的步骤"""
        if session_id not in self.recordings:
            return []
        return self.recordings[session_id].get("steps", [])
    
    async def stop_recording(self, session_id: str) -> Dict[str, Any]:
        """停止录制"""
        if session_id not in self.recordings:
            return {"status": "error", "error": "录制会话不存在"}
        
        try:
            recording = self.recordings[session_id]
            recording["ended_at"] = datetime.now().isoformat()
            recording["status"] = "stopped"
            
            return {
                "status": "success",
                "steps_count": len(recording["steps"]),
                "snapshots_count": len(self.page_snapshots.get(session_id, []))
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def cleanup(self, session_id: str):
        """清理录制资源"""
        if session_id in self.recordings:
            recording = self.recordings[session_id]
            try:
                if "browser" in recording:
                    await recording["browser"].close()
                if "playwright" in recording:
                    await recording["playwright"].stop()
            except:
                pass
            
            self.recordings.pop(session_id, None)
            self.browsers.pop(session_id, None)
            self.pages.pop(session_id, None)
            self.page_snapshots.pop(session_id, None)


# 全局录制服务实例
recording_service = RecordingService()
