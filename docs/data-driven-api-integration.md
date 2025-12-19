# 数据驱动测试 - 系统接口对接方案

## 设计目标

**高效对接**：最小化前后端交互，优化数据流转，提升用户体验

## 核心设计原则

1. **批量处理**：减少请求次数，支持批量导入和批量执行
2. **异步处理**：大数据量操作采用异步方式，避免阻塞
3. **增量更新**：支持数据预览、验证后再保存
4. **流式处理**：大文件分块上传和处理

## 接口设计方案

### 1. 数据导入接口

#### 1.1 CSV/Excel文件上传

**接口设计**：
```
POST /api/v1/test-cases/{case_id}/data-driver/import
Content-Type: multipart/form-data

Request:
  - file: File (CSV/Excel文件)
  - format: string (csv/excel)
  - preview: boolean (是否仅预览，不保存)

Response:
  {
    "success": true,
    "preview": true,  // 如果是预览模式
    "data": [
      {
        "row_index": 1,
        "data": {
          "username": "user1",
          "password": "pass1",
          "expected_status": 200
        },
        "errors": []  // 数据验证错误
      }
    ],
    "summary": {
      "total_rows": 100,
      "valid_rows": 98,
      "invalid_rows": 2,
      "warnings": []
    }
  }
```

**设计要点**：
- 支持预览模式，用户可以先查看数据再决定是否保存
- 返回数据验证结果，提示错误和警告
- 支持大文件分块上传（超过10MB时）

#### 1.2 数据保存

**接口设计**：
```
POST /api/v1/test-cases/{case_id}/data-driver/save
Content-Type: application/json

Request:
  {
    "data": [
      {
        "row_index": 1,
        "data": {
          "username": "user1",
          "password": "pass1",
          "expected_status": 200
        }
      }
    ],
    "replace": true  // 是否替换现有数据
  }

Response:
  {
    "success": true,
    "saved_count": 100,
    "data_driver": {
      "data": [...],  // 转换后的内部格式
      "metadata": {
        "total_rows": 100,
        "imported_at": "2024-01-01T10:00:00Z",
        "format": "csv"
      }
    }
  }
```

**设计要点**：
- 前端先调用预览接口，用户确认后再保存
- 支持追加和替换两种模式
- 后端自动转换为内部格式（包含request和assertions）

### 2. 数据驱动执行接口

#### 2.1 执行配置

**接口设计**：
```
POST /api/v1/test-executions/
Content-Type: application/json

Request:
  {
    "test_case_id": 1,
    "environment_id": 1,
    "is_data_driven": true,
    "execution_config": {
      "concurrency": 20,  // 并发数
      "timeout": 30,     // 超时时间（秒）
      "retry_count": 0,  // 重试次数
      "stop_on_error": false  // 遇到错误是否停止
    }
  }

Response:
  {
    "id": 123,
    "status": "running",
    "progress": {
      "total": 1000,
      "completed": 0,
      "passed": 0,
      "failed": 0
    },
    "estimated_time": null
  }
```

**设计要点**：
- 执行配置与执行分离，支持灵活配置
- 立即返回执行ID，采用异步执行
- 返回初始进度信息

#### 2.2 执行进度查询

**接口设计**：
```
GET /api/v1/test-executions/{execution_id}/progress

Response:
  {
    "status": "running",  // running/completed/failed/cancelled
    "progress": {
      "total": 1000,
      "completed": 350,
      "passed": 320,
      "failed": 30,
      "current_batch": 4,
      "total_batches": 20
    },
    "estimated_time": {
      "remaining_seconds": 120,
      "estimated_completion": "2024-01-01T10:05:00Z"
    },
    "recent_results": [
      {
        "data_index": 349,
        "status": "passed",
        "duration_ms": 150
      }
    ]
  }
```

**设计要点**：
- 支持轮询查询进度（前端每2-3秒查询一次）
- 返回最近执行结果，实时更新
- 估算剩余时间

#### 2.3 执行结果详情

**接口设计**：
```
GET /api/v1/test-executions/{execution_id}/results

Query Parameters:
  - page: int (页码，默认1)
  - page_size: int (每页数量，默认50)
  - status: string (筛选状态：passed/failed/all)
  - sort: string (排序字段：data_index/duration/status)

Response:
  {
    "total": 1000,
    "page": 1,
    "page_size": 50,
    "results": [
      {
        "data_index": 1,
        "test_data": {
          "username": "user1",
          "password": "pass1"
        },
        "status": "passed",
        "duration_ms": 150,
        "request": {
          "method": "POST",
          "url": "...",
          "body": {...}
        },
        "response": {
          "status_code": 200,
          "body": {...}
        },
        "assertions": [
          {
            "type": "status_code",
            "expected": 200,
            "actual": 200,
            "passed": true
          }
        ]
      }
    ]
  }
```

**设计要点**：
- 支持分页查询，避免一次性加载大量数据
- 支持筛选和排序
- 返回完整的请求、响应和断言信息

### 3. 数据导出接口

**接口设计**：
```
GET /api/v1/test-executions/{execution_id}/export

Query Parameters:
  - format: string (excel/csv/json)
  - include_details: boolean (是否包含详细信息)

Response:
  - Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  - Content-Disposition: attachment; filename="execution_123_results.xlsx"
  - 文件流
```

**设计要点**：
- 支持多种格式导出
- 支持流式下载，避免内存占用过大

## 数据流转优化

### 1. 前端数据流转

