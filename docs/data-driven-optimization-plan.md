# 数据驱动测试优化方案 - 支持1000次调用

## 设计理念

**核心原则**：降低使用门槛，让非技术人员也能轻松使用

### 设计思路
1. **数据文件格式简单**：用户只需准备简单的数据（如CSV的key-value对）
2. **程序自动处理**：
   - 自动将简单数据格式转换为请求参数
   - 自动根据响应生成或应用断言规则
   - 用户无需了解JSON、断言配置等复杂概念

## 问题分析

### 当前实现
- 数据驱动配置支持每行数据包含 `request` 和 `assertions`
- 执行时是串行的（for循环）
- 数据存储在测试用例的 `data_driver` 字段中（JSON格式）
- 前端表格编辑，适合少量数据
- **问题**：用户需要手动编写JSON格式的请求参数和断言配置，门槛较高

### 1000次调用的挑战
1. **数据管理**：1000条数据在表格中编辑不现实，需要文件导入
2. **数据格式**：JSON格式对非技术人员不友好，需要简化
3. **执行效率**：串行执行1000次会很慢（假设每次1秒，需要1000秒≈16分钟）
4. **数据存储**：JSON字段可能过大（1000条数据可能几MB）
5. **结果查看**：需要清晰的执行结果展示和统计

## 优化方案

### 核心机制：请求参数模板 + 数据替换

#### 设计思路
1. **请求参数模板**：在测试用例的"请求配置"中设置模板，使用 `${变量名}` 格式标记需要替换的字段
2. **Excel数据维护**：用户只需在Excel中维护需要变化的字段值
3. **自动替换**：程序自动将Excel中的数据替换到模板中对应字段

#### 优势
- **简单易用**：用户只需维护变化的字段，无需了解完整请求结构
- **灵活性强**：模板可以包含固定字段和动态字段
- **维护方便**：Excel格式，易于批量编辑和生成

### 1. 数据管理优化（简化格式）

#### 1.1 简化数据格式设计

**请求参数模板示例**（在测试用例中配置）：
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

**CSV格式示例**（用户只需维护变化的字段）：
```csv
username,password,expected_status,expected_user_id
user1,pass1,200,1001
user2,pass2,200,1002
```

**程序自动处理**：
- 读取请求参数模板
- 将CSV中的 `username` 替换模板中的 `${username}`
- 将CSV中的 `password` 替换模板中的 `${password}`
- 固定字段（如 `device_id`, `app_version`）保持不变
- 自动根据`expected_*`列生成断言规则
- 用户无需编写完整JSON格式

**Excel格式示例**（更灵活）：
| username | password | expected_status | expected_user_id | expected_role |
|----------|----------|-----------------|-----------------|---------------|
| user1    | pass1    | 200             | 1001            | admin         |

#### 1.2 程序自动处理逻辑

**请求参数格式化**：
- 自动提取非`expected_*`字段作为请求参数
- 支持字段映射配置（如：`user_name` → `username`）
- 自动转换为JSON格式

**断言自动生成**：
- `expected_status` → 状态码断言
- `expected_*` → JSONPath断言（自动推断路径）
- 支持配置JSONPath映射规则

#### 1.3 支持多种数据导入方式
- **CSV导入**：支持CSV格式，自动解析并格式化
- **Excel导入**：支持Excel格式，支持多sheet
- **JSON导入**：支持简化JSON格式（可选，向后兼容）
- **数据预览**：导入前预览数据，确认格式正确

#### 1.4 数据存储优化
- **大数据量**：超过100条时，建议使用外部数据源或文件存储
- **分页加载**：前端表格支持分页，避免一次性加载所有数据
- **数据压缩**：存储时压缩JSON数据

### 2. 执行效率优化

#### 2.1 并发执行
- **异步并发**：使用 `asyncio` 和 `httpx.AsyncClient` 实现并发请求
- **并发控制**：支持配置并发数（如：10、20、50等）
- **超时控制**：每个请求设置超时时间，避免长时间等待

#### 2.2 批量执行
- **分批处理**：将1000条数据分成多个批次执行
- **进度跟踪**：实时显示执行进度（已完成/总数）
- **断点续传**：支持中断后继续执行

#### 2.3 执行策略
- **快速失败**：遇到错误时可以选择继续或停止
- **重试机制**：支持失败重试（可配置重试次数）
- **结果缓存**：相同请求可以缓存结果

### 3. 结果展示优化

