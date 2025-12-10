# 快速开始指南

## 前置要求

- Python 3.10+
- Node.js 18+
- Docker & Docker Compose
- Git

## 1. 克隆项目

```bash
git clone <repository-url>
cd QualityGuard
```

## 2. 启动基础设施

```bash
docker-compose up -d
```

这将启动以下服务：
- PostgreSQL (端口 5432)
- Redis (端口 6379)
- RabbitMQ (端口 5672, 管理界面 15672)
- MinIO (端口 9000, 控制台 9001)

## 3. 配置后端

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 复制环境变量文件
cp .env.example .env

# 运行数据库迁移（可选，首次运行会自动创建表）
# alembic upgrade head

# 启动后端服务
uvicorn app.main:app --reload
```

后端服务将在 http://localhost:8000 启动
API文档：http://localhost:8000/api/docs

## 4. 配置前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务将在 http://localhost:3000 启动

## 5. 使用CLI工具

```bash
cd cli

# 安装依赖
npm install

# 链接到全局（可选）
npm link

# 使用CLI
qg project list
qg test-case list
qg test-plan execute <plan_id>
```

## 6. 访问服务

- **前端界面**: http://localhost:3000
- **API文档**: http://localhost:8000/api/docs
- **RabbitMQ管理**: http://localhost:15672 (用户名/密码: qualityguard/qualityguard123)
- **MinIO控制台**: http://localhost:9001 (用户名/密码: qualityguard/qualityguard123)

## 常见问题

### 端口冲突
如果端口被占用，可以修改 `docker-compose.yml` 中的端口映射。

### 数据库连接失败
确保 Docker 容器已启动：
```bash
docker-compose ps
```

### 前端代理问题
检查 `frontend/vite.config.ts` 中的代理配置。

## 下一步

- 查看 [架构文档](ARCHITECTURE.md)
- 阅读 [API文档](API.md)
- 了解 [开发指南](DEVELOPMENT.md)

