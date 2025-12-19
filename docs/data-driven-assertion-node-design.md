# 数据驱动测试 - 断言节点设计

## 设计目标

**支持节点级断言**：允许用户断言响应信息中某个节点下的所有数据，而不仅仅是单个字段

## 问题场景

### 当前限制
- 当前断言只能针对单个字段，如 `$.user_id`、`$.data.name`
- 如果要断言一个对象下的所有字段，需要逐个配置，非常繁琐
- 对于动态结构（如数组元素），无法批量断言

### 用户需求
1. **节点断言**：断言 `$.data` 节点下的所有字段
2. **数组断言**：断言数组 `$.items[0]` 中每个元素的所有字段
3. **嵌套断言**：断言嵌套对象 `$.data.user` 下的所有字段
4. **动态断言**：根据实际响应自动生成节点下所有字段的断言

## 设计方案

### 方案1：节点路径断言（推荐）

#### 设计思路
使用特殊的断言类型 `node`，指定一个节点路径，自动断言该节点下的所有字段。

#### 断言配置格式

**基础格式**：
```json
{
  "type": "node",
  "path": "$.data",
  "mode": "all_fields",  // all_fields: 断言所有字段, structure: 只断言结构, values: 断言所有值
  "expected": {
    "user_id": 1001,
    "username": "user1",
    "email": "user1@test.com"
  }
}
```

**自动生成模式**：
```json
{
  "type": "node",
  "path": "$.data",
  "mode": "auto_generate",  // 自动从响应中提取该节点的所有字段并生成断言
  "operator": "equals"  // equals, contains, exists等
}
```

**数组节点断言**：
```json
{
  "type": "node",
  "path": "$.items[*]",  // 断言数组中每个元素
  "mode": "all_fields",
  "expected": {
    "id": "${id}",
    "name": "${name}",
    "status": "active"
  }
}
```

**嵌套节点断言**：
```json
{
  "type": "node",
  "path": "$.data.user",
  "mode": "all_fields",
  "expected": {
    "user_id": 1001,
    "username": "user1"
  }
}
```

### 方案2：节点模板断言

#### 设计思路
使用模板语法，支持变量替换，适用于数据驱动场景。

#### 断言配置格式

**模板格式**：
```json
{
  "type": "node_template",
  "path": "$.data",
  "template": {
    "user_id": "${expected_user_id}",
    "username": "${expected_username}",
    "email": "${expected_email}"
  },
  "operator": "equals"
}
```

**Excel数据格式**：
```csv
expected_user_id,expected_username,expected_email,expected_status
1001,user1,user1@test.com,200
1002,user2,user2@test.com,200
```

**程序处理**：
- 从Excel数据中提取 `expected_*` 字段
- 替换模板中的 `${变量名}`
- 生成完整的节点断言

### 方案3：智能节点断言（最灵活）

#### 设计思路
结合多种模式，支持灵活的节点断言配置。

#### 断言配置格式

**完整格式**：
```json
{
  "type": "node",
  "path": "$.data",
  "mode": "smart",  // smart: 智能模式，自动选择最佳策略
  "config": {
    "include_fields": ["user_id", "username", "email"],  // 指定要断言的字段
    "exclude_fields": ["password", "token"],  // 排除的字段
    "field_rules": {  // 字段级别的断言规则
      "user_id": {
        "operator": "equals",
        "expected": "${expected_user_id}"
      },
      "username": {
        "operator": "contains",
        "expected": "user"
      },
      "email": {
        "operator": "regex",
        "expected": "^[a-z]+@test\\.com$"
      }
    },
    "array_mode": "each",  // each: 断言每个元素, first: 只断言第一个, last: 只断言最后一个
    "nested_mode": "recursive"  // recursive: 递归断言嵌套对象, flat: 扁平化断言
  }
}
```

## 推荐方案：混合模式

### 核心设计

结合**节点路径断言**和**智能配置**，提供灵活且易用的断言方式。

### 断言类型定义

```typescript
interface AssertionConfig {
  type: "status_code" | "response_body" | "node" | "node_template"
  path?: string  // JSONPath路径
  mode?: "all_fields" | "auto_generate" | "smart" | "template"
  operator?: "equals" | "contains" | "exists" | "regex" | "gt" | "lt"
  expected?: any  // 期望值
  template?: Record<string, any>  // 模板（用于node_template类型）
  config?: NodeAssertionConfig  // 节点断言配置
}

interface NodeAssertionConfig {
  include_fields?: string[]  // 包含的字段
  exclude_fields?: string[]  // 排除的字段
  field_rules?: Record<string, FieldAssertionRule>  // 字段规则
  array_mode?: "each" | "first" | "last" | "all"  // 数组模式
  nested_mode?: "recursive" | "flat"  // 嵌套模式
  auto_generate?: boolean  // 是否自动生成
}
```

### 使用示例

#### 示例1：断言整个data节点

