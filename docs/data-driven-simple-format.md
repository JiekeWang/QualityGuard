# 数据驱动测试 - 简化格式方案

## 设计理念

**目标**：降低使用门槛，让非技术人员也能轻松使用

### 核心思路
1. **数据文件格式简单**：用户只需准备简单的数据（如CSV的key-value对）
2. **程序自动处理**：
   - 自动将简单数据格式转换为请求参数
   - 自动根据响应生成或应用断言规则
   - 用户无需了解JSON、断言配置等复杂概念

## 数据格式设计

### 核心机制：请求参数模板 + 数据替换

#### 设计思路
1. **请求参数模板**：在测试用例中配置请求参数模板（包含所有可能的字段）
2. **Excel数据维护**：用户只需在Excel中维护需要变化的字段值
3. **自动替换**：程序自动将Excel中的数据替换到模板中对应字段

#### 优势
- **简单易用**：用户只需维护变化的字段，无需了解完整请求结构
- **灵活性强**：模板可以包含固定字段和动态字段
- **维护方便**：Excel格式，易于批量编辑和生成

### 方案1：CSV格式（最简单）

#### 请求参数模板示例
在测试用例的"请求配置"中设置模板：
```json
{
  "method": "POST",
  "path": "/api/v1/login",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "username": "${username}",
    "password": "${password}",
    "device_id": "default_device",
    "app_version": "1.0.0"
  }
}
```

#### Excel数据格式示例
```csv
username,password,expected_status,expected_user_id
user1,pass1,200,1001
user2,pass2,200,1002
user3,pass3,401,0
```

#### 程序处理逻辑
1. **请求参数生成**：
   - 读取请求参数模板
   - 将Excel中的 `username` 替换模板中的 `${username}`
   - 将Excel中的 `password` 替换模板中的 `${password}`
   - 固定字段（如 `device_id`, `app_version`）保持不变
   - **数组字段处理**：如果模板中字段是数组，Excel中使用分隔符（如逗号）分隔多个值
   - 最终生成：`{"username": "user1", "password": "pass1", "device_id": "default_device", "app_version": "1.0.0"}`

2. **断言自动生成**：
   - 如果Excel中有 `expected_status` 列，自动生成状态码断言
   - 如果Excel中有 `expected_message` 列，自动生成响应消息断言
   - 如果Excel中有 `expected_*` 格式的列，自动生成对应的JSONPath断言

### 方案2：Excel格式（更灵活，推荐）

#### 请求参数模板示例
在测试用例的"请求配置"中设置模板：
```json
{
  "method": "POST",
  "path": "/api/v1/users",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${token}"
  },
  "body": {
    "username": "${username}",
    "email": "${email}",
    "role": "${role}",
    "status": "active",
    "created_by": "system"
  }
}
```

#### Excel数据格式示例

**基础示例**：
| username | email              | role  | token        | expected_status | expected_user_id | expected_role |
|----------|-------------------|-------|--------------|-----------------|------------------|---------------|
| user1    | user1@test.com    | admin | token123     | 200             | 1001             | admin         |
| user2    | user2@test.com    | user  | token456     | 200             | 1002             | user          |

**包含数组字段的示例**：
| username | ids        | tags              | items                    | expected_status |
|----------|------------|-------------------|--------------------------|-----------------|
| user1    | 1,2,3      | tag1,tag2,tag3    | item1,item2              | 200             |
| user2    | 4,5        | tag4               | item3,item4,item5        | 200             |

**说明**：
- `ids: 1,2,3` → 转换为数组 `[1, 2, 3]`
- `tags: tag1,tag2,tag3` → 转换为数组 `["tag1", "tag2", "tag3"]`
- 支持数字数组和字符串数组的自动识别

#### 程序处理逻辑
1. **请求参数生成**：
   - 读取请求参数模板
   - 遍历Excel中的每一行数据
   - 将Excel列名匹配模板中的 `${变量名}`，进行替换
   - 例如：Excel中的 `username` 列 → 替换模板中的 `${username}`
   - 例如：Excel中的 `token` 列 → 替换模板中的 `${token}`
   - **数组字段处理**：
     - 如果模板中字段是数组类型（如 `"ids": []`），Excel中使用分隔符（默认逗号）分隔多个值
     - 例如：Excel中 `ids: 1,2,3` → 转换为 `[1, 2, 3]`
     - 例如：Excel中 `tags: tag1,tag2` → 转换为 `["tag1", "tag2"]`
     - 支持数字和字符串的自动识别
     - 支持JSON字符串格式（如 `[1,2,3]` 或 `["tag1","tag2"]`）
   - 固定字段（如 `status`, `created_by`）保持不变
   - 最终生成完整的请求参数

