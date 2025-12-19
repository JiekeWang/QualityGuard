"""
测试执行管理API
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, List, Any, Dict, Tuple
from datetime import datetime
import json
import httpx
import copy
import asyncio

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.test_execution import TestExecution, ExecutionStatus
from app.models.user import User
from app.models.environment import Environment
from app.schemas.test_execution import TestExecutionCreate, TestExecutionResponse
from app.services.report_service import ReportService

router = APIRouter()


def _infer_json_path(field_name: str, response_template: Optional[Dict[str, Any]] = None) -> str:
    """自动推断JSONPath路径，支持深层嵌套和数组索引
    
    Args:
        field_name: 字段名，支持多种格式：
            - "user_id" -> $.user_id 或 $.data.user_id
            - "data_user_id" -> $.data.user_id
            - "items_0_name" -> $.items[0].name
            - "ItemResultDict_OrthoDiagnosis_PassedRules_0_RuleName" 
              -> $.ItemResultDict.OrthoDiagnosis.PassedRules[0].RuleName
        response_template: 响应模板（可选），用于更精确的路径推断
    
    Returns:
        JSONPath路径
    """
    # 处理下划线分隔的嵌套字段，支持数组索引
    parts = field_name.split('_')
    
    # 检查是否包含数组索引（如 items_0_name）
    json_path_parts = []
    i = 0
    while i < len(parts):
        part = parts[i]
        # 检查下一个部分是否是数字（数组索引）
        if i + 1 < len(parts) and parts[i + 1].isdigit():
            json_path_parts.append(f"{part}[{parts[i + 1]}]")
            i += 2
        else:
            json_path_parts.append(part)
            i += 1
    
    # 构建JSONPath
    path = '$.{}'.format('.'.join(json_path_parts))
    
    # 如果有响应模板，尝试验证路径
    if response_template:
        # 尝试在模板中查找字段，支持多层嵌套
        current = response_template
        for part in json_path_parts:
            # 处理数组索引
            if '[' in part:
                field_part = part.split('[')[0]
                if isinstance(current, dict) and field_part in current:
                    return path
                break
            else:
                if isinstance(current, dict) and part in current:
                    current = current[part]
                else:
                    break
        else:
            # 成功遍历所有部分，路径有效
            return path
        
        # 常见情况：字段在data下
        if 'data' in response_template and isinstance(response_template['data'], dict):
            if field_name in response_template['data']:
                return f'$.data.{field_name}'
    
    # 常见情况：如果字段名不包含下划线且不是常见顶级字段，尝试在 $.data 下查找
    if '_' not in field_name and field_name not in ['status', 'code', 'message', 'WorkflowName', 'WorkflowVersion', 'ItemResultDict']:
        return f'$.data.{field_name}'
    
    return path


async def _execute_single_data_driven_test(
    test_data: Dict[str, Any],
    data_index: int,
    request_info_template: Dict[str, Any],
    assertions_cfg: List[Dict[str, Any]],
    base_url: str,
    lines: List[str],
    extractors_cfg: Optional[List[Dict[str, Any]]] = None,
    variable_pool: Optional[Dict[str, Any]] = None,
    token_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """执行单个数据驱动测试
    
    Args:
        test_data: 测试数据
        data_index: 数据索引
        request_info_template: 请求信息模板
        assertions_cfg: 断言配置
        base_url: 基础URL
        lines: 日志行列表
        extractors_cfg: 提取器配置（可选）
        variable_pool: 变量池（可选），用于存储提取的变量
        token_config: Token 配置（可选），用于自动刷新 token
    
    Returns:
        执行结果
    """
    import asyncio
    
    # 合并变量池到测试数据中，使提取的变量可以在请求中使用
    if variable_pool:
        # 创建一个合并后的数据字典，变量池中的变量可以被 test_data 覆盖
        merged_data = {**variable_pool, **test_data}
        test_data = merged_data
    
    # 新的数据驱动逻辑：每行数据包含 request 和 assertions
    test_request = test_data.get("request") or test_data.get("request_params")
    test_assertions = test_data.get("assertions")
    
    # 确定使用的请求配置
    if test_request:
        if isinstance(test_request, str):
            try:
                test_request = json.loads(test_request)
            except:
                test_request = {}
        request_info = copy.deepcopy(request_info_template)
        if test_request.get("body") is not None:
            # 如果test_request中有body字段，使用它
            request_info["body"] = test_request["body"]
        elif test_request:
            # 如果test_request中没有body字段，但有其他字段，深度合并到模板body中
            def deep_merge_body(template_body, data):
                """深度合并：将数据字段更新到模板body的嵌套结构中，保持模板字段的类型"""
                if not isinstance(template_body, dict):
                    return template_body
                result = copy.deepcopy(template_body)
                
                # 类型转换函数：根据模板类型转换数据值
                def convert_to_template_type(template_value, data_value):
                    """根据模板值的类型，转换数据值"""
                    # 如果模板是数组
                    if isinstance(template_value, list):
                        if isinstance(data_value, list):
                            return data_value
                        elif isinstance(data_value, str):
                            if data_value.strip() == "":
                                return []
                            elif data_value.startswith('['):
                                try:
                                    parsed = json.loads(data_value)
                                    return parsed if isinstance(parsed, list) else [data_value]
                                except:
                                    return [data_value]
                            else:
                                return [data_value]
                        elif data_value is None or data_value == "":
                            return []
                        else:
                            return [data_value]
                    # 如果模板是数字
                    elif isinstance(template_value, (int, float)):
                        if isinstance(data_value, (int, float)):
                            return data_value
                        elif isinstance(data_value, str):
                            try:
                                return int(data_value) if '.' not in str(data_value) else float(data_value)
                            except:
                                return template_value
                        else:
                            return template_value
                    # 如果模板是布尔值
                    elif isinstance(template_value, bool):
                        if isinstance(data_value, bool):
                            return data_value
                        elif isinstance(data_value, str):
                            if data_value.lower() in ('true', '1', 'yes'):
                                return True
                            elif data_value.lower() in ('false', '0', 'no', ''):
                                return False
                            else:
                                return template_value
                        elif isinstance(data_value, (int, float)):
                            return bool(data_value)
                        else:
                            return template_value
                    # 如果模板是字符串
                    elif isinstance(template_value, str):
                        return str(data_value) if data_value is not None else ""
                    # 其他类型，直接使用数据值
                    else:
                        return data_value
                
                def update_nested(obj, data_dict):
                    if not isinstance(obj, dict):
                        return obj
                    for key, value in obj.items():
                        if isinstance(value, dict):
                            obj[key] = update_nested(value, data_dict)
                            for data_key, data_value in data_dict.items():
                                if data_key in obj[key]:
                                    # 根据模板类型转换后再赋值
                                    obj[key][data_key] = convert_to_template_type(
                                        obj[key][data_key], 
                                        data_value
                                    )
                        elif key in data_dict:
                            # 根据模板类型转换后更新
                            obj[key] = convert_to_template_type(value, data_dict[key])
                    return obj
                result = update_nested(result, data)
                return result
            template_body = request_info_template.get("body")
            if isinstance(template_body, dict):
                request_info["body"] = deep_merge_body(template_body, test_request)
            else:
                request_info["body"] = test_request
        # 合并其他字段
        if test_request.get("headers"):
            request_info["headers"] = {**request_info.get("headers", {}), **test_request["headers"]}
        if test_request.get("params"):
            request_info["params"] = {**request_info.get("params", {}), **test_request["params"]}
        if test_request.get("path"):
            request_info["path"] = test_request["path"]
        if test_request.get("method"):
            request_info["method"] = test_request["method"]
    else:
        request_info = _apply_test_data(request_info_template, test_data)
    
    # 确定使用的断言配置
    current_assertions = assertions_cfg
    if test_assertions:
        if isinstance(test_assertions, str):
            try:
                current_assertions = json.loads(test_assertions)
            except:
                current_assertions = assertions_cfg
        elif isinstance(test_assertions, list):
            current_assertions = test_assertions
        else:
            current_assertions = assertions_cfg
    else:
        # 尝试从expected_*字段自动生成断言
        auto_generated_assertions = _generate_assertions_from_data(test_data)
        if auto_generated_assertions:
            if assertions_cfg:
                has_status_code = any(a.get('type') == 'status_code' for a in auto_generated_assertions)
                if has_status_code:
                    current_assertions = [a for a in assertions_cfg if a.get('type') != 'status_code']
                else:
                    current_assertions = list(assertions_cfg)
                current_assertions.extend(auto_generated_assertions)
            else:
                current_assertions = auto_generated_assertions
    
    # 构建URL
    path = request_info.get("path") or ""
    if isinstance(path, str) and "${" in path:
        import re
        def replacer(match):
            key = match.group(1)
            value = test_data.get(key)
            if value is None:
                return match.group(0)
            return str(value)
        path = re.sub(r'\$\{(\w+)\}', replacer, path)
    
    url = f"{base_url}{path}" if base_url and not path.startswith("http") else path
    
    headers = request_info.get("headers", {})
    params = request_info.get("params", {})
    body = request_info.get("body")
    
    # 执行HTTP请求（支持 Token 自动刷新）
    http_status: Optional[int] = None
    response_json: Any = None
    response_text: str = ""
    error_message: Optional[str] = None
    max_retries = 1  # Token 刷新后最多重试 1 次
    retry_count = 0
    
    while retry_count <= max_retries:
        try:
            async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
                # 每次请求前，如果有变量池，需要重新应用变量（因为 token 可能已更新）
                if retry_count > 0 and variable_pool:
                    # 重新构建请求头，应用更新后的变量
                    headers = request_info.get("headers", {})
                    if isinstance(headers, dict):
                        # 替换 headers 中的变量
                        import re
                        def replacer(match):
                            key = match.group(1)
                            return str(variable_pool.get(key, match.group(0)))
                        
                        headers = {
                            k: re.sub(r'\$\{(\w+)\}', replacer, str(v)) if isinstance(v, str) else v
                            for k, v in headers.items()
                        }
                
                method = (request_info.get("method") or "GET").upper()
                if method in ("GET", "DELETE"):
                    resp = await client.request(method, url, headers=headers, params=params)
                else:
                    resp = await client.request(
                        method, url, headers=headers, params=params, json=body
                    )
                
                http_status = resp.status_code
                response_text = resp.text
                
                try:
                    response_json = resp.json()
                except:
                    response_json = None
                
                # 检查是否需要刷新 Token
                if token_config and variable_pool is not None:
                    retry_status_codes = token_config.get("retry_status_codes", [401, 403])
                    if http_status in retry_status_codes and retry_count < max_retries:
                        lines.append(f"\n⚠ 检测到状态码 {http_status}，尝试刷新 Token...")
                        success, message = await _refresh_token(token_config, base_url, variable_pool)
                        if success:
                            lines.append(f"✓ {message}")
                            retry_count += 1
                            continue  # 重试请求
                        else:
                            lines.append(f"✗ {message}")
                            error_message = f"Token 刷新失败: {message}"
                            break
                
                # 处理变量提取（仅在第一次请求成功时）
                if retry_count == 0 and extractors_cfg and variable_pool is not None:
                    updated_pool, extract_logs = _process_extractors(
                        extractors_cfg, 
                        response_json, 
                        response_text,
                        variable_pool
                    )
                    # 更新变量池
                    variable_pool.update(updated_pool)
                    # 将提取日志添加到测试日志中
                    if extract_logs:
                        lines.append("\n== 变量提取 ==")
                        lines.extend(extract_logs)
                
                # 请求成功，退出循环
                break
        
        except Exception as e:
            error_message = f"HTTP请求失败: {str(e)}"
            break
        
        retry_count += 1
    
    # 评估断言
    assertions_passed = True
    assertion_results: List[Dict[str, Any]] = []
    
    if current_assertions:
        assertions_passed, assertion_results = _evaluate_assertions(
            current_assertions, http_status, response_json, test_data=test_data
        )
        if not assertions_passed:
            error_message = "断言失败"
    else:
        if error_message:
            assertions_passed = False
        else:
            assertions_passed = True
    
    step_status = "passed" if (assertions_passed and not error_message) else "failed"
    
    return {
        "data_index": data_index,
        "test_data": {k: v for k, v in test_data.items() if not k.startswith('__')},
        "status": step_status,
        "request": {
            "method": request_info.get("method"),
            "url": url,
            "headers": headers,
            "params": params,
            "body": body
        },
        "response": {
            "status_code": http_status,
            "body": response_json,
            "text": response_text[:1000] if response_text else None
        },
        "assertions": assertion_results,
        "error": error_message
    }


def _generate_assertions_from_data(test_data: Dict[str, Any], response_template: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """根据测试数据自动生成断言规则
    
    规则：
    1. expected_status -> 状态码断言
    2. expected_*_<operator> -> 带操作符的JSONPath断言
       - expected_field_contains -> contains 操作符
       - expected_field_greater_than -> greater_than 操作符
       - expected_field_less_than -> less_than 操作符
       - expected_field_not_equal -> not_equal 操作符
    3. expected_* -> 默认 equal 操作符的JSONPath断言
    4. expected_node_* -> 节点断言
    
    支持深层嵌套路径：
    - expected_ItemResultDict_OrthoDiagnosis_PassedRules_0_RuleName
      -> $.ItemResultDict.OrthoDiagnosis.PassedRules[0].RuleName
    
    Args:
        test_data: 测试数据，包含 expected_* 字段
        response_template: 响应模板（可选），用于更精确的路径推断
    
    Returns:
        断言规则列表
    """
    assertions = []
    
    # 支持的操作符后缀
    OPERATOR_SUFFIXES = {
        'contains': 'contains',
        'greater_than': 'greater_than',
        'less_than': 'less_than',
        'not_equal': 'not_equal',
        'exists': 'exists'
    }
    
    # 状态码断言
    if 'expected_status' in test_data:
        status_value = test_data['expected_status']
        # 类型转换
        if isinstance(status_value, str) and status_value.isdigit():
            status_value = int(status_value)
        assertions.append({
            "type": "status_code",
            "expected": status_value
        })
    
    # 节点断言（expected_node_*）
    node_assertions = {}
    for key, value in test_data.items():
        if key.startswith('expected_node_'):
            node_name = key.replace('expected_node_', '')
            # 尝试解析JSON
            if isinstance(value, str):
                try:
                    value = json.loads(value)
                except json.JSONDecodeError:
                    pass
            node_assertions[node_name] = value
    
    # 生成节点断言
    for node_name, expected_value in node_assertions.items():
        json_path = _infer_json_path(node_name, response_template)
        assertions.append({
            "type": "node",
            "path": json_path,
            "mode": "all_fields",
            "expected": expected_value if isinstance(expected_value, dict) else {}
        })
    
    # 其他 expected_* 字段（排除 expected_status 和 expected_node_*）
    for key, value in test_data.items():
        if key.startswith('expected_') and key != 'expected_status' and not key.startswith('expected_node_'):
            # 提取字段名和操作符
            field_name = key.replace('expected_', '')
            operator = 'equal'  # 默认操作符
            
            # 检查是否包含操作符后缀
            for suffix, op in OPERATOR_SUFFIXES.items():
                if field_name.endswith(f'_{suffix}'):
                    field_name = field_name[:-len(suffix)-1]  # 去掉 _suffix
                    operator = op
                    break
            
            # 判断是否为简化配置（不包含下划线和数字，表示简单字段名）
            # 简化配置：expected_PassedRules（不需要写完整路径）
            # 完整配置：expected_ItemResultDict_OrthoDiagnosis_PassedRules_0_RuleName
            is_simple_field = '_' not in field_name and not any(c.isdigit() for c in field_name)
            
            if is_simple_field and isinstance(value, str) and len(value) > 20:
                # 简化配置：使用智能匹配
                # 特点：字段名简单（如 PassedRules），期望值是长字符串（JSON 片段）
                assertions.append({
                    "type": "smart_match",
                    "field": field_name,
                    "expected": value
                })
            else:
                # 完整配置：使用传统的 JSONPath 断言
                json_path = _infer_json_path(field_name, response_template)
                expected_value = _auto_convert_type(value)
                
                assertions.append({
                    "type": "json_path",
                    "path": json_path,
                    "operator": operator,
                    "expected": expected_value
                })
    
    return assertions


def _parse_array_field(value: str, delimiter: str = ',') -> List[Any]:
    """解析数组字段值，支持分隔符和JSON格式
    
    Args:
        value: 字段值，可以是分隔符分隔的字符串或JSON数组字符串
        delimiter: 分隔符，默认为逗号
    
    Returns:
        解析后的数组
    """
    if not isinstance(value, str):
        return [value]
    
    value = value.strip()
    if not value:
        return []
    
    # 尝试作为JSON数组解析
    if value.startswith('['):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass
    
    # 使用分隔符分隔
    items = [item.strip() for item in value.split(delimiter)]
    
    # 尝试类型转换
    result = []
    for item in items:
        if not item:
            continue
        # 尝试转换为数字
        try:
            if '.' in item:
                result.append(float(item))
            else:
                result.append(int(item))
        except ValueError:
            # 尝试转换为布尔值
            if item.lower() == 'true':
                result.append(True)
            elif item.lower() == 'false':
                result.append(False)
            elif item.lower() == 'null':
                result.append(None)
            else:
                result.append(item)
    
    return result


def _auto_convert_type(value: Any) -> Any:
    """自动转换值的类型
    
    Args:
        value: 原始值
    
    Returns:
        转换后的值
    """
    if not isinstance(value, str):
        return value
    
    value = value.strip()
    
    # 空字符串
    if not value:
        return value
    
    # 布尔值
    if value.lower() == 'true':
        return True
    elif value.lower() == 'false':
        return False
    elif value.lower() == 'null':
        return None
    
    # 尝试JSON解析
    if value.startswith(('{', '[')):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            pass
    
    # 尝试数字
    try:
        if '.' in value:
            return float(value)
        else:
            return int(value)
    except ValueError:
        pass
    
    # 保持字符串
    return value


def _apply_test_data(template: Dict[str, Any], test_data: Dict[str, Any]) -> Dict[str, Any]:
    """将测试数据应用到请求模板中，支持在URL、headers、params、body等位置使用变量替换
    
    增强功能：
    - 支持数组字段处理（分隔符、JSON格式）
    - 支持类型自动转换（数字、布尔值、null）
    - 支持嵌套对象和数组
    - 支持字段名后缀识别（如 user_ids_1, user_ids_2 合并为数组）
    """
    import copy
    import re
    import json
    result = copy.deepcopy(template)
    
    # 预处理测试数据：识别并合并数组字段（如 user_ids_1, user_ids_2 -> user_ids: [...]）
    processed_test_data = {}
    array_fields = {}  # {base_name: [value1, value2, ...]}
    
    for key, value in test_data.items():
        # 检查是否是数组字段后缀格式（如 user_ids_1）
        match = re.match(r'^(.+)_(\d+)$', key)
        if match:
            base_name = match.group(1)
            index = int(match.group(2))
            if base_name not in array_fields:
                array_fields[base_name] = {}
            array_fields[base_name][index] = value
        else:
            processed_test_data[key] = value
    
    # 合并数组字段
    for base_name, values_dict in array_fields.items():
        # 按索引排序并合并
        sorted_values = [values_dict[i] for i in sorted(values_dict.keys())]
        # 过滤空值
        sorted_values = [v for v in sorted_values if v is not None and v != '']
        if sorted_values:
            processed_test_data[base_name] = sorted_values
    
    # 递归替换函数，支持 ${key} 格式的变量替换
    def replace_vars(obj: Any, template_value: Any = None) -> Any:
        if isinstance(obj, dict):
            return {k: replace_vars(v, template_value.get(k) if isinstance(template_value, dict) else None) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [replace_vars(item) for item in obj]
        elif isinstance(obj, str):
            # 检查是否整个字符串就是一个变量（如 "${user_ids}"）
            full_var_match = re.fullmatch(r'\$\{(\w+)\}', obj)
            if full_var_match:
                key = full_var_match.group(1)
                value = processed_test_data.get(key)
                if value is not None:
                    # 检查模板中该位置是否应该是数组
                    if isinstance(template_value, list) and isinstance(value, str):
                        # 模板是数组，尝试将值解析为数组
                        return _parse_array_field(value)
                    elif isinstance(value, list):
                        # 值本身是数组，直接返回
                        return value
                    else:
                        # 自动类型转换
                        return _auto_convert_type(value)
                return match.group(0)  # 变量不存在，保持原样
            
            # 支持 ${key} 格式的部分变量替换（如 "user_${id}"）
            def replacer(match):
                key = match.group(1)
                value = processed_test_data.get(key)
                if value is None:
                    return match.group(0)  # 如果变量不存在，保持原样
                # 如果值是对象或数组，转换为JSON字符串
                if isinstance(value, (dict, list)):
                    return json.dumps(value, ensure_ascii=False)
                return str(value)
            return re.sub(r'\$\{(\w+)\}', replacer, obj)
        else:
            return obj
    
    # 替换所有位置的变量
    result = replace_vars(result, template)
    
    # 特殊处理：如果path中包含变量，需要替换
    if isinstance(result.get("path"), str):
        result["path"] = replace_vars(result["path"])
    
    # 特殊处理：如果body是字符串且包含JSON，尝试解析后替换
    if isinstance(result.get("body"), str):
        try:
            # 先替换变量
            body_str = replace_vars(result["body"])
            # 尝试解析为JSON
            parsed_body = json.loads(body_str)
            result["body"] = replace_vars(parsed_body, template.get("body") if isinstance(template, dict) else None)
        except (json.JSONDecodeError, TypeError):
            # 如果解析失败，直接使用替换后的字符串
            result["body"] = body_str
    
    # 如果body是字典，只替换其中的变量，不要直接合并测试数据
    # 测试数据应该通过 ${key} 格式在body中引用，而不是直接合并
    if isinstance(result.get("body"), dict):
        # 只替换body中的变量，不合并测试数据
        result["body"] = replace_vars(result["body"], template.get("body") if isinstance(template, dict) else None)
    elif result.get("body") is None and test_data:
        # 如果body为空，直接使用测试数据作为body（排除expected_*字段）
        filtered_data = {k: v for k, v in processed_test_data.items() if not k.startswith('expected_')}
        result["body"] = filtered_data
    
    return result


def _find_field_in_response(data: Any, field_name: str) -> Any:
    """递归搜索响应中的字段，返回第一个匹配的值
    
    Args:
        data: 响应数据（dict 或 list）
        field_name: 要搜索的字段名
    
    Returns:
        找到的字段值，如果未找到返回 None
    
    Examples:
        _find_field_in_response({"a": {"b": {"target": 123}}}, "target") -> 123
        _find_field_in_response({"data": [{"name": "test"}]}, "name") -> "test"
    """
    if data is None:
        return None
    
    # 如果是字典，检查是否包含目标字段
    if isinstance(data, dict):
        if field_name in data:
            return data[field_name]
        # 递归搜索所有子字段
        for value in data.values():
            result = _find_field_in_response(value, field_name)
            if result is not None:
                return result
    
    # 如果是数组，递归搜索每个元素
    elif isinstance(data, list):
        for item in data:
            result = _find_field_in_response(item, field_name)
            if result is not None:
                return result
    
    return None


def _smart_match(actual: Any, expected: str) -> bool:
    """智能匹配：支持部分字段匹配、字符串包含、数组匹配
    
    Args:
        actual: 实际值（可能是字符串、字典、数组等）
        expected: 期望值（字符串片段）
    
    Returns:
        是否匹配
    
    Examples:
        _smart_match([{"name": "test"}], '"name": "test"') -> True
        _smart_match('{"a":1,"b":2}', '"a": 1') -> True
    """
    if actual is None:
        return False
    
    # 如果实际值是数组，检查任一元素是否匹配
    if isinstance(actual, list):
        for item in actual:
            if _smart_match(item, expected):
                return True
        return False
    
    # 将实际值转换为字符串进行比较
    if isinstance(actual, dict):
        # 字典转 JSON 字符串
        actual_str = json.dumps(actual, ensure_ascii=False, separators=(',', ':'))
    elif isinstance(actual, str):
        actual_str = actual
    else:
        actual_str = str(actual)
    
    # 清理期望值中的多余空格和换行
    expected_clean = expected.strip()
    
    # 方式1：直接包含检查
    if expected_clean in actual_str:
        return True
    
    # 方式2：尝试标准化 JSON 格式后再比较
    # 移除期望值和实际值中的空格差异
    actual_normalized = actual_str.replace(' ', '').replace('\n', '')
    expected_normalized = expected_clean.replace(' ', '').replace('\n', '')
    
    if expected_normalized in actual_normalized:
        return True
    
    # 方式3：如果期望值看起来是 JSON 片段，尝试解析后进行部分匹配
    try:
        # 尝试将期望值包装成完整的 JSON 对象再解析
        expected_obj = json.loads('{' + expected_clean + '}')
        if isinstance(actual, dict):
            # 检查所有期望的字段是否存在且值相等
            for key, value in expected_obj.items():
                if key not in actual or actual[key] != value:
                    return False
            return True
    except (json.JSONDecodeError, ValueError):
        pass
    
    return False


async def _refresh_token(
    token_config: Dict[str, Any],
    base_url: str,
    variable_pool: Dict[str, Any]
) -> Tuple[bool, str]:
    """刷新 Token
    
    Args:
        token_config: Token 配置，格式：
            {
                "url": "/api/auth/login",  # Token 接口 URL
                "method": "POST",           # 请求方法
                "headers": {...},           # 请求头
                "body": {...},              # 请求体
                "extractors": [             # 提取器配置
                    {"name": "token", "type": "json", "path": "$.data.token"}
                ],
                "retry_status_codes": [401, 403]  # 触发刷新的状态码
            }
        base_url: 基础 URL
        variable_pool: 变量池，用于存储提取的 token
    
    Returns:
        (是否成功, 错误信息)
    """
    try:
        url = token_config.get("url", "")
        if not url:
            return False, "Token 配置缺少 url 字段"
        
        # 构造完整 URL
        if not url.startswith("http"):
            if not url.startswith("/"):
                url = "/" + url
            url = f"{base_url}{url}"
        
        method = token_config.get("method", "POST").upper()
        headers = token_config.get("headers", {})
        body = token_config.get("body", {})
        params = token_config.get("params", {})
        
        # 发送请求获取 token
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            if method in ("GET", "DELETE"):
                resp = await client.request(method, url, headers=headers, params=params)
            else:
                resp = await client.request(
                    method, url, headers=headers, params=params, json=body
                )
            
            if resp.status_code != 200:
                return False, f"Token 接口返回非 200 状态码: {resp.status_code}"
            
            # 解析响应
            response_text = resp.text
            try:
                response_json = resp.json()
            except:
                return False, "Token 接口响应不是有效的 JSON"
            
            # 提取 token
            extractors = token_config.get("extractors", [])
            if not extractors:
                return False, "Token 配置缺少 extractors 字段"
            
            updated_pool, extract_logs = _process_extractors(
                extractors,
                response_json,
                response_text,
                variable_pool
            )
            
            # 更新变量池
            variable_pool.update(updated_pool)
            
            # 检查是否成功提取了 token
            token_name = extractors[0].get("name", "token")
            if token_name in variable_pool:
                return True, f"Token 刷新成功: {token_name}"
            else:
                return False, "Token 提取失败"
                
    except Exception as e:
        return False, f"Token 刷新失败: {str(e)}"


def _extract_json_path(data: Any, path: str) -> Any:
    """非常轻量的 JSONPath 支持，只处理 $.a.b[0].c 这类常见写法。"""
    if not path or not isinstance(data, (dict, list)):
        return None
    # 兼容两种常见前缀：$.field 和 $[0].field
    if path.startswith("$."):
        path = path[2:]
    elif path.startswith("$["):
        # 去掉开头的 $，保留数组下标部分
        path = path[1:]
    parts = path.split(".")
    current: Any = data
    for part in parts:
        if current is None:
            return None
        # 处理 a[0] 这种
        if "[" in part and part.endswith("]"):
            name, index_part = part.split("[", 1)
            index_str = index_part[:-1]
            if name:
                if not isinstance(current, dict) or name not in current:
                    return None
                current = current.get(name)
            if not isinstance(current, list):
                return None
            try:
                idx = int(index_str)
            except ValueError:
                return None
            if idx < 0 or idx >= len(current):
                return None
            current = current[idx]
        else:
            if not isinstance(current, dict) or part not in current:
                return None
            current = current.get(part)
    return current


def _extract_variable_by_json(response_data: Any, path: str) -> Any:
    """通过 JSONPath 从响应中提取数据
    
    Args:
        response_data: 响应数据（通常是字典）
        path: JSONPath 表达式，如 "$.data.token"
    
    Returns:
        提取到的数据，如果路径不存在则返回 None
    """
    return _extract_json_path(response_data, path)


def _extract_variable_by_regex(response_text: str, pattern: str) -> Optional[str]:
    """通过正则表达式从响应文本中提取数据
    
    Args:
        response_text: 响应文本
        pattern: 正则表达式，需要包含捕获组，如 r"token=(\\w+)"
    
    Returns:
        提取到的第一个捕获组的值，如果匹配失败则返回 None
    """
    import re
    match = re.search(pattern, response_text)
    if match:
        # 返回第一个捕获组
        if match.groups():
            return match.group(1)
        # 如果没有捕获组，返回整个匹配
        return match.group(0)
    return None


def _process_extractors(
    extractors: List[Dict[str, Any]], 
    response_json: Any, 
    response_text: str,
    variable_pool: Dict[str, Any]
) -> Tuple[Dict[str, Any], List[str]]:
    """处理提取器配置，从响应中提取变量
    
    Args:
        extractors: 提取器配置列表，格式：
            [
                {"name": "token", "type": "json", "path": "$.data.token"},
                {"name": "userId", "type": "regex", "pattern": "userId=(\\d+)"}
            ]
        response_json: 响应的 JSON 数据
        response_text: 响应的文本数据
        variable_pool: 变量池（会被修改）
    
    Returns:
        (更新后的变量池, 提取日志列表)
    """
    logs = []
    
    for extractor in extractors:
        if not isinstance(extractor, dict):
            logs.append(f"[警告] 提取器配置格式错误: {extractor}")
            continue
        
        name = extractor.get("name")
        extract_type = extractor.get("type", "json")
        
        if not name:
            logs.append(f"[警告] 提取器缺少 'name' 字段: {extractor}")
            continue
        
        extracted_value = None
        
        try:
            if extract_type == "json":
                path = extractor.get("path")
                if not path:
                    logs.append(f"[警告] JSON 提取器 '{name}' 缺少 'path' 字段")
                    continue
                extracted_value = _extract_variable_by_json(response_json, path)
                
            elif extract_type == "regex":
                pattern = extractor.get("pattern")
                if not pattern:
                    logs.append(f"[警告] 正则提取器 '{name}' 缺少 'pattern' 字段")
                    continue
                extracted_value = _extract_variable_by_regex(response_text, pattern)
                
            elif extract_type == "header":
                # 从响应头中提取
                header_name = extractor.get("header")
                if not header_name:
                    logs.append(f"[警告] Header 提取器 '{name}' 缺少 'header' 字段")
                    continue
                # 注意：这里需要从实际的响应对象中获取 headers
                # 暂时标记为不支持，后续可以扩展
                logs.append(f"[警告] Header 提取器暂未实现: '{name}'")
                continue
                
            else:
                logs.append(f"[警告] 不支持的提取类型 '{extract_type}' for '{name}'")
                continue
            
            if extracted_value is not None:
                variable_pool[name] = extracted_value
                # 限制日志长度
                value_str = str(extracted_value)
                if len(value_str) > 100:
                    value_str = value_str[:100] + "..."
                logs.append(f"✓ 提取变量 '{name}' = {value_str}")
            else:
                logs.append(f"✗ 提取变量 '{name}' 失败：未找到匹配的数据")
                
        except Exception as e:
            logs.append(f"✗ 提取变量 '{name}' 失败：{str(e)}")
    
    return variable_pool, logs


def _replace_template_variables(template: Any, test_data: Dict[str, Any]) -> Any:
    """在模板中递归替换变量
    
    Args:
        template: 模板对象（可以是dict、list、str等）
        test_data: 测试数据
    
    Returns:
        替换后的对象
    """
    import re
    import copy
    
    if test_data is None:
        return template
    
    def replace_value(value: Any) -> Any:
        """递归替换变量"""
        if isinstance(value, dict):
            return {k: replace_value(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [replace_value(item) for item in value]
        elif isinstance(value, str) and "${" in value:
            def replacer(match):
                key = match.group(1)
                var_value = test_data.get(key)
                if var_value is None:
                    return match.group(0)  # 变量不存在，保持原样
                # 如果值是对象或数组，转换为JSON字符串
                if isinstance(var_value, (dict, list)):
                    return json.dumps(var_value, ensure_ascii=False)
                return str(var_value)
            return re.sub(r'\$\{(\w+)\}', replacer, value)
        else:
            return value
    
    return replace_value(copy.deepcopy(template))


def _evaluate_node_assertion(
    assertion: Dict[str, Any],
    response_json: Any,
    test_data: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, List[Dict[str, Any]]]:
    """评估节点断言
    
    Args:
        assertion: 节点断言配置
        response_json: 响应JSON数据
        test_data: 测试数据（可选），用于变量替换
    
    Returns:
        (是否通过, 详细结果列表)
    """
    path = assertion.get("path", "$")
    mode = assertion.get("mode", "all_fields")
    expected = assertion.get("expected", {})
    template = assertion.get("template", {})
    config = assertion.get("config", {})
    operator = assertion.get("operator", "equals")
    
    results = []
    all_passed = True
    
    # 提取节点值
    node_value = _extract_json_path(response_json, path)
    
    if node_value is None:
        return False, [{
            "type": "node",
            "path": path,
            "passed": False,
            "message": f"节点 {path} 不存在"
        }]
    
    # 处理不同的模式
    if mode == "all_fields":
        # 断言所有字段
        if not isinstance(expected, dict):
            return False, [{
                "type": "node",
                "path": path,
                "passed": False,
                "message": "expected 必须是字典类型"
            }]
        
        if not isinstance(node_value, dict):
            return False, [{
                "type": "node",
                "path": path,
                "passed": False,
                "message": f"节点 {path} 不是字典类型，实际类型: {type(node_value).__name__}"
            }]
        
        # 遍历expected中的所有字段
        for field, expected_value in expected.items():
            field_path = f"{path}.{field}" if path != "$" else f"$.{field}"
            actual_value = node_value.get(field)
            
            # 变量替换
            if isinstance(expected_value, str) and test_data:
                expected_value = _replace_template_variables(expected_value, test_data)
            
            # 类型转换（与现有逻辑保持一致）
            if isinstance(expected_value, str):
                try:
                    if "." in expected_value:
                        expected_value = float(expected_value)
                    else:
                        expected_value = int(expected_value)
                except ValueError:
                    if expected_value.lower() == "true":
                        expected_value = True
                    elif expected_value.lower() == "false":
                        expected_value = False
                    elif expected_value.lower() == "null":
                        expected_value = None
            
            # 比较值
            passed = actual_value == expected_value
            results.append({
                "type": "node",
                "path": field_path,
                "field": field,
                "expected": expected_value,
                "actual": actual_value,
                "passed": passed,
                "message": f"节点字段 {field} 断言{'通过' if passed else '失败'}" if passed else f"期望 {expected_value}，实际 {actual_value}"
            })
            
            if not passed:
                all_passed = False
    
    elif mode == "template":
        # 模板模式：先替换模板中的变量，然后执行all_fields断言
        if test_data:
            replaced_expected = _replace_template_variables(template, test_data)
        else:
            replaced_expected = template
        
        # 递归调用all_fields模式
        return _evaluate_node_assertion({
            **assertion,
            "mode": "all_fields",
            "expected": replaced_expected
        }, response_json, test_data)
    
    elif mode == "auto_generate":
        # 自动生成模式：检查节点中的所有字段是否存在
        if isinstance(node_value, dict):
            include_fields = config.get("include_fields", [])
            exclude_fields = config.get("exclude_fields", [])
            
            for field, actual_value in node_value.items():
                # 字段筛选
                if exclude_fields and field in exclude_fields:
                    continue
                if include_fields and field not in include_fields:
                    continue
                
                field_path = f"{path}.{field}" if path != "$" else f"$.{field}"
                
                # 默认只检查存在性
                if operator == "exists":
                    passed = actual_value is not None
                elif operator == "equals":
                    # 如果没有expected，则无法比较
                    passed = True
                else:
                    passed = True
                
                results.append({
                    "type": "node",
                    "path": field_path,
                    "field": field,
                    "expected": None,
                    "actual": actual_value,
                    "passed": passed,
                    "operator": operator,
                    "message": f"字段 {field} 存在性检查{'通过' if passed else '失败'}"
                })
                
                if not passed:
                    all_passed = False
        else:
            return False, [{
                "type": "node",
                "path": path,
                "passed": False,
                "message": f"节点 {path} 不是字典类型，无法使用auto_generate模式"
            }]
    
    elif mode == "smart":
        # 智能模式：支持字段规则配置
        include_fields = config.get("include_fields", [])
        exclude_fields = config.get("exclude_fields", [])
        field_rules = config.get("field_rules", {})
        
        if not isinstance(node_value, dict):
            return False, [{
                "type": "node",
                "path": path,
                "passed": False,
                "message": f"节点 {path} 不是字典类型，无法使用smart模式"
            }]
        
        for field in node_value.keys():
            # 字段筛选
            if exclude_fields and field in exclude_fields:
                continue
            if include_fields and field not in include_fields:
                continue
            
            field_path = f"{path}.{field}" if path != "$" else f"$.{field}"
            actual_value = node_value.get(field)
            
            # 应用字段规则
            if field in field_rules:
                rule = field_rules[field]
                expected_value = rule.get("expected")
                field_operator = rule.get("operator", "equals")
                
                # 变量替换
                if isinstance(expected_value, str) and test_data:
                    expected_value = _replace_template_variables(expected_value, test_data)
                
                # 执行比较
                if field_operator == "equals":
                    passed = actual_value == expected_value
                elif field_operator == "contains":
                    passed = expected_value in str(actual_value) if actual_value else False
                elif field_operator == "regex":
                    import re
                    passed = bool(re.match(expected_value, str(actual_value))) if actual_value else False
                elif field_operator == "gt":
                    try:
                        passed = actual_value > expected_value
                    except:
                        passed = False
                elif field_operator == "lt":
                    try:
                        passed = actual_value < expected_value
                    except:
                        passed = False
                else:
                    passed = False
                
                results.append({
                    "type": "node",
                    "path": field_path,
                    "field": field,
                    "expected": expected_value,
                    "actual": actual_value,
                    "operator": field_operator,
                    "passed": passed,
                    "message": f"字段 {field} 断言{'通过' if passed else '失败'}"
                })
            else:
                # 默认规则：存在性检查
                passed = actual_value is not None
                results.append({
                    "type": "node",
                    "path": field_path,
                    "field": field,
                    "expected": None,
                    "actual": actual_value,
                    "passed": passed,
                    "message": f"字段 {field} 存在性检查{'通过' if passed else '失败'}"
                })
            
            if not passed:
                all_passed = False
    else:
        return False, [{
            "type": "node",
            "path": path,
            "passed": False,
            "message": f"不支持的节点断言模式: {mode}"
        }]
    
    return all_passed, results


def _evaluate_assertions(
    assertions: List[Dict[str, Any]],
    http_status: Optional[int],
    response_json: Any,
    test_data: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, List[Dict[str, Any]]]:
    """根据断言规则校验响应，返回：(整体是否通过, 每条断言详情)。
    
    Args:
        assertions: 断言配置列表
        http_status: HTTP状态码
        response_json: 响应JSON数据
        test_data: 测试数据（可选），用于在断言中使用变量替换
    """
    if not assertions:
        return True, []

    results: List[Dict[str, Any]] = []
    all_passed = True

    # 变量替换函数，支持在断言中使用 ${变量名} 引用测试数据
    def replace_vars_in_assertion(value: Any) -> Any:
        """在断言值中替换变量"""
        if test_data is None:
            return value
        if isinstance(value, str) and "${" in value:
            import re
            def replacer(match):
                key = match.group(1)
                var_value = test_data.get(key)
                if var_value is None:
                    return match.group(0)  # 变量不存在，保持原样
                # 如果值是对象或数组，转换为JSON字符串
                if isinstance(var_value, (dict, list)):
                    import json
                    return json.dumps(var_value, ensure_ascii=False)
                return str(var_value)
            return re.sub(r'\$\{(\w+)\}', replacer, value)
        return value

    for item in assertions:
        a_type = (item or {}).get("type")
        passed = True
        actual: Any = None
        message = ""

        if a_type == "status_code":
            expected_raw = item.get("expected")
            # 支持在expected中使用变量
            expected = replace_vars_in_assertion(expected_raw)
            # 如果替换后是字符串且是数字，尝试转换为整数
            if isinstance(expected, str) and expected.isdigit():
                expected = int(expected)
            actual = http_status
            passed = http_status == expected
            if not passed:
                message = f"期望状态码为 {expected}, 实际为 {actual}"
            
            results.append(
                {
                    **(item or {}),
                    "actual": actual,
                    "passed": passed,
                    "message": message,
                }
            )
            if not passed:
                all_passed = False

        elif a_type == "response_body":
            path_raw = item.get("path") or ""
            # 支持在path中使用变量
            path = replace_vars_in_assertion(path_raw)
            operator = item.get("operator") or "equal"
            expected_raw = item.get("expected")
            # 支持在expected中使用变量
            expected = replace_vars_in_assertion(expected_raw)
            # 尝试将expected转换为合适的类型（数字、布尔值等）
            if isinstance(expected, str):
                # 尝试转换为数字
                try:
                    if "." in expected:
                        expected = float(expected)
                    else:
                        expected = int(expected)
                except ValueError:
                    # 尝试转换为布尔值
                    if expected.lower() == "true":
                        expected = True
                    elif expected.lower() == "false":
                        expected = False
                    elif expected.lower() == "null":
                        expected = None
            actual = _extract_json_path(response_json, path)

            if operator == "equal":
                passed = actual == expected
            elif operator == "not_equal":
                passed = actual != expected
            elif operator == "contains":
                if isinstance(actual, (list, str)):
                    passed = expected in actual
                else:
                    passed = False
            elif operator == "not_contains":
                if isinstance(actual, (list, str)):
                    passed = expected not in actual
                else:
                    passed = False
            elif operator == "gt":
                try:
                    passed = actual > expected
                except Exception:
                    passed = False
            elif operator == "lt":
                try:
                    passed = actual < expected
                except Exception:
                    passed = False
            else:
                # 未知运算符，视为失败
                passed = False
                message = f"不支持的运算符: {operator}"

            if not passed and not message:
                message = f"路径 {path} 断言失败，期望 {operator} {expected}，实际值为 {actual!r}"
            
            results.append(
                {
                    **(item or {}),
                    "actual": actual,
                    "passed": passed,
                    "message": message,
                }
            )
            if not passed:
                all_passed = False

        elif a_type == "json_path":
            # json_path 断言（与 response_body 逻辑相同）
            path_raw = item.get("path") or ""
            path = replace_vars_in_assertion(path_raw)
            expected_raw = item.get("expected")
            expected = replace_vars_in_assertion(expected_raw)
            operator = item.get("operator") or "equal"
            
            # 类型转换
            if isinstance(expected, str):
                try:
                    if "." in expected:
                        expected = float(expected)
                    else:
                        expected = int(expected)
                except ValueError:
                    if expected.lower() == "true":
                        expected = True
                    elif expected.lower() == "false":
                        expected = False
                    elif expected.lower() == "null":
                        expected = None
            
            actual = _extract_json_path(response_json, path)
            
            if operator == "equal":
                passed = actual == expected
            elif operator == "contains":
                if isinstance(actual, (list, str)):
                    passed = expected in actual
                elif isinstance(actual, dict):
                    # 如果actual是对象，检查expected字符串是否在JSON序列化后的结果中
                    import json
                    actual_str = json.dumps(actual, ensure_ascii=False)
                    passed = str(expected) in actual_str
                else:
                    passed = False
            else:
                passed = actual == expected
            
            if not passed:
                message = f"路径 {path} 断言失败，期望 {expected}，实际值为 {actual!r}"
            
            results.append(
                {
                    **(item or {}),
                    "actual": actual,
                    "passed": passed,
                    "message": message,
                }
            )
            if not passed:
                all_passed = False

        elif a_type == "smart_match":
            # 智能匹配断言：简化配置，自动搜索字段并进行智能匹配
            field_name = item.get("field") or ""
            expected_raw = item.get("expected") or ""
            expected = replace_vars_in_assertion(expected_raw)
            
            # 在响应中递归搜索字段
            actual = _find_field_in_response(response_json, field_name)
            
            # 智能匹配
            if actual is not None:
                passed = _smart_match(actual, expected)
                if passed:
                    message = f"字段 {field_name} 智能匹配通过"
                else:
                    message = f"字段 {field_name} 智能匹配失败，期望包含: {expected[:100]}..., 实际值: {json.dumps(actual, ensure_ascii=False)[:200]}..."
            else:
                passed = False
                message = f"字段 {field_name} 在响应中未找到"
            
            results.append(
                {
                    **(item or {}),
                    "actual": actual,
                    "passed": passed,
                    "message": message,
                }
            )
            if not passed:
                all_passed = False

        elif a_type == "node" or a_type == "node_template":
            # 节点断言
            node_passed, node_results = _evaluate_node_assertion(item, response_json, test_data)
            results.extend(node_results)
            if not node_passed:
                all_passed = False

        else:
            # 其他类型暂时标记为未实现
            passed = False
            message = f"断言类型 {a_type!r} 暂未实现"
            
            results.append(
                {
                    **(item or {}),
                    "actual": actual,
                    "passed": passed,
                    "message": message,
                }
            )
            if not passed:
                all_passed = False

    return all_passed, results


@router.get("/", response_model=List[TestExecutionResponse])
async def get_test_executions(
    project_id: Optional[int] = Query(None, description="项目ID"),
    test_case_id: Optional[int] = Query(None, description="测试用例ID"),
    status: Optional[ExecutionStatus] = Query(None, description="执行状态"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取测试执行列表"""
    query = select(TestExecution)
    conditions = []
    
    if project_id:
        conditions.append(TestExecution.project_id == project_id)
    if test_case_id:
        conditions.append(TestExecution.test_case_id == test_case_id)
    if status:
        conditions.append(TestExecution.status == status)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.offset(skip).limit(limit).order_by(TestExecution.created_at.desc())
    
    result = await db.execute(query)
    executions = result.scalars().all()
    return executions