```
用户上传文件
  ↓
前端解析（CSV/Excel → JSON）
  ↓
调用预览接口（POST /import?preview=true）
  ↓
显示预览和验证结果
  ↓
用户确认后调用保存接口（POST /save）
  ↓
数据转换为内部格式并保存
```

**优化点**：
- 前端先解析，减少服务器压力
- 预览模式避免误操作
- 批量保存，一次请求完成

### 2. 后端数据流转

```
接收文件/数据
  ↓
数据验证和解析
  ↓
转换为内部格式（包含request和assertions）
  ↓
保存到数据库（data_driver字段）
  ↓
执行时读取并应用模板替换
  ↓
并发执行测试
  ↓
实时更新进度和结果
```

**优化点**：
- 数据转换在保存时完成，执行时直接使用
- 模板替换在内存中完成，高效
- 结果分批保存，避免数据库压力

### 3. 执行流程优化

```
接收执行请求
  ↓
创建执行记录（状态：running）
  ↓
读取测试用例和数据驱动配置
  ↓
转换为内部格式（应用模板替换）
  ↓
分批执行（每批50-100条）
  ↓
并发执行每批数据（并发数：20-50）
  ↓
实时更新进度（每完成一批更新一次）
  ↓
保存执行结果（分批保存）
  ↓
执行完成，更新状态
```

**优化点**：
- 分批执行，避免内存占用过大
- 并发执行，提升效率
- 实时更新进度，用户体验好
- 分批保存结果，避免数据库压力

## 性能优化建议

### 1. 前端优化

1. **文件解析**：
   - 使用Web Worker解析大文件，避免阻塞UI
   - 支持流式解析，边读边处理

2. **数据预览**：
   - 只预览前100条数据
   - 使用虚拟滚动，支持大量数据展示

3. **进度更新**：
   - 使用WebSocket或Server-Sent Events（SSE）实时推送进度
   - 降级方案：轮询（每2-3秒）

### 2. 后端优化

1. **数据存储**：
   - 大数据量（>1000条）考虑单独存储，不放在JSON字段
   - 使用压缩存储（gzip）

2. **执行优化**：
   - 使用异步执行（Celery/Background Tasks）
   - 支持断点续传（保存执行状态）
   - 结果缓存（相同请求缓存结果）

3. **数据库优化**：
   - 执行结果分表存储（按执行ID分表）
   - 使用索引优化查询
   - 定期归档历史数据

### 3. 接口优化

1. **批量操作**：
   - 支持批量导入、批量执行
   - 减少请求次数

2. **分页和筛选**：
   - 所有列表接口支持分页
   - 支持筛选和排序，减少数据传输

3. **缓存策略**：
   - 测试用例配置缓存
   - 执行进度缓存（Redis）

## 接口对接流程图

### 完整流程

```
┌─────────┐
│  用户    │
└────┬────┘
     │ 1. 上传CSV/Excel文件
     ↓
┌─────────────┐
│   前端      │
│ 解析文件    │
└────┬────────┘
     │ 2. POST /import?preview=true
     ↓
┌─────────────┐
│   后端      │
│ 验证和预览  │
└────┬────────┘
     │ 3. 返回预览数据
     ↓
┌─────────────┐
│   前端      │
│ 显示预览    │
└────┬────────┘
     │ 4. 用户确认
     ↓
┌─────────────┐
│   前端      │
│ POST /save  │
└────┬────────┘
     │ 5. 保存数据
     ↓
┌─────────────┐
│   后端      │
│ 转换并保存  │
└────┬────────┘
     │ 6. 用户点击执行
     ↓
┌─────────────┐
│   前端      │
│ POST /executions │
└────┬────────┘
     │ 7. 创建执行任务
     ↓
┌─────────────┐
│   后端      │
│ 异步执行    │
└────┬────────┘
     │ 8. 轮询进度
     ↓
┌─────────────┐
│   前端      │
│ GET /progress│
└────┬────────┘
     │ 9. 显示结果
     ↓
┌─────────────┐
│   用户      │
│ 查看结果    │
└─────────────┘
```

## 实现优先级

### 阶段1：基础对接（核心功能）
1. ✅ CSV/Excel文件上传接口
2. ✅ 数据预览接口
3. ✅ 数据保存接口
4. ✅ 执行接口（同步执行，后续改为异步）

### 阶段2：性能优化
1. ⏳ 异步执行（后台任务）
2. ⏳ 进度查询接口
3. ⏳ 结果分页查询
4. ⏳ 数据压缩存储

### 阶段3：高级功能
1. ⏳ WebSocket实时进度推送
2. ⏳ 断点续传
3. ⏳ 结果缓存
4. ⏳ 大数据量优化（分表存储）

## 技术选型建议

### 后端异步任务
- **FastAPI + BackgroundTasks**：简单场景
- **Celery + Redis**：复杂场景，需要任务队列

### 实时通信
- **Server-Sent Events (SSE)**：简单，单向推送
- **WebSocket**：复杂，双向通信

### 数据存储
- **PostgreSQL JSON字段**：小数据量（<1000条）
- **单独数据表**：大数据量（>1000条）
- **Redis缓存**：执行进度和临时数据

## 总结

**高效对接的关键**：
1. **批量处理**：减少请求次数
2. **异步执行**：避免阻塞
3. **实时反馈**：提升用户体验
4. **分页和筛选**：优化数据传输
5. **缓存策略**：减少重复计算