2. **断言自动生成**：
   - `expected_status` → `{"type": "status_code", "expected": 200}`
   - `expected_user_id` → `{"type": "response_body", "path": "$.user_id", "operator": "equals", "expected": 1001}`
   - `expected_role` → `{"type": "response_body", "path": "$.role", "operator": "equals", "expected": "admin"}`

### 方案3：简化JSON格式（中等复杂度，向后兼容）

#### 请求参数模板示例
在测试用例的"请求配置"中设置模板（与方案1、2相同）

#### JSON数据格式示例
```json
[
  {
    "username": "user1",
    "password": "pass1",
    "expected": {
      "status": 200,
      "user_id": 1001,
      "role": "admin"
    }
  },
  {
    "username": "user2",
    "password": "pass2",
    "expected": {
      "status": 200,
      "user_id": 1002,
      "role": "user"
    }
  }
]
```

#### 程序处理逻辑
1. **请求参数生成**：
   - 读取请求参数模板
   - 将JSON中的字段值替换模板中对应的 `${变量名}`
   - 例如：`{"username": "user1"}` → 替换模板中的 `${username}`

2. **断言生成**：根据 `expected` 对象自动生成断言规则

## 程序自动处理逻辑

### 1. 请求参数格式化（基于模板替换）

```python
def format_request_data(row_data: dict, request_template: dict) -> dict:
    """
    将简单的数据行转换为请求参数（基于模板替换）
    
    规则：
    1. 读取请求参数模板（从测试用例的请求配置中获取）
    2. 排除 expected_* 开头的字段和 expected 字段（这些用于断言）
    3. 将Excel/CSV中的字段值替换模板中对应的 ${变量名}
    4. 支持字段映射配置（如：user_name -> username）
    5. 模板中的固定字段保持不变
    """
    import copy
    import re
    
    # 深拷贝模板，避免修改原模板
    request_data = copy.deepcopy(request_template)
    
    # 递归替换函数，支持在任意位置使用 ${变量名} 格式
    def replace_vars(obj: Any, test_data: dict) -> Any:
        if isinstance(obj, dict):
            return {k: replace_vars(v, test_data) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [replace_vars(item, test_data) for item in obj]
        elif isinstance(obj, str):
            # 支持 ${key} 格式的变量替换
            def replacer(match):
                key = match.group(1)
                # 从测试数据中获取值（排除expected_*字段）
                if key.startswith('expected_') or key == 'expected':
                    return match.group(0)  # 保持原样
                value = test_data.get(key)
                if value is None:
                    return match.group(0)  # 如果变量不存在，保持原样
                # 如果值是对象或数组，转换为JSON字符串
                if isinstance(value, (dict, list)):
                    import json
                    return json.dumps(value, ensure_ascii=False)
                return str(value)
            return re.sub(r'\$\{(\w+)\}', replacer, obj)
        else:
            return obj
    
    # 执行替换
    request_data = replace_vars(request_data, row_data)
    
    return request_data
```

#### 替换示例

**示例1：基础替换**

**模板**：
```json
{
  "method": "POST",
  "path": "/api/v1/login",
  "headers": {
    "Content-Type": "application/json",
    "X-Device-ID": "${device_id}"
  },
  "body": {
    "username": "${username}",
    "password": "${password}",
    "device_id": "default_device"
  }
}
```

**Excel数据行**：
```csv
username,password,device_id,expected_status
user1,pass1,device123,200
```

**替换结果**：
```json
{
  "method": "POST",
  "path": "/api/v1/login",
  "headers": {
    "Content-Type": "application/json",
    "X-Device-ID": "device123"
  },
  "body": {
    "username": "user1",
    "password": "pass1",
    "device_id": "default_device"
  }
}
```

**示例2：数组字段替换**

