# QualityGuard - 测试自动化平台

## 项目简介

QualityGuard 是一个企业级测试自动化平台，提供完整的测试管理、执行、报告和分析功能。

## 架构设计

### 分层架构

```
┌─────────────────────────────────────────────────┐
│                  用户界面层                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │Web Portal│ │CLI工具  │ │API接口  │          │
│  └─────────┘ └─────────┘ └─────────┘          │
└─────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────┐
│               应用服务层                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │测试管理 │ │任务调度 │ │报告服务 │          │
│  └─────────┘ └─────────┘ └─────────┘          │
└─────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────┐
│               测试引擎层                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │UI自动化 │ │API测试  │ │性能测试 │          │
│  └─────────┘ └─────────┘ └─────────┘          │
└─────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────┐
│               基础设施层                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │测试环境 │ │设备管理 │ │CI/CD集成│          │
│  └─────────┘ └─────────┘ └─────────┘          │
└─────────────────────────────────────────────────┘
```

## 技术栈

### 后端
- **框架**: FastAPI
- **数据库**: PostgreSQL + Redis
- **消息队列**: RabbitMQ
- **存储**: MinIO
- **ORM**: SQLAlchemy

### 前端
- **框架**: React + TypeScript
- **UI库**: Ant Design
- **状态管理**: Redux Toolkit
- **可视化**: ECharts

### 测试引擎
- **UI测试**: Playwright, Selenium, Appium
- **API测试**: Requests, httpx
- **性能测试**: Locust

### 基础设施
- **容器化**: Docker + Docker Compose
- **编排**: Kubernetes (可选)

## 项目结构

```
QualityGuard/
├── backend/                 # 后端服务
│   ├── app/
│   │   ├── api/            # API路由
│   │   ├── core/           # 核心配置
│   │   ├── models/         # 数据模型
│   │   ├── services/       # 业务服务
│   │   ├── engines/        # 测试引擎
│   │   └── utils/          # 工具函数
│   ├── tests/              # 测试代码
│   └── requirements.txt    # Python依赖
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── pages/          # 页面
│   │   ├── services/       # API服务
│   │   ├── store/          # 状态管理
│   │   └── utils/          # 工具函数
│   └── package.json
├── cli/                    # CLI工具
├── docker/                 # Docker配置
├── k8s/                    # Kubernetes配置
└── docs/                   # 文档

```

## 快速开始

### 环境要求
- Python 3.10+
- Node.js 18+
- Docker & Docker Compose
- Git

### 一键启动（推荐）

**Windows:**
```bash
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

### 手动启动

1. **启动基础设施**
```bash
docker-compose up -d
```

2. **配置并启动后端服务**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # 编辑.env文件配置
uvicorn app.main:app --reload
```

后端服务将在 http://localhost:8000 启动
API文档：http://localhost:8000/api/docs

3. **启动前端服务**
```bash
cd frontend
npm install
npm run dev
```

前端服务将在 http://localhost:3000 启动

### 访问地址

- **前端界面**: http://localhost:3000
- **API文档**: http://localhost:8000/api/docs
- **RabbitMQ管理**: http://localhost:15672 (qualityguard/qualityguard123)
- **MinIO控制台**: http://localhost:9001 (qualityguard/qualityguard123)

## 核心功能

- ✅ 测试用例管理
- ✅ 测试计划管理
- ✅ UI自动化测试
- ✅ API测试
- ✅ 性能测试
- ✅ 测试报告与分析
- ✅ 设备管理
- ✅ CI/CD集成

## 文档

- [架构设计](docs/ARCHITECTURE.md) - 系统架构和技术选型
- [快速开始](docs/QUICKSTART.md) - 详细安装和配置指南
- [项目结构](PROJECT_STRUCTURE.md) - 项目目录结构说明

## 开发指南

### 后端开发

```bash
cd backend
# 安装依赖
pip install -r requirements.txt

# 运行测试
pytest

# 代码格式化
black app/

# 启动开发服务器
uvicorn app.main:app --reload
```

### 前端开发

```bash
cd frontend
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### CLI工具开发

```bash
cd cli
# 安装依赖
npm install

# 链接到全局（开发时）
npm link

# 使用CLI
qg --help
```

## License

MIT

