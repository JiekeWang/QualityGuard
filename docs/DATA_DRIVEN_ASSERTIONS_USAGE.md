# 数据驱动测试 - 不同预期结果的断言设置指南

## 问题场景

在数据驱动测试中，如果每行测试数据代表一个测试用例，且每个测试用例的预期结果不同，应该如何设置断言？

## ✅ 解决方案：使用变量断言

现在系统已支持在断言中使用 `${变量名}` 来引用测试数据中的变量，每组测试数据可以使用自己的期望值。

## 使用方式

### 步骤1：在测试数据中添加期望值字段

在"数据驱动配置"标签页中，为每行数据添加期望值字段：

**示例：**
```
Key: username          Value: user1
Key: password          Value: pass1
Key: expected_status   Value: 200
Key: expected_code     Value: 0
Key: expected_message  Value: success
```

**第二行数据：**
```
Key: username          Value: user2
Key: password          Value: pass2
Key: expected_status   Value: 201
Key: expected_code     Value: 0
Key: expected_message  Value: created
```

### 步骤2：在断言配置中使用变量

在"断言规则"标签页中，使用 `${变量名}` 引用测试数据中的期望值：

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

## 完整示例

### 场景：用户注册测试（不同数据期望不同状态码）

**测试数据（数据驱动配置）：**
```json
{
  "data": [
    {
      "username": "newuser1",
      "email": "user1@test.com",
      "expected_status": "201",
      "expected_code": "0"
    },
    {
      "username": "existing_user",
      "email": "existing@test.com",
      "expected_status": "400",
      "expected_code": "1001"
    },
    {
      "username": "invalid_email",
      "email": "invalid",
      "expected_status": "422",
      "expected_code": "1002"
    }
  ]
}
```

**请求配置：**
```json
{
  "method": "POST",
  "path": "/api/users/register",
  "body": {
    "username": "${username}",
    "email": "${email}"
  }
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
  }
]
```

### 场景：边界值测试

**测试数据：**
```json
{
  "data": [
    {
      "value": "-1",
      "expected_status": "400",
      "expected_valid": "false"
    },
    {
      "value": "0",
      "expected_status": "200",
      "expected_valid": "true"
    },
    {
      "value": "100",
      "expected_status": "200",
      "expected_valid": "true"
    },
    {
      "value": "101",
      "expected_status": "400",
      "expected_valid": "false"
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
    "path": "$.valid",
    "operator": "equal",
    "expected": "${expected_valid}"
  }
]
```

## 支持的变量类型

### 1. 字符串变量
直接使用 `${变量名}`，系统会自动替换为字符串值。

### 2. 数字变量
如果变量值是数字字符串（如 `"200"`），系统会自动转换为数字类型进行比较。

### 3. 布尔变量
如果变量值是 `"true"` 或 `"false"`，系统会自动转换为布尔值。

### 4. 路径变量
也可以在 `path` 字段中使用变量：
```json
{
  "type": "response_body",
  "path": "$.${field_name}",
  "operator": "equal",
  "expected": "${expected_value}"
}
```

## 注意事项

1. **变量名必须匹配**：断言中的 `${变量名}` 必须与测试数据中的 Key 完全匹配（区分大小写）。

2. **变量不存在时的行为**：如果变量不存在，系统会保持 `${变量名}` 原样，可能导致断言失败。

3. **类型转换**：
   - 字符串数字（如 `"200"`）会自动转换为整数
   - `"true"`/`"false"` 会自动转换为布尔值
   - `"null"` 会转换为 `None`

4. **混合使用**：可以在同一组断言中混合使用固定值和变量：
   ```json
   [
     {
       "type": "status_code",
       "expected": "${expected_status}"  // 使用变量
     },
     {
       "type": "response_body",
       "path": "$.code",
       "expected": 0  // 固定值
     }
   ]
   ```

## 最佳实践

1. **命名规范**：建议使用 `expected_` 前缀命名期望值字段，如 `expected_status`、`expected_code`。

2. **数据组织**：将测试数据和期望值放在同一行，便于维护和理解。

3. **验证结构**：即使使用变量断言，也可以添加固定断言来验证响应结构：
   ```json
   [
     {
       "type": "response_body",
       "path": "$.data",
       "operator": "not_equal",
       "expected": null  // 固定值：验证data字段存在
     },
     {
       "type": "response_body",
       "path": "$.code",
       "expected": "${expected_code}"  // 变量：验证具体值
     }
   ]
   ```

## 执行流程

1. 系统读取测试数据列表
2. 对每组测试数据：
   - 使用测试数据替换请求配置中的变量
   - 执行HTTP请求
   - 使用测试数据替换断言配置中的变量
   - 使用替换后的断言评估响应
   - 记录执行结果
3. 汇总所有执行结果

这样，每组测试数据都会使用自己的期望值进行断言，实现了真正的数据驱动测试。

