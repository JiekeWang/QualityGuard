"""
性能测试引擎
"""
from typing import Dict, Any
from app.engines.base_engine import BaseTestEngine, TestStatus
import asyncio
import time
import httpx


class PerformanceEngine(BaseTestEngine):
    """性能测试引擎"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.metrics = []
    
    async def execute(self, test_case: Dict[str, Any]) -> Dict[str, Any]:
        """执行性能测试"""
        self.status = TestStatus.RUNNING
        try:
            # 性能测试配置
            concurrent_users = test_case.get("concurrent_users", 1)
            duration = test_case.get("duration", 60)  # 秒
            url = test_case.get("url")
            method = test_case.get("method", "GET").upper()
            
            # 执行负载测试
            start_time = time.time()
            tasks = []
            
            for _ in range(concurrent_users):
                task = self._run_load_test(url, method, duration)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 收集指标
            metrics = self._collect_metrics(results, start_time)
            
            # 判断是否通过
            threshold = test_case.get("threshold", {})
            passed = self._check_thresholds(metrics, threshold)
            
            self.status = TestStatus.PASSED if passed else TestStatus.FAILED
            
            return {
                "status": self.status.value,
                "metrics": metrics,
                "threshold": threshold
            }
            
        except Exception as e:
            self.status = TestStatus.ERROR
            return {
                "status": self.status.value,
                "error": str(e)
            }
    
    async def _run_load_test(self, url: str, method: str, duration: int):
        """运行负载测试"""
        end_time = time.time() + duration
        results = []
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            while time.time() < end_time:
                start = time.time()
                try:
                    response = await client.request(method=method, url=url)
                    elapsed = time.time() - start
                    results.append({
                        "status_code": response.status_code,
                        "response_time": elapsed,
                        "success": 200 <= response.status_code < 300
                    })
                except Exception as e:
                    elapsed = time.time() - start
                    results.append({
                        "error": str(e),
                        "response_time": elapsed,
                        "success": False
                    })
                
                await asyncio.sleep(0.1)  # 避免过于频繁的请求
        
        return results
    
    def _collect_metrics(self, results: list, start_time: float) -> Dict[str, Any]:
        """收集性能指标"""
        all_results = []
        for result in results:
            if isinstance(result, list):
                all_results.extend(result)
            elif isinstance(result, Exception):
                continue
        
        if not all_results:
            return {}
        
        response_times = [r.get("response_time", 0) for r in all_results]
        successful = sum(1 for r in all_results if r.get("success", False))
        total = len(all_results)
        
        return {
            "total_requests": total,
            "successful_requests": successful,
            "failed_requests": total - successful,
            "success_rate": successful / total if total > 0 else 0,
            "avg_response_time": sum(response_times) / len(response_times) if response_times else 0,
            "min_response_time": min(response_times) if response_times else 0,
            "max_response_time": max(response_times) if response_times else 0,
            "duration": time.time() - start_time
        }
    
    def _check_thresholds(self, metrics: Dict[str, Any], threshold: Dict[str, Any]) -> bool:
        """检查是否满足阈值要求"""
        if not threshold:
            return True
        
        # 检查成功率
        if "success_rate" in threshold:
            if metrics.get("success_rate", 0) < threshold["success_rate"]:
                return False
        
        # 检查平均响应时间
        if "max_avg_response_time" in threshold:
            if metrics.get("avg_response_time", 0) > threshold["max_avg_response_time"]:
                return False
        
        return True
    
    async def validate(self, test_case: Dict[str, Any]) -> bool:
        """验证测试用例配置"""
        required_fields = ["url"]
        return all(field in test_case for field in required_fields)
    
    async def cleanup(self):
        """清理资源"""
        pass