**配置**：
```json
{
  "type": "node",
  "path": "$.data",
  "mode": "all_fields",
  "expected": {
    "user_id": 1001,
    "username": "user1",
    "email": "user1@test.com"
  }
}
```

**执行逻辑**：
1. 从响应中提取 `$.data` 节点
2. 遍历 `expected` 对象中的所有字段
3. 对每个字段生成断言：`$.data.user_id == 1001`、`$.data.username == "user1"` 等
4. 如果响应中缺少字段或值不匹配，断言失败

#### 示例2：自动生成节点断言

**配置**：
```json
{
  "type": "node",
  "path": "$.data",
  "mode": "auto_generate",
  "operator": "equals"
}
```

**执行逻辑**：
1. 从响应中提取 `$.data` 节点的所有字段
2. 自动生成每个字段的断言规则
3. 使用 `operator` 指定的操作符进行断言
4. 适用于"响应结构应该保持不变"的场景

#### 示例3：数据驱动 + 节点断言

**Excel数据**：
```csv
expected_user_id,expected_username,expected_email,expected_status
1001,user1,user1@test.com,200
1002,user2,user2@test.com,200
```

**断言配置**：
```json
{
  "type": "node_template",
  "path": "$.data",
  "template": {
    "user_id": "${expected_user_id}",
    "username": "${expected_username}",
    "email": "${expected_email}"
  },
  "operator": "equals"
}
```

**执行逻辑**：
1. 从Excel数据中提取 `expected_*` 字段
2. 替换模板中的变量：`${expected_user_id}` → `1001`
3. 生成节点断言：`$.data.user_id == 1001`、`$.data.username == "user1"` 等
4. 执行断言验证

#### 示例4：数组节点断言

**配置**：
```json
{
  "type": "node",
  "path": "$.items[*]",
  "mode": "all_fields",
  "config": {
    "array_mode": "each",  // 断言数组中每个元素
    "include_fields": ["id", "name", "status"]
  },
  "expected": {
    "id": "${item_id}",
    "name": "${item_name}",
    "status": "active"
  }
}
```

**执行逻辑**：
1. 从响应中提取 `$.items` 数组
2. 遍历数组中的每个元素
3. 对每个元素断言指定的字段
4. 所有元素都通过才算成功

#### 示例5：智能节点断言

**配置**：
```json
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
        "expected": "${expected_user_id}"
      },
      "username": {
        "operator": "contains",
        "expected": "user"
      },
      "email": {
        "operator": "regex",
        "expected": "^[a-z]+@test\\.com$"
      }
    }
  }
}
```

**执行逻辑**：
1. 从响应中提取 `$.data` 节点
2. 根据 `include_fields` 和 `exclude_fields` 筛选字段
3. 对每个字段应用对应的 `field_rules`
4. 所有字段都通过才算成功

## 实现逻辑

### 后端实现

```python
def evaluate_node_assertion(
    assertion: dict,
    response_json: dict,
    test_data: dict = None
) -> tuple[bool, list]:
    """
    评估节点断言
    
    Args:
        assertion: 断言配置
        response_json: 响应JSON
        test_data: 测试数据（用于变量替换）
    
    Returns:
        (是否通过, 详细结果列表)
    """
    path = assertion.get("path", "$")
    mode = assertion.get("mode", "all_fields")
    expected = assertion.get("expected", {})
    config = assertion.get("config", {})
    
    # 提取节点
    node_value = extract_json_path(response_json, path)
    
    if node_value is None:
        return False, [{"field": path, "error": "节点不存在"}]
    
    results = []
    all_passed = True
    
    if mode == "all_fields":
        # 断言所有字段
        if isinstance(expected, dict):
            for field, expected_value in expected.items():
                field_path = f"{path}.{field}" if path != "$" else f"$.{field}"
                actual_value = extract_json_path(response_json, field_path)
                
                # 变量替换
                if isinstance(expected_value, str) and test_data:
                    expected_value = replace_variables(expected_value, test_data)
                
                passed = compare_values(actual_value, expected_value, assertion.get("operator", "equals"))
                results.append({
                    "field": field_path,
                    "expected": expected_value,
                    "actual": actual_value,
                    "passed": passed
                })
                if not passed:
                    all_passed = False
    
    elif mode == "auto_generate":
        # 自动生成断言
        if isinstance(node_value, dict):
            for field, actual_value in node_value.items():
                # 排除某些字段
                if config.get("exclude_fields") and field in config["exclude_fields"]:
                    continue
                if config.get("include_fields") and field not in config["include_fields"]:
                    continue
                
                field_path = f"{path}.{field}" if path != "$" else f"$.{field}"
                operator = assertion.get("operator", "exists")
                
                passed = evaluate_field_assertion(actual_value, None, operator)
                results.append({
                    "field": field_path,
                    "expected": None,
                    "actual": actual_value,
                    "passed": passed,
                    "operator": operator
                })
                if not passed:
                    all_passed = False
    
    elif mode == "smart":
        # 智能模式
        include_fields = config.get("include_fields", [])
        exclude_fields = config.get("exclude_fields", [])
        field_rules = config.get("field_rules", {})
        
        if isinstance(node_value, dict):
            for field in node_value.keys():
                # 字段筛选
                if exclude_fields and field in exclude_fields:
                    continue
                if include_fields and field not in include_fields:
                    continue
                
                field_path = f"{path}.{field}" if path != "$" else f"$.{field}"
                actual_value = extract_json_path(response_json, field_path)
                
                # 应用字段规则
                if field in field_rules:
                    rule = field_rules[field]
                    expected_value = rule.get("expected")
                    operator = rule.get("operator", "equals")
                    
                    # 变量替换
                    if isinstance(expected_value, str) and test_data:
                        expected_value = replace_variables(expected_value, test_data)
                    
                    passed = compare_values(actual_value, expected_value, operator)
                else:
                    # 默认规则：存在性检查
                    passed = actual_value is not None
                
                results.append({
                    "field": field_path,
                    "expected": expected_value if field in field_rules else None,
                    "actual": actual_value,
                    "passed": passed
                })
                if not passed:
                    all_passed = False
    
    elif mode == "template":
        # 模板模式
        template = assertion.get("template", {})
        if test_data:
            # 替换模板中的变量
            expected = replace_template_variables(template, test_data)
        
        # 执行节点断言
        return evaluate_node_assertion({
            **assertion,
            "mode": "all_fields",
            "expected": expected
        }, response_json, test_data)
    
    return all_passed, results
```

