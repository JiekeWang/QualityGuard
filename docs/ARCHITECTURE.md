# QualityGuard 架构设计文档

## 一、系统架构

### 分层架构

QualityGuard 采用经典的分层架构设计，从上到下分为四层：

1. **用户界面层**：提供多种访问方式
   - Web Portal（React + TypeScript）
   - CLI工具（Node.js）
   - RESTful API

2. **应用服务层**：核心业务逻辑
   - 测试管理服务
   - 任务调度服务
   - 报告服务

3. **测试引擎层**：测试执行引擎
   - UI自动化引擎（Playwright）
   - API测试引擎
   - 性能测试引擎

4. **基础设施层**：底层支撑
   - 数据库（PostgreSQL）
   - 缓存（Redis）
   - 消息队列（RabbitMQ）
   - 对象存储（MinIO）

## 二、技术栈

### 后端
- **框架**: FastAPI
- **数据库**: PostgreSQL + Redis
- **ORM**: SQLAlchemy (异步)
- **消息队列**: RabbitMQ
- **对象存储**: MinIO

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI库**: Ant Design 5
- **状态管理**: Redux Toolkit
- **路由**: React Router v6

### 测试引擎
- **UI测试**: Playwright
- **API测试**: httpx
- **性能测试**: 自研（基于asyncio）

## 三、核心模块

### 1. 测试管理模块
- 测试用例管理（CRUD）
- 测试计划管理
- 用例版本控制
- 标签分类

### 2. 测试执行引擎
- 多引擎支持（UI、API、性能）
- 分布式执行
- 并行控制
- 失败重试

### 3. 报告与分析
- 实时进度
- 详细日志
- 性能图表
- 数据统计

### 4. 设备管理
- 设备池管理
- 状态监控
- 资源分配

## 四、数据模型

### 核心实体
- User（用户）
- Project（项目）
- TestCase（测试用例）
- TestPlan（测试计划）
- TestExecution（测试执行）
- Device（设备）

## 五、API设计

### RESTful API
- `/api/v1/auth` - 认证相关
- `/api/v1/users` - 用户管理
- `/api/v1/projects` - 项目管理
- `/api/v1/test-cases` - 测试用例
- `/api/v1/test-plans` - 测试计划
- `/api/v1/test-executions` - 测试执行
- `/api/v1/reports` - 测试报告
- `/api/v1/devices` - 设备管理

## 六、部署架构

### 开发环境
使用 Docker Compose 一键启动所有服务：
- PostgreSQL
- Redis
- RabbitMQ
- MinIO

### 生产环境
建议使用 Kubernetes 进行容器编排，支持：
- 水平扩展
- 高可用
- 负载均衡

## 七、扩展性设计

### 插件化架构
- 测试引擎可插拔
- 支持自定义引擎
- 第三方工具集成

### 配置管理
- 环境变量配置
- 配置文件支持
- 动态配置更新