#### 3.1 执行结果汇总
- **统计信息**：总数、通过数、失败数、跳过数
- **执行时间**：总耗时、平均耗时、最快/最慢
- **成功率**：整体成功率、各批次成功率

#### 3.2 详细结果展示
- **失败用例**：优先展示失败的用例
- **结果筛选**：支持按状态筛选（通过/失败）
- **结果导出**：支持导出执行结果（Excel、CSV、JSON）

#### 3.3 可视化展示
- **执行趋势**：展示执行进度趋势图
- **失败分布**：展示失败用例的分布情况
- **性能分析**：展示各请求的响应时间分布

## 实现建议

### 阶段1：基础优化（快速实现）
1. **数据导入增强**：支持CSV、Excel导入
2. **并发执行**：实现异步并发执行（默认并发数10）
3. **进度显示**：实时显示执行进度
4. **结果优化**：优化执行结果展示

### 阶段2：高级优化（后续迭代）
1. **外部数据源**：支持数据库、API等外部数据源
2. **数据生成工具**：支持批量数据生成
3. **执行策略**：支持更多执行策略（重试、缓存等）
4. **可视化**：添加图表展示

## 技术实现要点

### 后端实现
```python
# 并发执行示例
import asyncio
import httpx

async def execute_test_data_async(test_data_list, concurrency=10):
    async with httpx.AsyncClient(timeout=30.0) as client:
        semaphore = asyncio.Semaphore(concurrency)
        
        async def execute_one(data):
            async with semaphore:
                # 执行单个测试数据
                return await execute_single_test(client, data)
        
        tasks = [execute_one(data) for data in test_data_list]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results
```

### 前端实现
```typescript
// 数据导入示例
const handleImportCSV = async (file: File) => {
  const text = await file.text()
  const lines = text.split('\n')
  const headers = lines[0].split(',')
  const data = lines.slice(1).map(line => {
    const values = line.split(',')
    return {
      request: parseCSVRow(headers, values),
      assertions: parseAssertions(values)
    }
  })
  // 更新数据驱动配置
}
```

## 使用建议

### 对于1000次调用场景
1. **数据准备**：
   - 使用Excel或CSV准备数据
   - 通过"导入JSON"功能导入数据
   - 确认数据格式正确

2. **执行配置**：
   - 设置并发数为20-50（根据接口性能调整）
   - 设置超时时间为30秒
   - 选择"快速失败"或"继续执行"策略

3. **结果查看**：
   - 查看执行汇总统计
   - 筛选失败用例，分析失败原因
   - 导出执行结果进行进一步分析

## 系统接口对接方案

### 核心设计原则
1. **批量处理**：减少请求次数，支持批量导入和批量执行
2. **异步处理**：大数据量操作采用异步方式，避免阻塞
3. **增量更新**：支持数据预览、验证后再保存
4. **流式处理**：大文件分块上传和处理

### 关键接口设计

#### 1. 数据导入接口
- **预览接口**：`POST /api/v1/test-cases/{case_id}/data-driver/import?preview=true`
  - 上传文件，返回预览数据和验证结果
  - 用户确认后再保存，避免误操作

- **保存接口**：`POST /api/v1/test-cases/{case_id}/data-driver/save`
  - 保存预览确认的数据
  - 自动转换为内部格式（包含request和assertions）

#### 2. 执行接口
- **执行接口**：`POST /api/v1/test-executions/`
  - 支持执行配置（并发数、超时、重试等）
  - 立即返回执行ID，采用异步执行

- **进度查询**：`GET /api/v1/test-executions/{execution_id}/progress`
  - 实时查询执行进度
  - 返回已完成数、通过数、失败数等

- **结果查询**：`GET /api/v1/test-executions/{execution_id}/results`
  - 支持分页、筛选、排序
  - 返回详细的执行结果

### 数据流转优化

**前端流程**：
```
上传文件 → 前端解析 → 预览接口 → 显示预览 → 保存接口 → 数据保存
```

**后端流程**：
```
接收数据 → 验证解析 → 转换格式 → 保存数据库 → 执行时应用模板 → 并发执行 → 实时更新进度
```

### 性能优化

1. **前端**：Web Worker解析大文件、虚拟滚动、WebSocket实时推送
2. **后端**：异步执行、分批处理、结果缓存、数据压缩
3. **数据库**：分表存储、索引优化、定期归档

**详细方案请参考**：`docs/data-driven-api-integration.md`

