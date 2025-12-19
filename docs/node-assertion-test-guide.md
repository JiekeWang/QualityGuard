# 节点断言功能测试指南

## 功能概述

节点断言功能已实现，支持断言响应JSON中某个节点下的所有字段，无需逐个配置。

## 已实现功能

### 后端实现
- ✅ `_replace_template_variables` 函数 - 递归变量替换
- ✅ `_evaluate_node_assertion` 函数 - 节点断言评估
- ✅ `_evaluate_assertions` 函数 - 支持 `node` 和 `node_template` 类型
- ✅ 支持 4 种模式: `all_fields`, `template`, `auto_generate`, `smart`

### 前端实现
- ✅ `TestCases.tsx` - 断言配置界面添加节点断言类型
- ✅ 支持节点路径、断言模式、期望值配置
- ✅ `DataDriverTable.tsx` - 更新提示信息支持节点断言
- ✅ 添加"添加节点断言"快捷按钮

## 测试场景

### 场景1：基础节点断言（all_fields模式）

**测试用例配置**：
```json
{
  "name": "测试用户信息节点",
  "type": "api",
  "config": {
    "method": "GET",
    "path": "/api/v1/users/1001",
    "assertions": [
      {
        "type": "status_code",
        "expected": 200
      },
      {
        "type": "node",
        "path": "$.data",
        "mode": "all_fields",
        "expected": {
          "user_id": 1001,
          "username": "testuser",
          "email": "test@example.com"
        }
      }
    ]
  }
}
```

**预期结果**：
- 系统会自动断言 `$.data` 节点下的所有字段
- `$.data.user_id` 应该等于 1001
- `$.data.username` 应该等于 "testuser"
- `$.data.email` 应该等于 "test@example.com"

### 场景2：数据驱动 + 节点断言（template模式）

**测试用例配置**：
```json
{
  "name": "批量测试用户信息",
  "type": "api",
  "is_data_driven": true,
  "config": {
    "method": "GET",
    "path": "/api/v1/users/${user_id}"
  },
  "data_driver": {
    "data": [
      {
        "request": {
          "user_id": 1001
        },
        "assertions": [
          {
            "type": "node",
            "path": "$.data",
            "mode": "all_fields",
            "expected": {
              "user_id": 1001,
              "username": "user1",
              "email": "user1@example.com"
            }
          }
        ]
      },
      {
        "request": {
          "user_id": 1002
        },
        "assertions": [
          {
            "type": "node",
            "path": "$.data",
            "mode": "all_fields",
            "expected": {
              "user_id": 1002,
              "username": "user2",
              "email": "user2@example.com"
            }
          }
        ]
      }
    ]
  }
}
```

**预期结果**：
- 系统会为每行数据执行一次请求
- 每次请求都会断言对应的 `$.data` 节点字段
- 第一行断言 `user_id: 1001, username: "user1"`
- 第二行断言 `user_id: 1002, username: "user2"`

### 场景3：使用变量替换（template模式）

**测试用例配置**：
```json
{
  "name": "数据驱动节点断言 - 变量替换",
  "type": "api",
  "is_data_driven": true,
  "config": {
    "method": "GET",
    "path": "/api/v1/users/${user_id}"
  },
  "data_driver": {
    "template": {
      "type": "node",
      "path": "$.data",
      "mode": "template",
      "template": {
        "user_id": "${expected_user_id}",
        "username": "${expected_username}",
        "email": "${expected_email}"
      }
    },
    "data": [
      {
        "request": {"user_id": 1001},
        "expected_user_id": 1001,
        "expected_username": "user1",
        "expected_email": "user1@example.com"
      },
      {
        "request": {"user_id": 1002},
        "expected_user_id": 1002,
        "expected_username": "user2",
        "expected_email": "user2@example.com"
      }
    ]
  }
}
```

**预期结果**：
- 系统会自动替换模板中的变量
- 第一行：`${expected_user_id}` 替换为 `1001`
- 第二行：`${expected_user_id}` 替换为 `1002`

### 场景4：自动生成模式（auto_generate模式）

**测试用例配置**：
```json
{
  "name": "自动生成节点断言",
  "type": "api",
  "config": {
    "method": "GET",
    "path": "/api/v1/users/1001",
    "assertions": [
      {
        "type": "node",
        "path": "$.data",
        "mode": "auto_generate",
        "operator": "exists"
      }
    ]
  }
}
```

**预期结果**：
- 系统会自动从响应中提取 `$.data` 节点的所有字段
- 断言每个字段都存在（非null）

### 场景5：智能模式（smart模式）

