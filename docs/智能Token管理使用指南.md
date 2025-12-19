# 智能 Token 管理使用指南

## 功能概述

**智能 Token 管理**功能可以自动处理 Token 的获取、刷新和失效重试，无需手动维护 Token 的有效期。

### 工作原理

1. 配置 Token 获取接口（A 接口）
2. 业务接口（B 接口）使用 Token
3. 当检测到 401/403 响应码时，自动刷新 Token
4. 用新 Token 重试失败的请求

## 快速开始 - 针对您的场景

### A 接口（登录获取 Token）

**URL**: `https://aresassistant.linkedcare.cn/Home/Login`

### B 接口（业务接口）

**URL**: `http://aresassistant.lctest.cn/api/workflow/execute`  
**需要**: Authorization 头包含 A 接口返回的 token

## 配置步骤

### 步骤1：在"高级配置" Tab 中添加 token_config

在测试用例编辑窗口的"高级配置" Tab 中，添加一个新的 JSON 字段 `token_config`：

```json
{
  "url": "https://aresassistant.linkedcare.cn/Home/Login",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "username": "your_username",
    "password": "your_password"
  },
  "extractors": [
    {
      "name": "token",
      "type": "json",
      "path": "$.data.token"
    }
  ],
  "retry_status_codes": [401, 403]
}
```

**配置说明：**

- `url`: Token 接口的 URL
- `method`: 请求方法（通常是 POST）
- `headers`: 请求头
- `body`: 请求体（登录凭证）
- `extractors`: 提取器配置，定义如何从响应中提取 token
- `retry_status_codes`: 触发 Token 刷新的 HTTP 状态码（默认 [401, 403]）

### 步骤2：配置业务接口请求

在"请求配置" Tab 中配置 B 接口：

```json
{
  "method": "POST",
  "path": "http://aresassistant.lctest.cn/api/workflow/execute",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${token}"
  },
  "body": {
    "WorkflowName": "咬合重建-弹窗提醒",
    "WorkflowVersion": 13502,
    "ItemParameterDict": {
      "OrthoDiagnosis": {
        "Codes": ["CI-Il-bony"],
        "DamageToothCount": 1,
        "DamageAreaCount": 1
      }
    }
  }
}
```

**注意**：使用 `${token}` 引用自动获取的 token

### 步骤3：配置数据驱动（可选）

如果需要测试多组数据，在"数据驱动配置" Tab 中添加：

| request_Codes | request_DamageToothCount | request_DamageAreaCount |
|---------------|--------------------------|-------------------------|
| CI-Il-bony    | 1                        | 1                       |
| CI-Ill-bony   | 2                        | 2                       |

## 执行流程

### 正常流程（Token 有效）

```
1. 第一次执行：调用 A 接口获取 token
2. 提取 token 并存储
3. 使用 token 调用 B 接口
4. B 接口返回 200，执行成功
5. 后续数据驱动迭代继续使用同一个 token
```

### Token 失效流程（自动刷新）

```
1. 使用旧 token 调用 B 接口
2. B 接口返回 401（未授权）
3. 系统检测到 401，自动调用 A 接口刷新 token
4. 提取新 token 并更新变量池
5. 用新 token 重试 B 接口
6. B 接口返回 200，执行成功
```

## 完整配置示例

### 示例1：基本 Token 管理

```json
{
  "request": {
    "method": "POST",
    "path": "http://aresassistant.lctest.cn/api/workflow/execute",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer ${token}"
    },
    "body": {
      "WorkflowName": "测试流程",
      "WorkflowVersion": 1
    }
  },
  "token_config": {
    "url": "https://aresassistant.linkedcare.cn/Home/Login",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "username": "admin",
      "password": "123456"
    },
    "extractors": [
      {
        "name": "token",
        "type": "json",
        "path": "$.data.token"
      }
    ],
    "retry_status_codes": [401, 403]
  }
}
```

### 示例2：提取多个字段

如果 A 接口返回多个需要使用的字段：

```json
{
  "token_config": {
    "url": "https://aresassistant.linkedcare.cn/Home/Login",
    "method": "POST",
    "body": {
      "username": "admin",
      "password": "123456"
    },
    "extractors": [
      {
        "name": "token",
        "type": "json",
        "path": "$.data.token"
      },
      {
        "name": "userId",
        "type": "json",
        "path": "$.data.user.id"
      },
      {
        "name": "userName",
        "type": "json",
        "path": "$.data.user.name"
      }
    ]
  }
}
```

然后在 B 接口中使用：

```json
{
  "headers": {
    "Authorization": "Bearer ${token}",
    "X-User-Id": "${userId}",
    "X-User-Name": "${userName}"
  }
}
```

## 执行日志示例

### Token 自动刷新日志

```
== 测试执行已启动 ==
执行ID: 123
项目: 咬合重建
测试用例ID: 9 - 规则引擎测试

== 数据驱动执行 [1/4] ==
测试数据: {"request": {"Codes": "CI-Il-bony", ...}}

== 请求信息 ==
请求方法: POST
请求URL: http://aresassistant.lctest.cn/api/workflow/execute
请求头:
{
  "Authorization": "Bearer ${token}",
  "Content-Type": "application/json"
}

== 响应信息 ==
HTTP 状态码: 401

⚠ 检测到状态码 401，尝试刷新 Token...
✓ Token 刷新成功: token

== 重试请求 ==
HTTP 状态码: 200
响应 Body(JSON):
{
  "WorkflowName": "咬合重建-弹窗提醒",
  "WorkflowVersion": "13502",
  ...
}

== 断言执行结果 ==
[1] 类型=status_code 结果=通过

== 数据 [1/4] 执行结果: passed ==
```