### 前端配置界面

#### 节点断言配置组件

```typescript
const NodeAssertionConfig: React.FC = () => {
  return (
    <Form.Item label="节点路径">
      <Input placeholder="$.data" />
    </Form.Item>
    
    <Form.Item label="断言模式">
      <Select>
        <Option value="all_fields">断言所有字段</Option>
        <Option value="auto_generate">自动生成</Option>
        <Option value="smart">智能模式</Option>
        <Option value="template">模板模式</Option>
      </Select>
    </Form.Item>
    
    <Form.Item label="期望值（JSON格式）">
      <TextArea
        rows={6}
        placeholder='{"user_id": 1001, "username": "user1"}'
      />
    </Form.Item>
    
    <Form.Item label="字段配置">
      <Checkbox.Group>
        <Checkbox value="include_fields">指定包含字段</Checkbox>
        <Checkbox value="exclude_fields">指定排除字段</Checkbox>
      </Checkbox.Group>
    </Form.Item>
  )
}
```

## Excel数据格式支持

### 节点断言在Excel中的表示

**方式1：使用特殊列名**
```csv
expected_node_data,expected_status
{"user_id":1001,"username":"user1"},200
{"user_id":1002,"username":"user2"},200
```

**方式2：使用字段前缀**
```csv
expected_data_user_id,expected_data_username,expected_status
1001,user1,200
1002,user2,200
```

**程序自动识别**：
- 如果Excel中有 `expected_node_*` 列，自动生成节点断言
- 如果Excel中有 `expected_*_*` 格式（如 `expected_data_user_id`），自动识别为节点字段

## 使用场景总结

### 场景1：断言用户信息节点
- **需求**：断言 `$.data` 节点下的所有用户信息
- **配置**：`{"type": "node", "path": "$.data", "mode": "all_fields"}`
- **Excel**：`expected_data_user_id,expected_data_username,expected_data_email`

### 场景2：断言数组元素
- **需求**：断言 `$.items` 数组中每个元素的结构
- **配置**：`{"type": "node", "path": "$.items[*]", "mode": "smart", "config": {"array_mode": "each"}}`

### 场景3：数据驱动 + 节点断言
- **需求**：不同测试数据断言不同的节点值
- **配置**：`{"type": "node_template", "path": "$.data", "template": {...}}`
- **Excel**：每行数据包含 `expected_*` 字段，自动替换到模板中

## 实现优先级

### 阶段1：基础功能
1. ✅ 节点路径断言（`mode: "all_fields"`）
2. ✅ 变量替换支持
3. ✅ Excel数据格式识别

### 阶段2：增强功能
1. ⏳ 自动生成模式（`mode: "auto_generate"`）
2. ⏳ 模板模式（`mode: "template"`）
3. ⏳ 数组节点断言

### 阶段3：高级功能
1. ⏳ 智能模式（`mode: "smart"`）
2. ⏳ 字段规则配置
3. ⏳ 嵌套节点递归断言

## 总结

**核心优势**：
1. **简化配置**：一次配置，自动断言节点下所有字段
2. **灵活强大**：支持多种模式，适应不同场景
3. **数据驱动**：完美结合Excel数据，支持变量替换
4. **易于使用**：提供直观的配置界面和Excel格式

**推荐实现顺序**：
1. 先实现 `all_fields` 模式（最常用）
2. 再实现 `template` 模式（数据驱动场景）
3. 最后实现 `smart` 和 `auto_generate` 模式（高级功能）