**测试用例配置**：
```json
{
  "name": "智能节点断言",
  "type": "api",
  "config": {
    "method": "GET",
    "path": "/api/v1/users/1001",
    "assertions": [
      {
        "type": "node",
        "path": "$.data",
        "mode": "smart",
        "config": {
          "include_fields": ["user_id", "username", "email"],
          "exclude_fields": ["password", "token"],
          "field_rules": {
            "user_id": {
              "operator": "equals",
              "expected": 1001
            },
            "username": {
              "operator": "contains",
              "expected": "user"
            },
            "email": {
              "operator": "regex",
              "expected": "^[a-z0-9]+@example\\.com$"
            }
          }
        }
      }
    ]
  }
}
```

**预期结果**：
- 只断言 `include_fields` 中指定的字段
- 排除 `exclude_fields` 中的字段
- 对每个字段应用对应的规则
- `user_id` 等于 1001
- `username` 包含 "user"
- `email` 匹配正则表达式

## 前端操作步骤

### 1. 创建测试用例
1. 进入"测试用例"页面
2. 点击"新建用例"按钮
3. 填写用例基本信息

### 2. 配置节点断言（可视化方式）
1. 切换到"断言配置"标签
2. 点击"添加节点断言"按钮
3. 选择断言类型：节点断言
4. 填写节点路径，例如：`$.data`
5. 选择断言模式：所有字段
6. 填写期望值（JSON对象格式），例如：
   ```json
   {
     "user_id": 1001,
     "username": "testuser",
     "email": "test@example.com"
   }
   ```
7. 点击"保存"

### 3. 配置节点断言（JSON方式）
1. 切换到"断言配置"标签
2. 在"断言规则"文本框中输入：
   ```json
   [
     {
       "type": "status_code",
       "expected": 200
     },
     {
       "type": "node",
       "path": "$.data",
       "mode": "all_fields",
       "expected": {
         "user_id": 1001,
         "username": "testuser",
         "email": "test@example.com"
       }
     }
   ]
   ```
3. 点击"保存"

### 4. 数据驱动 + 节点断言
1. 勾选"数据驱动"选项
2. 在数据驱动表格中，配置每行的"断言"列：
   ```json
   [
     {
       "type": "node",
       "path": "$.data",
       "mode": "all_fields",
       "expected": {
         "user_id": 1001,
         "username": "user1"
       }
     }
   ]
   ```
3. 添加多行数据，每行配置不同的断言期望值
4. 点击"保存"

### 5. 执行测试
1. 点击"执行"按钮
2. 选择环境
3. 查看执行结果
4. 在执行详情中查看节点断言的详细结果

## 验证要点

### 1. 断言结果检查
- 每个字段都应该有独立的断言结果
- 断言结果中应该包含：`field`、`expected`、`actual`、`passed`
- 如果某个字段断言失败，应该清晰显示期望值和实际值

### 2. 错误处理
- 如果节点不存在，应该返回明确的错误信息
- 如果节点不是字典类型，应该返回类型错误
- 如果expected格式不正确，应该返回格式错误

### 3. 变量替换
- 变量应该正确替换为测试数据中的值
- 支持 `${变量名}` 格式
- 变量不存在时应该保持原样

### 4. 性能
- 节点断言不应该显著影响执行性能
- 多字段断言应该批量处理，不是逐个单独评估

## 已知限制

1. **当前版本**：
   - 主要支持 `all_fields` 模式
   - 其他模式（`template`、`auto_generate`、`smart`）已实现但需要更多测试

2. **未来优化**：
   - 支持数组节点断言（`$.items[*]`）
   - 支持嵌套节点递归断言
   - 支持更多字段规则（正则、范围等）

## 文档参考

- `docs/data-driven-assertion-node-design.md` - 节点断言设计文档
- `docs/data-driven-simple-format.md` - 数据驱动格式文档
- `backend/app/api/v1/test_executions.py` - 后端实现代码
- `frontend/src/pages/TestCases.tsx` - 前端配置界面

## 注意事项

1. **JSON格式**：expected字段必须是有效的JSON对象格式
2. **字段类型**：系统会自动尝试转换字符串类型（数字、布尔值）
3. **变量命名**：变量名只支持字母、数字、下划线
4. **节点路径**：必须是有效的JSONPath格式，以 `$` 开头

## 下一步

请用户手动测试以下场景：
1. ✅ 创建一个基础的节点断言测试用例
2. ✅ 执行测试并查看结果
3. ✅ 验证断言结果的详细信息
4. ⏳ 测试数据驱动 + 节点断言
5. ⏳ 测试变量替换功能
6. ⏳ 测试不同的断言模式

如果发现问题，请提供：
- 测试用例配置
- 实际响应数据
- 期望结果
- 实际结果
- 错误信息（如果有）