**模板**：
```json
{
  "method": "POST",
  "path": "/api/v1/users/batch",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "user_ids": [],
    "tags": [],
    "items": []
  }
}
```

**Excel数据行**：
```csv
user_ids,tags,items,expected_status
1,2,3,tag1,tag2,item1,item2,200
4,5,tag3,item3,item4,200
```

**说明**：由于Excel列名无法直接表示数组，有两种处理方式：

**方式1：使用列名后缀（推荐）**
```csv
user_ids_1,user_ids_2,user_ids_3,tags_1,tags_2,items_1,items_2,expected_status
1,2,3,tag1,tag2,item1,item2,200
4,5,,tag3,,item3,item4,200
```
程序自动识别 `user_ids_*` 列，合并为 `user_ids: [1, 2, 3]`

**方式2：使用分隔符（更简单）**
```csv
user_ids,tags,items,expected_status
1,2,3,tag1,tag2,item1,item2,200
4,5,tag3,item3,item4,200
```
程序根据模板中字段类型（数组）自动解析分隔符格式

**替换结果**（方式2）：
```json
{
  "method": "POST",
  "path": "/api/v1/users/batch",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "user_ids": [1, 2, 3],
    "tags": ["tag1", "tag2"],
    "items": ["item1", "item2"]
  }
}
```

**示例3：嵌套数组（复杂结构）**

**模板**：
```json
{
  "method": "POST",
  "path": "/api/v1/orders",
  "body": {
    "order_items": []
  }
}
```

**Excel数据行**（使用JSON字符串格式）：
```csv
order_items,expected_status
[{"id":1,"name":"item1","qty":2},{"id":2,"name":"item2","qty":3}],200
```

**替换结果**：
```json
{
  "method": "POST",
  "path": "/api/v1/orders",
  "body": {
    "order_items": [
      {"id": 1, "name": "item1", "qty": 2},
      {"id": 2, "name": "item2", "qty": 3}
    ]
  }
}
```

### 2. 断言自动生成

```python
def generate_assertions(row_data: dict, response_template: dict = None) -> list:
    """
    根据数据行自动生成断言规则
    
    规则：
    1. expected_status -> 状态码断言
    2. expected_* -> JSONPath断言（自动推断路径）
    3. expected对象 -> 递归生成断言
    4. expected_node_* -> 节点断言（新增）
    """
    assertions = []
    
    # 状态码断言
    if 'expected_status' in row_data:
        assertions.append({
            "type": "status_code",
            "expected": row_data['expected_status']
        })
    
    # 节点断言（新增）
    # 支持 expected_node_data, expected_node_items 等格式
    node_assertions = {}
    for key, value in row_data.items():
        if key.startswith('expected_node_'):
            node_name = key.replace('expected_node_', '')
            if isinstance(value, str):
                try:
                    value = json.loads(value)  # 尝试解析JSON字符串
                except:
                    pass
            node_assertions[node_name] = value
    
    # 如果有节点断言，生成节点断言配置
    if node_assertions:
        for node_name, expected_value in node_assertions.items():
            json_path = f"$.{node_name}"  # 默认路径，可配置
            assertions.append({
                "type": "node",
                "path": json_path,
                "mode": "all_fields",
                "expected": expected_value if isinstance(expected_value, dict) else {}
            })
    
    # 其他expected_*字段（排除节点断言）
    for key, value in row_data.items():
        if key.startswith('expected_') and key != 'expected_status' and not key.startswith('expected_node_'):
            field_name = key.replace('expected_', '')
            # 自动推断JSONPath（支持多种格式）
            json_path = infer_json_path(field_name, response_template)
            assertions.append({
                "type": "response_body",
                "path": json_path,
                "operator": "equals",
                "expected": value
            })
    
    # expected对象
    if 'expected' in row_data and isinstance(row_data['expected'], dict):
        for field, value in row_data['expected'].items():
            json_path = infer_json_path(field, response_template)
            assertions.append({
                "type": "response_body",
                "path": json_path,
                "operator": "equals",
                "expected": value
            })
    
    return assertions
```

**节点断言说明**：
- 支持 `expected_node_*` 格式的Excel列，如 `expected_node_data`
- 自动生成节点断言，断言指定节点下的所有字段
- 支持JSON字符串格式，如 `expected_node_data: {"user_id": 1001, "username": "user1"}`
- 详细设计请参考：`docs/data-driven-assertion-node-design.md`

