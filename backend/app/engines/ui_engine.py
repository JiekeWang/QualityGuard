"""
UI自动化测试引擎
"""
from typing import Dict, Any, List, Optional
from app.engines.base_engine import BaseTestEngine, TestStatus
from playwright.async_api import async_playwright, Browser, Page, TimeoutError as PlaywrightTimeoutError
import base64
import json


class UIEngine(BaseTestEngine):
    """UI自动化测试引擎"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.browser: Browser = None
        self.page: Page = None
        self.playwright = None
        self.screenshots: List[Dict[str, Any]] = []
        self.variables: Dict[str, Any] = {}  # 变量存储
    
    async def execute(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        """执行UI测试用例"""
        self.status = TestStatus.RUNNING
        self.screenshots = []
        self.variables = test_case.get("variables", {})
        
        try:
            self.playwright = await async_playwright().start()
            
            # 浏览器配置
            browser_config = test_case.get("browser_config", {}) or self.config.get("browser_config", {})
            browser_type = browser_config.get("browser", "chromium")
            headless = browser_config.get("headless", True)
            viewport = browser_config.get("viewport", {"width": 1280, "height": 720})
            
            # 根据配置选择浏览器
            if browser_type == "chromium":
                self.browser = await self.playwright.chromium.launch(headless=headless)
            elif browser_type == "firefox":
                self.browser = await self.playwright.firefox.launch(headless=headless)
            elif browser_type == "webkit":
                self.browser = await self.playwright.webkit.launch(headless=headless)
            else:
                self.browser = await self.playwright.chromium.launch(headless=headless)
            
            # 创建页面
            context = await self.browser.new_context(viewport=viewport)
            self.page = await context.new_page()
            
            # 执行测试步骤
            steps = test_case.get("steps", [])
            results = []
            
            for idx, step in enumerate(steps):
                step_result = await self._execute_step(step, idx)
                results.append(step_result)
                
                # 如果步骤失败且配置了失败即停，则停止执行
                if step_result.get("status") == "failed" and test_case.get("stop_on_failure", False):
                    break
            
            # 判断测试结果
            all_passed = all(r.get("status") == "passed" for r in results)
            self.status = TestStatus.PASSED if all_passed else TestStatus.FAILED
            
            return {
                "status": self.status.value,
                "results": results,
                "screenshots": self.screenshots,
                "variables": self.variables
            }
            
        except Exception as e:
            self.status = TestStatus.ERROR
            return {
                "status": self.status.value,
                "error": str(e),
                "screenshots": self.screenshots
            }
        finally:
            await self.cleanup()
    
    async def _execute_step(self, step: Dict[str, Any], step_index: int) -> Dict[str, Any]:
        """执行单个测试步骤"""
        action = step.get("action")
        step_name = step.get("name", f"步骤 {step_index + 1}")
        
        try:
            # 等待策略
            wait_timeout = step.get("timeout", 30000)  # 默认30秒
            
            # 执行操作
            if action == "navigate":
                url = self._resolve_variable(step.get("url", ""))
                await self.page.goto(url, timeout=wait_timeout)
                return {"status": "passed", "action": action, "name": step_name}
            
            elif action == "click":
                selector = self._resolve_selector(step.get("selector"))
                await self.page.click(selector, timeout=wait_timeout)
                return {"status": "passed", "action": action, "name": step_name}
            
            elif action == "fill":
                selector = self._resolve_selector(step.get("selector"))
                value = self._resolve_variable(step.get("value", ""))
                await self.page.fill(selector, value, timeout=wait_timeout)
                return {"status": "passed", "action": action, "name": step_name}
            
            elif action == "select":
                selector = self._resolve_selector(step.get("selector"))
                value = self._resolve_variable(step.get("value", ""))
                await self.page.select_option(selector, value, timeout=wait_timeout)
                return {"status": "passed", "action": action, "name": step_name}
            
            elif action == "clear":
                selector = self._resolve_selector(step.get("selector"))
                await self.page.fill(selector, "", timeout=wait_timeout)
                return {"status": "passed", "action": action, "name": step_name}
            
            elif action == "hover":
                selector = self._resolve_selector(step.get("selector"))
                await self.page.hover(selector, timeout=wait_timeout)
                return {"status": "passed", "action": action, "name": step_name}
            
            elif action == "drag_and_drop":
                source = self._resolve_selector(step.get("source"))
                target = self._resolve_selector(step.get("target"))
                await self.page.drag_and_drop(source, target, timeout=wait_timeout)
                return {"status": "passed", "action": action, "name": step_name}
            
            elif action == "scroll":
                selector = step.get("selector")
                if selector:
                    selector = self._resolve_selector(selector)
                    await self.page.locator(selector).scroll_into_view_if_needed(timeout=wait_timeout)
                else:
                    direction = step.get("direction", "down")
                    pixels = step.get("pixels", 500)
                    if direction == "down":
                        await self.page.evaluate(f"window.scrollBy(0, {pixels})")
                    elif direction == "up":
                        await self.page.evaluate(f"window.scrollBy(0, -{pixels})")
                return {"status": "passed", "action": action, "name": step_name}
            
            elif action == "wait":
                wait_type = step.get("wait_type", "time")
                if wait_type == "time":
                    milliseconds = step.get("milliseconds", 1000)
                    await self.page.wait_for_timeout(milliseconds)
                elif wait_type == "selector":
                    selector = self._resolve_selector(step.get("selector"))
                    await self.page.wait_for_selector(selector, timeout=wait_timeout)
                elif wait_type == "load":
                    await self.page.wait_for_load_state("load", timeout=wait_timeout)
                return {"status": "passed", "action": action, "name": step_name}
            
            elif action == "screenshot":
                screenshot_type = step.get("screenshot_type", "full")
                if screenshot_type == "full":
                    screenshot_bytes = await self.page.screenshot(full_page=True)
                elif screenshot_type == "element":
                    selector = self._resolve_selector(step.get("selector"))
                    screenshot_bytes = await self.page.locator(selector).screenshot()
                else:
                    screenshot_bytes = await self.page.screenshot()
                
                screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
                self.screenshots.append({
                    "step_index": step_index,
                    "step_name": step_name,
                    "type": screenshot_type,
                    "data": screenshot_base64
                })
                return {"status": "passed", "action": action, "name": step_name}
            
            elif action == "extract":
                extract_type = step.get("extract_type", "text")
                variable_name = step.get("variable_name")
                selector = self._resolve_selector(step.get("selector"))
                
                if extract_type == "text":
                    value = await self.page.locator(selector).text_content()
                elif extract_type == "attribute":
                    attr_name = step.get("attribute_name")
                    value = await self.page.locator(selector).get_attribute(attr_name)
                elif extract_type == "url":
                    value = self.page.url
                elif extract_type == "title":
                    value = await self.page.title()
                else:
                    value = None
                
                if variable_name:
                    self.variables[variable_name] = value
                
                return {
                    "status": "passed",
                    "action": action,
                    "name": step_name,
                    "extracted_value": value
                }
            
            elif action == "assert":
                return await self._execute_assertion(step, step_name)
            
            elif action == "execute_script":
                script = self._resolve_variable(step.get("script", ""))
                result = await self.page.evaluate(script)
                return {"status": "passed", "action": action, "name": step_name, "result": result}
            
            else:
                return {"status": "failed", "error": f"Unknown action: {action}", "name": step_name}
                
        except PlaywrightTimeoutError as e:
            return {"status": "failed", "error": f"Timeout: {str(e)}", "name": step_name, "action": action}
        except Exception as e:
            return {"status": "failed", "error": str(e), "name": step_name, "action": action}
    
    async def _execute_assertion(self, step: Dict[str, Any], step_name: str) -> Dict[str, Any]:
        """执行断言"""
        assertion_type = step.get("assertion_type")
        selector = step.get("selector")
        
        try:
            if assertion_type == "element_exists":
                selector = self._resolve_selector(selector)
                count = await self.page.locator(selector).count()
                passed = count > 0
                return {
                    "status": "passed" if passed else "failed",
                    "action": "assert",
                    "name": step_name,
                    "assertion_type": assertion_type,
                    "expected": True,
                    "actual": count > 0,
                    "passed": passed
                }
            
            elif assertion_type == "element_visible":
                selector = self._resolve_selector(selector)
                is_visible = await self.page.locator(selector).is_visible()
                passed = is_visible == step.get("expected", True)
                return {
                    "status": "passed" if passed else "failed",
                    "action": "assert",
                    "name": step_name,
                    "assertion_type": assertion_type,
                    "expected": step.get("expected", True),
                    "actual": is_visible,
                    "passed": passed
                }
            
            elif assertion_type == "text_equals":
                selector = self._resolve_selector(selector)
                actual_text = await self.page.locator(selector).text_content()
                expected_text = self._resolve_variable(step.get("expected", ""))
                passed = actual_text == expected_text
                return {
                    "status": "passed" if passed else "failed",
                    "action": "assert",
                    "name": step_name,
                    "assertion_type": assertion_type,
                    "expected": expected_text,
                    "actual": actual_text,
                    "passed": passed
                }
            
            elif assertion_type == "text_contains":
                selector = self._resolve_selector(selector)
                actual_text = await self.page.locator(selector).text_content() or ""
                expected_text = self._resolve_variable(step.get("expected", ""))
                passed = expected_text in actual_text
                return {
                    "status": "passed" if passed else "failed",
                    "action": "assert",
                    "name": step_name,
                    "assertion_type": assertion_type,
                    "expected": expected_text,
                    "actual": actual_text,
                    "passed": passed
                }
            
            elif assertion_type == "url_equals":
                actual_url = self.page.url
                expected_url = self._resolve_variable(step.get("expected", ""))
                passed = actual_url == expected_url
                return {
                    "status": "passed" if passed else "failed",
                    "action": "assert",
                    "name": step_name,
                    "assertion_type": assertion_type,
                    "expected": expected_url,
                    "actual": actual_url,
                    "passed": passed
                }
            
            elif assertion_type == "url_contains":
                actual_url = self.page.url
                expected_text = self._resolve_variable(step.get("expected", ""))
                passed = expected_text in actual_url
                return {
                    "status": "passed" if passed else "failed",
                    "action": "assert",
                    "name": step_name,
                    "assertion_type": assertion_type,
                    "expected": expected_text,
                    "actual": actual_url,
                    "passed": passed
                }
            
            elif assertion_type == "title_equals":
                actual_title = await self.page.title()
                expected_title = self._resolve_variable(step.get("expected", ""))
                passed = actual_title == expected_title
                return {
                    "status": "passed" if passed else "failed",
                    "action": "assert",
                    "name": step_name,
                    "assertion_type": assertion_type,
                    "expected": expected_title,
                    "actual": actual_title,
                    "passed": passed
                }
            
            else:
                return {
                    "status": "failed",
                    "error": f"Unknown assertion type: {assertion_type}",
                    "name": step_name
                }
                
        except Exception as e:
            return {"status": "failed", "error": str(e), "name": step_name}
    
    def _resolve_variable(self, value: Any) -> Any:
        """解析变量"""
        if isinstance(value, str):
            # 简单的变量替换：${variable_name}
            import re
            pattern = r'\$\{(\w+)\}'
            matches = re.findall(pattern, value)
            for var_name in matches:
                if var_name in self.variables:
                    value = value.replace(f"${{{var_name}}}", str(self.variables[var_name]))
            return value
        return value
    
    def _resolve_selector(self, selector: Any) -> str:
        """解析选择器（支持变量）"""
        if isinstance(selector, str):
            return self._resolve_variable(selector)
        return str(selector)
    
    async def validate(self, test_case: Dict[str, Any]) -> bool:
        """验证测试用例配置"""
        required_fields = ["steps"]
        return all(field in test_case for field in required_fields)
    
    async def cleanup(self):
        """清理资源"""
        if self.page:
            try:
                await self.page.close()
            except:
                pass
        if self.browser:
            try:
                await self.browser.close()
            except:
                pass
        if self.playwright:
            try:
                await self.playwright.stop()
            except:
                pass

