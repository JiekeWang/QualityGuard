"""
API测试引擎
"""
from typing import Dict, Any
import httpx
from app.engines.base_engine import BaseTestEngine, TestStatus


class APIEngine(BaseTestEngine):
    """API测试引擎"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.client: httpx.AsyncClient = None
    
    async def execute(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        """执行API测试用例"""
        self.status = TestStatus.RUNNING
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                self.client = client
                
                # 执行API请求
                method = test_case.get("method", "GET").upper()
                url = test_case.get("url")
                headers = test_case.get("headers", {})
                params = test_case.get("params", {})
                body = test_case.get("body")
                
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    params=params,
                    json=body if body else None
                )
                
                # 验证响应
                assertions = test_case.get("assertions", [])
                assertion_results = []
                
                for assertion in assertions:
                    result = self._validate_assertion(response, assertion)
                    assertion_results.append(result)
                
                all_passed = all(r.get("passed") for r in assertion_results)
                self.status = TestStatus.PASSED if all_passed else TestStatus.FAILED
                
                return {
                    "status": self.status.value,
                    "response": {
                        "status_code": response.status_code,
                        "headers": dict(response.headers),
                        "body": response.text[:1000]  # 限制响应体长度
                    },
                    "assertions": assertion_results
                }
                
        except Exception as e:
            self.status = TestStatus.ERROR
            return {
                "status": self.status.value,
                "error": str(e)
            }
    
    def _validate_assertion(self, response: httpx.Response, assertion: Dict[str, Any]) -> Dict[str, Any]:
        """验证断言"""
        assertion_type = assertion.get("type")
        expected = assertion.get("expected")
        
        try:
            if assertion_type == "status_code":
                passed = response.status_code == expected
                return {
                    "type": assertion_type,
                    "expected": expected,
                    "actual": response.status_code,
                    "passed": passed
                }
            
            elif assertion_type == "contains":
                passed = expected in response.text
                return {
                    "type": assertion_type,
                    "expected": expected,
                    "passed": passed
                }
            
            elif assertion_type == "json_path":
                # TODO: 实现JSON路径断言
                return {
                    "type": assertion_type,
                    "passed": False,
                    "error": "Not implemented"
                }
            
            else:
                return {
                    "type": assertion_type,
                    "passed": False,
                    "error": f"Unknown assertion type: {assertion_type}"
                }
                
        except Exception as e:
            return {
                "type": assertion_type,
                "passed": False,
                "error": str(e)
            }
    
    async def validate(self, test_case: Dict[str, Any]) -> bool:
        """验证测试用例配置"""
        required_fields = ["method", "url"]
        return all(field in test_case for field in required_fields)
    
    async def cleanup(self):
        """清理资源"""
        if self.client:
            await self.client.aclose()