### 3. JSONPath自动推断

```python
def infer_json_path(field_name: str, response_template: dict = None) -> str:
    """
    根据字段名自动推断JSONPath
    
    规则：
    1. 如果response_template中有该字段，使用实际路径
    2. 否则使用常见命名规则：
       - user_id -> $.user_id 或 $.data.user_id
       - user_name -> $.user_name 或 $.data.user_name
       - 支持配置路径映射
    """
    # 优先从response_template中查找
    if response_template:
        path = find_field_in_template(field_name, response_template)
        if path:
            return path
    
    # 使用默认规则
    # 支持多种常见路径格式
    possible_paths = [
        f"$.{field_name}",
        f"$.data.{field_name}",
        f"$.result.{field_name}",
        f"$.body.{field_name}",
    ]
    
    # 返回第一个（或根据配置选择）
    return possible_paths[0]
```

## 使用流程

### 步骤1：配置请求参数模板
在测试用例的"请求配置"中设置模板，使用 `${变量名}` 格式标记需要替换的字段：
```json
{
  "method": "POST",
  "path": "/api/v1/login",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "username": "${username}",
    "password": "${password}",
    "device_id": "default_device"
  }
}
```

### 步骤2：准备数据文件
用户只需在Excel/CSV中维护需要变化的字段值：

**基础字段**：
```csv
username,password,expected_status,expected_user_id
user1,pass1,200,1001
user2,pass2,200,1002
```

**包含数组字段**：
```csv
username,ids,tags,expected_status
user1,1,2,3,tag1,tag2,200
user2,4,5,tag3,200
```

**说明**：
- Excel中的列名对应模板中的 `${变量名}`
- 例如：Excel中的 `username` 列 → 替换模板中的 `${username}`
- 固定字段（如 `device_id`）在模板中设置，Excel中无需维护
- **数组字段处理**：
  - **方式1（推荐）**：使用分隔符（逗号）分隔多个值，如 `ids: 1,2,3` → `[1, 2, 3]`
  - **方式2**：使用列名后缀，如 `ids_1, ids_2, ids_3` → 自动合并为数组
  - **方式3**：复杂嵌套结构使用JSON字符串格式，如 `items: [{"id":1},{"id":2}]`

### 步骤3：导入数据
- 点击"导入CSV"或"导入Excel"
- 程序自动解析数据
- 显示数据预览，确认格式正确

### 步骤4：配置映射规则（可选）
- 字段映射：`user_name` → `username`（Excel列名 → 模板变量名）
- JSONPath映射：`user_id` → `$.data.user.id`（用于断言路径推断）

### 步骤5：执行测试
- 程序自动：
  1. 读取请求参数模板
  2. 将每行Excel数据替换模板中对应的 `${变量名}`
  3. 根据 `expected_*` 字段生成断言
  4. 执行测试并验证

## 优势

1. **低门槛**：用户无需了解JSON、断言配置等
2. **易维护**：数据文件格式简单，易于编辑
3. **自动化**：程序自动处理格式转换和断言生成
4. **灵活性**：支持配置映射规则，适应不同接口

## 实现建议

### 阶段1：基础功能（核心实现）
1. **请求参数模板机制**
   - 在测试用例请求配置中支持 `${变量名}` 格式
   - 实现模板变量替换逻辑
   - 支持在 headers、params、body、path 等位置使用变量

2. **CSV导入支持**
   - 解析CSV文件
   - 自动识别 `expected_*` 字段（用于断言）
   - 其他字段作为模板变量数据

3. **自动请求参数格式化**
   - 读取请求参数模板
   - 将Excel/CSV数据替换模板中的 `${变量名}`
   - 生成完整的请求参数

4. **自动断言生成**
   - 基于 `expected_*` 字段自动生成断言
   - 自动推断JSONPath路径

### 阶段2：增强功能
1. **Excel导入支持**
   - 支持Excel格式（.xlsx, .xls）
   - 支持多sheet选择
   - 数据预览功能

2. **JSONPath自动推断优化**
   - 支持配置JSONPath映射规则
   - 支持从响应模板中自动推断路径
   - 支持多种常见路径格式