@router.post("/", response_model=TestExecutionResponse, status_code=status.HTTP_201_CREATED)
async def create_test_execution(
    execution: TestExecutionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建测试执行"""
    # 检查测试用例是否存在
    from app.models.test_case import TestCase
    case_result = await db.execute(select(TestCase).where(TestCase.id == execution.test_case_id))
    test_case = case_result.scalar_one_or_none()
    if not test_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试用例不存在"
        )
    
    # 检查项目是否存在
    from app.models.project import Project
    project_result = await db.execute(select(Project).where(Project.id == execution.project_id))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )

    # 检查是否启用数据驱动
    is_data_driven = test_case.is_data_driven or False
    data_driver_config = test_case.data_driver or {}
    test_data_list: List[Dict[str, Any]] = []
    
    if is_data_driven and data_driver_config:
        # 支持多种数据源：直接数组、数据模板、数据源ID
        if isinstance(data_driver_config.get("data"), list):
            test_data_list = data_driver_config["data"]
        elif data_driver_config.get("data_template_id"):
            # TODO: 从数据模板加载数据
            test_data_list = []
        elif data_driver_config.get("data_source_id"):
            # TODO: 从数据源加载数据
            test_data_list = []
        else:
            test_data_list = []
    
    # 如果没有数据驱动或数据为空，使用空字典作为默认数据
    if not test_data_list:
        test_data_list = [{}]

    # 从测试用例配置中提取请求信息，用于真实请求及日志展示
    request_info_template: Dict[str, Any] = {}
    request_cfg: Dict[str, Any] = {}
    assertions_cfg: List[Dict[str, Any]] = []
    extractors_cfg: List[Dict[str, Any]] = []
    token_config: Optional[Dict[str, Any]] = None
    if isinstance(test_case.config, dict):
        request_cfg = test_case.config.get("request") or {}
        interface_cfg = test_case.config.get("interface") or {}
        raw_assertions = test_case.config.get("assertions") or []
        if isinstance(raw_assertions, list):
            assertions_cfg = raw_assertions
        
        # 提取 extractors 配置
        raw_extractors = test_case.config.get("extractors") or []
        if isinstance(raw_extractors, list):
            extractors_cfg = raw_extractors
        
        # 提取 token_config 配置
        token_config = test_case.config.get("token_config")

        method = interface_cfg.get("method") or request_cfg.get("method") or "GET"
        path = interface_cfg.get("path") or request_cfg.get("path") or ""

        request_info_template = {
            "method": method,
            "path": path,
            "headers": request_cfg.get("headers") or {},
            "params": request_cfg.get("params") or {},
            "path_params": request_cfg.get("path_params") or {},
            "body": request_cfg.get("body") or request_cfg.get("data") or None,
        }
    
    # 初始化变量池，用于存储提取的变量
    variable_pool: Dict[str, Any] = {}

    # 创建测试执行
    new_execution = TestExecution(
        **execution.dict(),
        status=ExecutionStatus.RUNNING,
        started_at=datetime.utcnow(),
        logs="测试执行已启动",
        result=None,
    )
    
    db.add(new_execution)
    await db.commit()
    await db.refresh(new_execution)

    # 构造真实 HTTP 请求（当前同步执行单接口请求）
    lines = []
    lines.append("== 测试执行已启动 ==")
    lines.append(f"执行ID: {new_execution.id}")
    lines.append(f"项目: {project.id} - {project.name}")
    lines.append(f"测试用例ID: {test_case.id} - {test_case.name}")
    if execution.environment:
        lines.append(f"执行环境: {execution.environment}")
    if is_data_driven:
        lines.append(f"数据驱动模式: 启用，共 {len(test_data_list)} 组测试数据")
    lines.append("")

    # 计算目标 URL（优先使用环境 base_url）
    base_url: str = ""
    env_obj: Optional[Environment] = None
    if execution.environment:
        env_result = await db.execute(
            select(Environment).where(Environment.key == execution.environment)
        )
        env_obj = env_result.scalar_one_or_none()
        if env_obj and env_obj.base_url:
            base_url = env_obj.base_url.rstrip("/")

    # 数据驱动：支持并发执行
    all_details: List[Dict[str, Any]] = []
    total_passed = 0
    total_failed = 0
    
    # 判断是否使用并发执行（数据量>10时启用并发）
    use_concurrent = len(test_data_list) > 10
    concurrency_limit = 20  # 并发数限制
    
    if use_concurrent:
        lines.append(f"== 并发执行模式 ==")
        lines.append(f"总数据量: {len(test_data_list)}，并发数: {concurrency_limit}")
        lines.append("")
        
        # 使用asyncio.gather进行并发执行，但限制并发数
        import asyncio
        semaphore = asyncio.Semaphore(concurrency_limit)
        completed_count = 0
        
        async def execute_with_limit_and_progress(test_data: Dict[str, Any], index: int):
            nonlocal completed_count
            async with semaphore:
                result = await _execute_single_data_driven_test(
                    test_data=test_data,
                    data_index=index,
                    request_info_template=request_info_template,
                    assertions_cfg=assertions_cfg,
                    base_url=base_url,
                    lines=lines,
                    extractors_cfg=extractors_cfg,
                    variable_pool=variable_pool,
                    token_config=token_config
                )
                completed_count += 1
                
                # 更新进度（每完成5%更新一次，避免频繁更新）
                if completed_count % max(1, len(test_data_list) // 20) == 0 or completed_count == len(test_data_list):
                    progress_percent = int((completed_count / len(test_data_list)) * 100)
                    # 更新执行记录的日志（包含进度）
                    execution.logs = "\n".join(lines) + f"\n\n进度: {completed_count}/{len(test_data_list)} ({progress_percent}%)"
                    await db.commit()
                
                return result
        
        # 创建所有任务
        tasks = [
            execute_with_limit_and_progress(test_data, index)
            for index, test_data in enumerate(test_data_list, start=1)
        ]
        
        # 并发执行
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 处理结果
        for result in results:
            if isinstance(result, Exception):
                lines.append(f"执行出错: {str(result)}")
                total_failed += 1
                continue
            
            all_details.append(result)
            if result["status"] == "passed":
                total_passed += 1
            else:
                total_failed += 1
    
    else:
        # 串行执行（数据量较小时）
        lines.append(f"== 串行执行模式 ==")
        lines.append(f"即将执行 {len(test_data_list)} 组测试数据")
        lines.append("")
        
        for data_index, test_data in enumerate(test_data_list, start=1):
            lines.append(f"[调试] 开始执行第 {data_index}/{len(test_data_list)} 组数据")
            
            # 新的数据驱动逻辑：每行数据包含 request 和 assertions
            # 如果测试数据中有 request 字段，使用它作为请求参数（可以覆盖模板）
            # 如果测试数据中有 assertions 字段，使用它作为断言配置（优先级高于用例配置）
            test_request = test_data.get("request") or test_data.get("request_params")
            test_assertions = test_data.get("assertions")
            
            # 确定使用的请求配置
            if test_request:
                # 如果测试数据中有request字段，使用它
                if isinstance(test_request, str):
                    try:
                        test_request = json.loads(test_request)
                    except:
                        test_request = {}
                # 将test_request合并到request_info_template中
                request_info = copy.deepcopy(request_info_template)
                if isinstance(test_request, dict):
                    # 合并headers、params、body等
                    if test_request.get("headers"):
                        request_info["headers"] = {**request_info.get("headers", {}), **test_request["headers"]}
                    if test_request.get("params"):
                        request_info["params"] = {**request_info.get("params", {}), **test_request["params"]}
                    if test_request.get("body") is not None:
                        # 如果test_request中有body字段，使用它
                        request_info["body"] = test_request["body"]
                    elif test_request:
                        # 如果test_request中没有body字段，但有其他字段
                        # 尝试深度合并到模板的body中
                        def deep_merge_body(template_body, data):
                            """深度合并：将数据字段更新到模板body的嵌套结构中，保持模板字段的类型"""
                            if not isinstance(template_body, dict):
                                return template_body
                            
                            result = copy.deepcopy(template_body)
                            
                            # 类型转换函数：根据模板类型转换数据值
                            def convert_to_template_type(template_value, data_value):
                                """根据模板值的类型，转换数据值"""
                                # 如果模板是数组
                                if isinstance(template_value, list):
                                    if isinstance(data_value, list):
                                        return data_value  # 已经是数组，直接使用
                                    elif isinstance(data_value, str):
                                        # 字符串转数组
                                        if data_value.strip() == "":
                                            return []  # 空字符串 -> 空数组
                                        elif data_value.startswith('['):
                                            # 尝试解析JSON数组
                                            try:
                                                parsed = json.loads(data_value)
                                                return parsed if isinstance(parsed, list) else [data_value]
                                            except:
                                                return [data_value]
                                        else:
                                            return [data_value]  # 单个值 -> 单元素数组
                                    elif data_value is None or data_value == "":
                                        return []  # null/空值 -> 空数组
                                    else:
                                        return [data_value]  # 其他类型 -> 单元素数组
                                
                                # 如果模板是数字
                                elif isinstance(template_value, (int, float)):
                                    if isinstance(data_value, (int, float)):
                                        return data_value
                                    elif isinstance(data_value, str):
                                        try:
                                            return int(data_value) if '.' not in str(data_value) else float(data_value)
                                        except:
                                            return template_value  # 转换失败，保持模板值
                                    else:
                                        return template_value
                                
                                # 如果模板是布尔值
                                elif isinstance(template_value, bool):
                                    if isinstance(data_value, bool):
                                        return data_value
                                    elif isinstance(data_value, str):
                                        if data_value.lower() in ('true', '1', 'yes'):
                                            return True
                                        elif data_value.lower() in ('false', '0', 'no', ''):
                                            return False
                                        else:
                                            return template_value
                                    elif isinstance(data_value, (int, float)):
                                        return bool(data_value)
                                    else:
                                        return template_value
                                
                                # 如果模板是字符串
                                elif isinstance(template_value, str):
                                    return str(data_value) if data_value is not None else ""
                                
                                # 如果模板是None或其他类型，直接使用数据值
                                else:
                                    return data_value
                            
                            # 递归查找并更新匹配的字段
                            def update_nested(obj, data_dict):
                                if not isinstance(obj, dict):
                                    return obj
                                for key, value in obj.items():
                                    if isinstance(value, dict):
                                        # 递归处理嵌套对象
                                        obj[key] = update_nested(value, data_dict)
                                        # 检查data_dict中是否有与嵌套对象字段匹配的值
                                        for data_key, data_value in data_dict.items():
                                            if data_key in obj[key]:
                                                # 根据模板类型转换后再赋值
                                                obj[key][data_key] = convert_to_template_type(
                                                    obj[key][data_key], 
                                                    data_value
                                                )
                                    elif key in data_dict:
                                        # 如果当前字段在data_dict中，根据模板类型转换后更新
                                        obj[key] = convert_to_template_type(value, data_dict[key])
                                return obj
                            
                            result = update_nested(result, data)
                            return result
                        
                        template_body = request_info.get("body")
                        if isinstance(template_body, dict):
                            request_info["body"] = deep_merge_body(template_body, test_request)
                        else:
                            # 如果模板没有body，直接使用test_request
                            request_info["body"] = test_request
                    if test_request.get("path"):
                        request_info["path"] = test_request["path"]
                    if test_request.get("method"):
                        request_info["method"] = test_request["method"]
            else:
                # 如果没有request字段，使用原有的变量替换逻辑
                request_info = _apply_test_data(request_info_template, test_data)
        
            # 确定使用的断言配置
            current_assertions = assertions_cfg
            if test_assertions:
                # 如果测试数据中有assertions字段，使用它（优先级更高）
                if isinstance(test_assertions, str):
                    try:
                        current_assertions = json.loads(test_assertions)
                    except:
                        current_assertions = assertions_cfg
                elif isinstance(test_assertions, list):
                    current_assertions = test_assertions
                else:
                    current_assertions = assertions_cfg
            else:
                # 如果测试数据中没有assertions字段，尝试从expected_*字段自动生成断言
                auto_generated_assertions = _generate_assertions_from_data(test_data)
                if auto_generated_assertions:
                    # 如果自动生成了断言，与用例配置中的断言合并
                    # 自动生成的断言优先级更高（覆盖用例配置中的同类型断言）
                    if assertions_cfg:
                        # 合并断言：去除用例配置中的status_code断言（如果自动生成了）
                        has_status_code = any(a.get('type') == 'status_code' for a in auto_generated_assertions)
                        if has_status_code:
                            current_assertions = [a for a in assertions_cfg if a.get('type') != 'status_code']
                        else:
                            current_assertions = list(assertions_cfg)
                        current_assertions.extend(auto_generated_assertions)
                    else:
                        current_assertions = auto_generated_assertions
            
            # 构建URL，支持变量替换
            path = request_info.get("path") or ""
            # 如果path中包含变量，需要再次替换（因为可能有嵌套的变量）
            if isinstance(path, str) and "${" in path:
                import re
                def replacer(match):
                    key = match.group(1)
                    value = test_data.get(key)
                    if value is None:
                        return match.group(0)
                    return str(value)
                path = re.sub(r'\$\{(\w+)\}', replacer, path)
            
            if path and not path.startswith("http"):
                if not path.startswith("/"):
                    path = "/" + path
                if base_url:
                    # base_url也可能包含变量
                    if isinstance(base_url, str) and "${" in base_url:
                        import re
                        def replacer(match):
                            key = match.group(1)
                            value = test_data.get(key)
                            if value is None:
                                return match.group(0)
                            return str(value)
                        base_url = re.sub(r'\$\{(\w+)\}', replacer, base_url)
                    url = base_url + path
                else:
                    # 如果没有配置环境 base_url，尝试使用请求配置里的 full_url 或原始 path
                    url_template = request_cfg.get("url") or path
                    if isinstance(url_template, str) and "${" in url_template:
                        import re
                        def replacer(match):
                            key = match.group(1)
                            value = test_data.get(key)
                            if value is None:
                                return match.group(0)
                            return str(value)
                        url = re.sub(r'\$\{(\w+)\}', replacer, url_template)
                    else:
                        url = url_template
            else:
                url = path or request_cfg.get("url") or ""

            # 合并 headers / params（环境默认 + 用例配置）
            headers: Dict[str, Any] = {}
            params: Dict[str, Any] = {}
            if env_obj and isinstance(env_obj.default_headers, dict):
                headers.update(env_obj.default_headers)
            if env_obj and isinstance(env_obj.default_params, dict):
                params.update(env_obj.default_params)
            if request_info.get("headers"):
                headers.update(request_info["headers"])
            if request_info.get("params"):
                params.update(request_info["params"])

            body = request_info.get("body")

            if is_data_driven:
                lines.append(f"== 数据驱动执行 [{data_index}/{len(test_data_list)}] ==")
                # 显示测试数据（排除内部字段）
                display_data = {k: v for k, v in test_data.items() if not k.startswith('__')}
                lines.append(f"测试数据: {json.dumps(display_data, ensure_ascii=False, indent=2)}")
                if test_request:
                    lines.append("✓ 使用测试数据中的请求参数")
                if test_assertions:
                    lines.append("✓ 使用测试数据中的断言配置")
                lines.append("")
            
            if request_info:
                lines.append("== 请求信息 ==")
                lines.append(f"请求方法: {request_info.get('method')}")
                lines.append(f"请求URL: {url or (request_info.get('path') or '')}")
                if request_info.get("headers"):
                    lines.append("请求头:")
                    lines.append(json.dumps(request_info["headers"], ensure_ascii=False, indent=2))
                if request_info.get("params"):
                    lines.append("Query 参数:")
                    lines.append(json.dumps(request_info["params"], ensure_ascii=False, indent=2))
                if request_info.get("path_params"):
                    lines.append("Path 参数:")
                    lines.append(json.dumps(request_info["path_params"], ensure_ascii=False, indent=2))
                if body is not None:
                    lines.append("请求 Body:")
                    lines.append(json.dumps(body, ensure_ascii=False, indent=2))
                lines.append("")

            # 执行 HTTP 请求
            http_status: Optional[int] = None
            response_text: Optional[str] = None
            response_json: Optional[Any] = None
            error_message: Optional[str] = None
            
            try:
                async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
                    method = (request_info.get("method") or "GET").upper()
                    if method in ("GET", "DELETE"):
                        resp = await client.request(method, url, headers=headers, params=params)
                    else:
                        resp = await client.request(
                            method,
                            url,
                            headers=headers,
                            params=params,
                            json=body,
                        )
                http_status = resp.status_code
                response_text = resp.text
                try:
                    response_json = resp.json()
                except Exception:
                    response_json = None

                lines.append("== 响应信息（真实请求） ==")
                lines.append(f"HTTP 状态码: {http_status}")
                if response_json is not None:
                    lines.append("响应 Body(JSON):")
                    lines.append(json.dumps(response_json, ensure_ascii=False, indent=2))
                else:
                    lines.append("响应 Body(文本):")
                    lines.append(response_text or "")

            except Exception as exc:  # noqa: BLE001
                error_message = str(exc)
                lines.append("== 请求执行失败 ==")
                lines.append(f"错误信息: {error_message}")

            # 基于断言 & HTTP 结果计算执行状态
            assertions_passed = True
            assertion_results: List[Dict[str, Any]] = []

            lines.append("")
            lines.append("== 断言配置检查 ==")
            if test_assertions:
                lines.append(f"使用测试数据中的断言配置，数量: {len(current_assertions)}")
            else:
                lines.append(f"使用用例配置中的断言，数量: {len(current_assertions)}")
            if current_assertions:
                lines.append("断言配置详情:")
                for idx, a in enumerate(current_assertions, start=1):
                    lines.append(f"  [{idx}] {json.dumps(a, ensure_ascii=False)}")
                
                # 传递测试数据给断言评估函数，支持在断言中使用变量
                # 注意：这里使用current_assertions而不是assertions_cfg
                assertions_passed, assertion_results = _evaluate_assertions(
                    current_assertions, http_status, response_json, test_data=test_data
                )
                lines.append("")
                lines.append("== 断言执行结果 ==")
                for idx, ar in enumerate(assertion_results, start=1):
                    status_text = "通过" if ar.get("passed") else "失败"
                    a_type = ar.get("type", "unknown")
                    expected = ar.get("expected", "N/A")
                    actual = ar.get("actual", "N/A")
                    path = ar.get("path", "")
                    operator = ar.get("operator", "")
                    
                    lines.append(f"[{idx}] 类型={a_type} 结果={status_text}")
                    if path:
                        lines.append(f"    路径: {path}")
                    if operator:
                        lines.append(f"    运算符: {operator}")
                    lines.append(f"    期望值: {expected}")
                    lines.append(f"    实际值: {actual}")
                    if ar.get("message"):
                        lines.append(f"    说明: {ar['message']}")
                
                lines.append("")
                lines.append(f"断言整体结果: {'全部通过' if assertions_passed else '存在失败'}")
            else:
                lines.append("未配置断言，使用默认判断逻辑（HTTP状态码 < 400 视为通过）")
                # 未配置断言时，保持原有行为：HTTP < 400 视为通过
                if http_status is not None and http_status < 400 and not error_message:
                    assertions_passed = True
                else:
                    assertions_passed = False

            # 记录本次执行结果
            step_status = "passed" if (assertions_passed and not error_message) else "failed"
            if step_status == "passed":
                total_passed += 1
            else:
                total_failed += 1
            
            all_details.append({
                "data_index": data_index,
                "test_data": {k: v for k, v in test_data.items() if not k.startswith('__')},
                "step": data_index,
                "name": f"数据驱动执行 [{data_index}/{len(test_data_list)}]",
                "status": step_status,
                "test_data": test_data,
                "request": {
                    "url": url,
                    "method": request_info.get("method") if request_info else None,
                    "headers": headers,
                    "params": params,
                    "body": body,
                },
                "response": {
                    "status_code": http_status,
                    "body_json": response_json,
                    "body_text": response_text,
                    "error": error_message,
                },
                "assertions": assertion_results,
            })
            
            lines.append("")
            lines.append(f"== 数据 [{data_index}/{len(test_data_list)}] 执行结果: {step_status} ==")
            lines.append("")

    # 组装最终执行结果摘要
    total_count = len(test_data_list)
    summary = {
        "total": total_count,
        "passed": total_passed,
        "failed": total_failed,
        "skipped": 0
    }
    
    if total_failed == 0:
        status_value = ExecutionStatus.PASSED
    else:
        status_value = ExecutionStatus.FAILED

    result_payload = {
        "summary": summary,
        "details": all_details,
    }

    lines.append("")
    lines.append("== 执行结果摘要 ==")
    lines.append(
        f"total={summary['total']}, passed={summary['passed']}, "
        f"failed={summary['failed']}, skipped={summary['skipped']}"
    )

    new_execution.logs = "\n".join(lines)
    new_execution.status = status_value
    new_execution.finished_at = datetime.utcnow()
    new_execution.result = result_payload

    await db.commit()
    await db.refresh(new_execution)
    
    # 生成对应的报告视图（当前实现为基于执行记录的动态报告，不单独落库）
    report_service = ReportService()
    await report_service.generate_report(db=db, execution_id=new_execution.id)
    
    return new_execution


@router.get("/{execution_id}", response_model=TestExecutionResponse)
async def get_test_execution(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取测试执行详情"""
    result = await db.execute(select(TestExecution).where(TestExecution.id == execution_id))
    execution = result.scalar_one_or_none()
    
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试执行不存在"
        )
    
    return execution


@router.get("/{execution_id}/logs")
async def get_execution_logs(
    execution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取测试执行日志"""
    result = await db.execute(select(TestExecution).where(TestExecution.id == execution_id))
    execution = result.scalar_one_or_none()
    
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="测试执行不存在"
        )
    
    return {
        "execution_id": execution_id,
        "logs": execution.logs or "",
        "status": execution.status
    }
