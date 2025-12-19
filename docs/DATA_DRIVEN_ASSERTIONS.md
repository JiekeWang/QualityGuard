# 数据驱动测试中的断言设置指南

## 当前实现方式

在数据驱动测试中，断言有几种设置方式：

### 1. 固定断言（当前默认方式）

所有测试数据使用相同的断言规则。这是最简单的方式，适用于所有测试数据期望相同响应的情况。

**示例：**
```json
[
  {
    "type": "status_code",
    "expected": 200
  },
  {
    "type": "response_body",
    "path": "$.code",
    "operator": "equal",
    "expected": 0
  }
]
```

**适用场景：**
- 所有测试数据都应该返回相同的状态码
- 所有测试数据都应该返回相同的业务状态码
- 响应结构相同，只是数据不同

### 2. 动态断言（✅ 已支持）

断言中的 `expected` 值和 `path` 可以使用测试数据中的变量，通过 `${变量名}` 格式引用。

**示例：**

**测试数据：**
```json
{
  "data": [
    {
      "username": "user1",
      "expected_status": 200,
      "expected_code": 0,
      "expected_message": "success"
    },
    {
      "username": "user2", 
      "expected_status": 201,
      "expected_code": 0,
      "expected_message": "created"
    }
  ]
}
```

**断言配置：**
```json
[
  {
    "type": "status_code",
    "expected": "${expected_status}"
  },
  {
    "type": "response_body",
    "path": "$.code",
    "operator": "equal",
    "expected": "${expected_code}"
  },
  {
    "type": "response_body",
    "path": "$.message",
    "operator": "equal",
    "expected": "${expected_message}"
  }
]
```

**✅ 已实现：** 后端已支持在断言中使用变量替换，每组测试数据会使用自己的期望值进行断言。

### 3. 数据驱动断言（高级 - 需要实现）

在测试数据中为每组数据配置对应的断言规则。

**示例：**

**测试数据：**
```json
{
  "data": [
    {
      "username": "user1",
      "assertions": [
        {
          "type": "status_code",
          "expected": 200
        },
        {
          "type": "response_body",
          "path": "$.code",
          "expected": 0
        }
      ]
    },
    {
      "username": "user2",
      "assertions": [
        {
          "type": "status_code",
          "expected": 201
        }
      ]
    }
  ]
}
```

这种方式需要修改后端逻辑，优先使用测试数据中的断言，如果没有则使用用例配置的断言。

## 推荐方案

### 方案1：增强固定断言（最简单）

继续使用固定断言，但确保断言规则适用于所有测试数据。

**优点：**
- 简单易用
- 当前已支持
- 配置清晰

**缺点：**
- 所有数据必须符合相同的断言规则
- 灵活性较低

### 方案2：支持断言中的变量替换（推荐）

增强后端 `_evaluate_assertions` 函数，支持在断言中使用 `${变量名}` 引用测试数据。

**实现步骤：**
1. 在 `_evaluate_assertions` 函数中，对 `expected` 值进行变量替换
2. 支持在断言的所有字符串字段中使用变量（path、expected等）

**优点：**
- 灵活性高
- 可以针对不同数据使用不同的期望值
- 配置统一，易于维护

**缺点：**
- 需要修改后端代码
- 测试数据中需要包含期望值

### 方案3：混合方式

优先使用测试数据中的断言，如果没有则使用用例配置的断言，并支持变量替换。

**优点：**
- 最灵活
- 可以针对不同数据使用完全不同的断言规则

**缺点：**
- 实现复杂
- 配置分散，不易维护

## 当前最佳实践

基于当前实现，推荐以下方式：

### 1. 使用固定断言

如果所有测试数据应该返回相同的结果，使用固定断言：

```json
// 断言配置
[
  {
    "type": "status_code",
    "expected": 200
  },
  {
    "type": "response_body",
    "path": "$.success",
    "operator": "equal",
    "expected": true
  }
]

// 测试数据
{
  "data": [
    {"username": "user1", "password": "pass1"},
    {"username": "user2", "password": "pass2"},
    {"username": "user3", "password": "pass3"}
  ]
}
```

### 2. 在请求中使用变量，断言验证固定结果

如果不同数据应该返回不同的响应，但响应结构相同，可以在请求中使用变量，断言验证响应结构：

```json
// 请求配置中使用变量
{
  "body": {
    "username": "${username}",
    "password": "${password}"
  }
}

// 断言验证响应结构（不验证具体值）
[
  {
    "type": "status_code",
    "expected": 200
  },
  {
    "type": "response_body",
    "path": "$.code",
    "operator": "equal",
    "expected": 0
  },
  {
    "type": "response_body",
    "path": "$.data.username",
    "operator": "not_equal",
    "expected": null
  }
]
```

### 3. 使用脚本断言（如果支持）

如果断言类型支持脚本，可以在脚本中访问测试数据：

```json
[
  {
    "type": "script",
    "script": "return response.data.username === testData.username"
  }
]
```

**注意：** 当前实现中，脚本断言可能无法直接访问测试数据，需要增强支持。

## 建议的增强

为了更好支持数据驱动测试，建议增强以下功能：

1. **断言中的变量替换**
   - 在 `_evaluate_assertions` 中支持 `${变量名}` 替换
   - 支持在 `expected`、`path` 等字段中使用变量

2. **脚本断言中访问测试数据**
   - 在脚本执行环境中提供 `testData` 变量
   - 允许脚本访问当前测试数据

3. **数据驱动断言**
   - 支持在测试数据中配置断言
   - 优先使用数据中的断言，回退到用例断言

## 示例场景

### 场景1：登录测试（固定断言）

所有用户登录都应该返回成功：

```json
// 断言
[
  {"type": "status_code", "expected": 200},
  {"type": "response_body", "path": "$.code", "expected": 0}
]

// 测试数据
{
  "data": [
    {"username": "user1", "password": "pass1"},
    {"username": "user2", "password": "pass2"}
  ]
}
```

### 场景2：创建资源测试（需要变量断言）

不同数据创建后返回的ID不同，但都应该成功：

```json
// 断言（需要支持变量）
[
  {"type": "status_code", "expected": 201},
  {"type": "response_body", "path": "$.data.id", "operator": "not_equal", "expected": null}
]

// 测试数据
{
  "data": [
    {"name": "资源1", "type": "A"},
    {"name": "资源2", "type": "B"}
  ]
}
```

### 场景3：边界值测试（不同期望值）

不同数据应该返回不同的状态码：

```json
// 断言（需要支持变量或数据驱动断言）
[
  {"type": "status_code", "expected": "${expected_status}"}
]

// 测试数据
{
  "data": [
    {"value": -1, "expected_status": 400},
    {"value": 0, "expected_status": 200},
    {"value": 100, "expected_status": 200},
    {"value": 101, "expected_status": 400}
  ]
}
```