### Token 刷新失败日志

```
⚠ 检测到状态码 401，尝试刷新 Token...
✗ Token 刷新失败: Token 接口返回非 200 状态码: 500

== 数据 [1/4] 执行结果: failed ==
```

## 注意事项

### 1. JSONPath 路径配置

**重要**：`extractors` 中的 `path` 必须根据实际响应调整。

假设 A 接口响应格式为：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

则 `path` 应该是 `$.data.token`

如果响应格式为：

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
```

则 `path` 应该是 `$.token`

### 2. Token 变量名

`extractors` 中配置的 `name` 字段（如 `token`）必须与请求头中引用的变量名一致（如 `${token}`）。

### 3. 状态码配置

`retry_status_codes` 可以根据实际需求调整：

- `[401]`: 只在未授权时刷新
- `[401, 403]`: 在未授权或禁止访问时刷新
- `[401, 403, 419]`: 自定义状态码

### 4. 重试次数

当前实现最多重试 1 次（即刷新 token 后重试 1 次）。如果重试后仍然失败，测试将标记为失败。

### 5. Token 作用域

Token 在整个测试执行过程中有效，所有数据驱动迭代共享同一个 token（除非再次触发刷新）。

### 6. 并发执行

在并发执行模式下，多个请求可能同时检测到 token 失效，但系统会确保 token 只刷新一次。

## 与基础变量提取的区别

| 功能 | 基础变量提取 | 智能 Token 管理 |
|------|-------------|----------------|
| 提取变量 | ✅ | ✅ |
| 在后续请求中使用 | ✅ | ✅ |
| 自动检测失效 | ❌ | ✅ |
| 自动刷新 | ❌ | ✅ |
| 自动重试 | ❌ | ✅ |
| 适用场景 | 一般数据关联 | Token 认证 |

## 故障排查

### 问题1：Token 未生效

**症状**：B 接口仍然返回 401，且没有触发刷新

**可能原因**：
- `token_config` 配置错误或缺失
- Token 变量名不匹配
- Authorization 头格式错误

**解决方法**：
1. 检查 `token_config` 是否正确配置
2. 确认 `extractors[0].name` 与请求头中的 `${token}` 一致
3. 检查 Authorization 头格式（如是否需要 "Bearer " 前缀）

### 问题2：Token 刷新失败

**症状**：日志显示 "Token 刷新失败"

**可能原因**：
- A 接口 URL 错误
- 登录凭证错误
- JSONPath 路径错误
- A 接口返回非 200 状态码

**解决方法**：
1. 单独测试 A 接口，确认可以正常获取 token
2. 检查 `extractors` 中的 `path` 是否匹配实际响应
3. 查看详细错误日志

### 问题3：无限重试

**症状**：不断触发 token 刷新

**可能原因**：
- A 接口每次返回的 token 都无效
- B 接口的问题不是 token 导致的

**解决方法**：
1. 检查 A 接口返回的 token 格式
2. 手动使用 A 接口获取的 token 测试 B 接口
3. 检查 B 接口是否有其他权限要求

## 最佳实践

### 1. 测试 Token 接口

在配置前，先单独测试 A 接口，确认：
- 接口可以正常访问
- 返回的响应格式
- Token 的 JSONPath 路径

### 2. 验证 Token 格式

确认 B 接口期望的 Token 格式：
- 是否需要 "Bearer " 前缀
- 是否需要其他特殊格式

### 3. 合理设置重试状态码

根据实际的 API 行为设置 `retry_status_codes`：
- 如果 API 在 token 失效时返回 401，配置 `[401]`
- 如果还可能返回 403，配置 `[401, 403]`

### 4. 日志监控

执行测试后，仔细查看日志：
- 确认 token 是否成功提取
- 检查是否触发了自动刷新
- 查看刷新是否成功

### 5. 环境隔离

不同环境（开发、测试、生产）可能有不同的 token 接口，建议：
- 为每个环境配置独立的测试用例
- 或使用环境变量功能

## 高级配置

### 配置不同环境的 Token 接口

```json
{
  "token_config": {
    "url": "${token_url}",
    "method": "POST",
    "body": {
      "username": "${username}",
      "password": "${password}"
    },
    "extractors": [
      {
        "name": "token",
        "type": "json",
        "path": "$.data.token"
      }
    ]
  }
}
```

然后在环境配置中设置：
- `token_url`: 不同环境的 token 接口 URL
- `username`: 不同环境的用户名
- `password`: 不同环境的密码

### 自定义 Token 过期判断

如果 API 使用自定义错误码（而不是 HTTP 401/403），可以配置：

```json
{
  "token_config": {
    ...
    "retry_status_codes": [401, 403],
    "retry_error_codes": ["TOKEN_EXPIRED", "INVALID_TOKEN"]
  }
}
```

（注意：这个功能需要额外实现）

## 总结

智能 Token 管理功能可以：
- ✅ 自动获取和刷新 Token
- ✅ 自动检测 Token 失效
- ✅ 自动重试失败的请求
- ✅ 减少手动维护 Token 的工作量
- ✅ 提高测试的稳定性和可靠性

现在您可以配置您的测试用例，享受自动 Token 管理带来的便利！

