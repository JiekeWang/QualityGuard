# 项目结构说明

## 目录结构

```
QualityGuard/
├── backend/                    # 后端服务
│   ├── app/
│   │   ├── api/               # API路由
│   │   │   └── v1/            # API v1版本
│   │   │       ├── auth.py    # 认证相关
│   │   │       ├── users.py   # 用户管理
│   │   │       ├── projects.py # 项目管理
│   │   │       ├── test_cases.py # 测试用例
│   │   │       ├── test_plans.py # 测试计划
│   │   │       ├── test_executions.py # 测试执行
│   │   │       ├── reports.py # 测试报告
│   │   │       └── devices.py # 设备管理
│   │   ├── core/              # 核心配置
│   │   │   ├── config.py      # 应用配置
│   │   │   ├── database.py    # 数据库连接
│   │   │   └── redis_client.py # Redis客户端
│   │   ├── models/            # 数据模型
│   │   │   ├── user.py        # 用户模型
│   │   │   ├── project.py     # 项目模型
│   │   │   ├── test_case.py   # 测试用例模型
│   │   │   ├── test_plan.py   # 测试计划模型
│   │   │   ├── test_execution.py # 测试执行模型
│   │   │   └── device.py      # 设备模型
│   │   ├── services/          # 业务服务
│   │   │   ├── test_management.py # 测试管理服务
│   │   │   ├── task_scheduler.py # 任务调度服务
│   │   │   └── report_service.py # 报告服务
│   │   ├── engines/           # 测试引擎
│   │   │   ├── base_engine.py # 引擎基类
│   │   │   ├── ui_engine.py   # UI测试引擎
│   │   │   ├── api_engine.py  # API测试引擎
│   │   │   ├── performance_engine.py # 性能测试引擎
│   │   │   └── engine_factory.py # 引擎工厂
│   │   ├── utils/             # 工具函数
│   │   │   └── minio_client.py # MinIO客户端
│   │   └── main.py            # 应用入口
│   ├── tests/                 # 测试代码
│   ├── requirements.txt       # Python依赖
│   ├── .env.example           # 环境变量示例
│   └── alembic.ini           # 数据库迁移配置
│
├── frontend/                  # 前端应用
│   ├── src/
│   │   ├── components/       # 组件
│   │   │   └── Layout/       # 布局组件
│   │   │       └── AppLayout.tsx
│   │   ├── pages/            # 页面
│   │   │   ├── Login.tsx     # 登录页
│   │   │   ├── Dashboard.tsx # 仪表盘
│   │   │   ├── Projects.tsx # 项目管理
│   │   │   ├── TestCases.tsx # 测试用例
│   │   │   ├── TestPlans.tsx # 测试计划
│   │   │   ├── TestExecutions.tsx # 测试执行
│   │   │   ├── Reports.tsx   # 测试报告
│   │   │   └── Devices.tsx  # 设备管理
│   │   ├── store/            # 状态管理
│   │   │   ├── index.ts     # Store配置
│   │   │   ├── hooks.ts     # Redux Hooks
│   │   │   ├── slices/      # Redux Slices
│   │   │   └── services/    # API服务
│   │   ├── App.tsx          # 根组件
│   │   └── main.tsx         # 入口文件
│   ├── package.json         # Node依赖
│   ├── tsconfig.json         # TypeScript配置
│   └── vite.config.ts       # Vite配置
│
├── cli/                      # CLI工具
│   ├── bin/
│   │   ├── qg.js            # CLI入口
│   │   ├── commands/        # 命令模块
│   │   │   ├── project.js   # 项目命令
│   │   │   ├── test-case.js # 测试用例命令
│   │   │   ├── test-plan.js # 测试计划命令
│   │   │   └── execution.js # 执行命令
│   │   └── utils/           # 工具函数
│   │       └── api.js       # API客户端
│   └── package.json
│
├── docs/                     # 文档
│   ├── ARCHITECTURE.md      # 架构设计
│   └── QUICKSTART.md        # 快速开始
│
├── docker-compose.yml        # Docker Compose配置
├── .gitignore               # Git忽略文件
├── README.md                # 项目说明
└── PROJECT_STRUCTURE.md     # 项目结构说明（本文件）

```

## 模块说明

### 后端模块

#### API层 (`app/api/v1/`)
- 提供RESTful API接口
- 按功能模块划分路由
- 统一的错误处理

#### 核心层 (`app/core/`)
- 应用配置管理
- 数据库连接管理
- Redis连接管理

#### 模型层 (`app/models/`)
- SQLAlchemy数据模型
- 数据库表定义
- 关系映射

#### 服务层 (`app/services/`)
- 业务逻辑封装
- 可复用的服务组件

#### 引擎层 (`app/engines/`)
- 测试执行引擎
- 支持多种测试类型
- 可扩展的引擎架构

### 前端模块

#### 页面 (`src/pages/`)
- 各个功能页面
- 路由配置

#### 组件 (`src/components/`)
- 可复用组件
- 布局组件

#### 状态管理 (`src/store/`)
- Redux状态管理
- API调用封装

### CLI工具

#### 命令 (`bin/commands/`)
- 按功能划分的命令模块
- 统一的API调用

## 数据流

1. **用户请求** → 前端/CLI → API接口
2. **API接口** → 服务层 → 数据模型
3. **服务层** → 测试引擎 → 执行测试
4. **执行结果** → 报告服务 → 存储 → 返回用户

## 扩展点

1. **新增测试引擎**: 继承 `BaseTestEngine`，在 `EngineFactory` 中注册
2. **新增API接口**: 在 `app/api/v1/` 中创建新路由文件
3. **新增前端页面**: 在 `src/pages/` 中创建，在 `App.tsx` 中配置路由
4. **新增CLI命令**: 在 `cli/bin/commands/` 中创建命令模块