3. **字段映射配置界面**
   - 可视化配置字段映射
   - 保存映射规则供后续使用

### 阶段3：高级功能
1. **数据验证和预览**
   - 导入前数据格式验证
   - 数据预览和编辑
   - 数据统计信息

2. **断言规则模板**
   - 预定义断言规则模板
   - 支持自定义断言规则

3. **批量数据生成工具**
   - 基于规则批量生成测试数据
   - 支持随机数、序列号、日期等

## 技术实现细节

### 后端实现要点

#### 1. 模板变量替换函数
```python
def apply_template_variables(template: dict, test_data: dict) -> dict:
    """
    将测试数据应用到请求模板中
    
    Args:
        template: 请求参数模板，包含 ${变量名} 格式的变量
        test_data: 测试数据，包含变量值（排除expected_*字段）
    
    Returns:
        替换后的完整请求参数
    """
    import copy
    import re
    import json
    
    result = copy.deepcopy(template)
    
    def replace_vars(obj: Any) -> Any:
        if isinstance(obj, dict):
            return {k: replace_vars(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [replace_vars(item) for item in obj]
        elif isinstance(obj, str):
            def replacer(match):
                key = match.group(1)
                # 排除expected_*字段
                if key.startswith('expected_') or key == 'expected':
                    return match.group(0)
                value = test_data.get(key)
                if value is None:
                    return match.group(0)
                if isinstance(value, (dict, list)):
                    return json.dumps(value, ensure_ascii=False)
                return str(value)
            return re.sub(r'\$\{(\w+)\}', replacer, obj)
        else:
            return obj
    
    return replace_vars(result)
```

#### 2. CSV/Excel解析
```python
def parse_csv_file(file_content: str) -> List[dict]:
    """
    解析CSV文件，返回数据列表
    
    格式：
    username,password,expected_status
    user1,pass1,200
    user2,pass2,200
    """
    import csv
    from io import StringIO
    
    reader = csv.DictReader(StringIO(file_content))
    return list(reader)

def parse_excel_file(file_path: str, sheet_name: str = None) -> List[dict]:
    """
    解析Excel文件，返回数据列表
    """
    import pandas as pd
    
    df = pd.read_excel(file_path, sheet_name=sheet_name)
    return df.to_dict('records')
```

#### 3. 断言自动生成
```python
def generate_assertions_from_data(row_data: dict, response_template: dict = None) -> list:
    """
    根据数据行自动生成断言规则
    
    规则：
    1. expected_status -> 状态码断言
    2. expected_* -> JSONPath断言（自动推断路径）
    3. expected对象 -> 递归生成断言
    """
    assertions = []
    
    # 状态码断言
    if 'expected_status' in row_data:
        assertions.append({
            "type": "status_code",
            "expected": int(row_data['expected_status'])
        })
    
    # 其他expected_*字段
    for key, value in row_data.items():
        if key.startswith('expected_') and key != 'expected_status':
            field_name = key.replace('expected_', '')
            json_path = infer_json_path(field_name, response_template)
            assertions.append({
                "type": "response_body",
                "path": json_path,
                "operator": "equals",
                "expected": value
            })
    
    # expected对象
    if 'expected' in row_data and isinstance(row_data['expected'], dict):
        for field, value in row_data['expected'].items():
            json_path = infer_json_path(field, response_template)
            assertions.append({
                "type": "response_body",
                "path": json_path,
                "operator": "equals",
                "expected": value
            })
    
    return assertions
```

### 前端实现要点

#### 1. CSV/Excel导入组件
```typescript
const handleImportCSV = async (file: File) => {
  const text = await file.text()
  const lines = text.split('\n')
  const headers = lines[0].split(',')
  
  const data = lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',')
      const row: any = {}
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || ''
      })
      return row
    })
  
  // 转换为内部格式
  const formattedData = data.map(row => ({
    request: row, // 包含所有字段，程序会自动处理
    assertions: generateAssertionsFromRow(row)
  }))
  
  updateDataDriver(formattedData)
}
```

#### 2. 数据预览组件
```typescript
const DataPreview: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <Table
      dataSource={data.slice(0, 10)} // 只预览前10条
      columns={Object.keys(data[0] || {}).map(key => ({
        title: key,
        dataIndex: key,
        key: key
      }))}
    />
  )
}
```

