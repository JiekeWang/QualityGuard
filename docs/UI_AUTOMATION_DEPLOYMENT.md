# UI自动化功能部署指南

## 部署前检查清单

### 1. 代码检查
- ✅ 数据库模型已创建（PageObject, UIElement）
- ✅ 后端API路由已注册（/api/v1/page-objects, /api/v1/ui-elements）
- ✅ UIEngine已完善（支持多种操作和断言）
- ✅ 前端页面已创建（页面对象库）
- ✅ 前端路由已配置

### 2. 依赖检查
- ✅ Playwright已在requirements.txt中（playwright==1.40.0）
- ⚠️ 需要安装Playwright浏览器：`playwright install`

### 3. 数据库迁移
- ✅ 已创建迁移脚本：
  - `backend/migrations/create_page_objects_table.sql`
  - `backend/migrations/create_ui_elements_table.sql`

## 部署步骤

### 步骤 1: 应用数据库迁移

#### 方法1: 使用迁移脚本（推荐）
```bash
cd backend/migrations
chmod +x apply_ui_automation_migrations.sh
./apply_ui_automation_migrations.sh
```

#### 方法2: 手动执行SQL
```bash
# 连接到PostgreSQL
psql -h localhost -U qualityguard -d qualityguard

# 执行迁移脚本
\i backend/migrations/create_page_objects_table.sql
\i backend/migrations/create_ui_elements_table.sql
```

#### 方法3: 使用psql命令行
```bash
export PGPASSWORD=qualityguard123
psql -h localhost -U qualityguard -d qualityguard -f backend/migrations/create_page_objects_table.sql
psql -h localhost -U qualityguard -d qualityguard -f backend/migrations/create_ui_elements_table.sql
unset PGPASSWORD
```

### 步骤 2: 安装Playwright浏览器

Playwright需要安装浏览器二进制文件：

```bash
cd backend
python3 -m playwright install
# 或者
python3 -m playwright install chromium firefox webkit
```

**注意**: 如果服务器没有图形界面，需要安装系统依赖：
```bash
# CentOS/RHEL
yum install -y nss atk at-spi2-atk libdrm libxkbcommon libxcomposite libxdamage libxrandr mesa-libgbm

# Ubuntu/Debian
apt-get update
apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1
```

### 步骤 3: 重启后端服务

```bash
# 如果使用systemd
systemctl restart qualityguard-backend

# 或者如果使用Docker
docker-compose restart backend

# 或者如果直接运行
# 停止当前进程，然后重新启动
```

### 步骤 4: 验证部署

#### 检查API是否可用
```bash
# 测试页面对象API
curl -X GET "http://localhost:8000/api/v1/page-objects" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 测试UI元素API
curl -X GET "http://localhost:8000/api/v1/ui-elements" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 检查前端页面
1. 访问 `http://your-domain/ui-automation/page-objects`
2. 验证页面对象列表是否正常显示
3. 尝试创建、编辑、删除页面对象

## 常见问题排查

### 1. 数据库表不存在
**错误**: `relation "page_objects" does not exist`

**解决**: 执行数据库迁移脚本

### 2. Playwright浏览器未安装
**错误**: `Executable doesn't exist`

**解决**: 运行 `python3 -m playwright install`

### 3. 前端路由404
**错误**: 访问页面显示404

**解决**: 
- 检查前端是否已重新构建
- 检查Nginx配置是否正确
- 检查路由配置是否正确

### 4. API返回500错误
**错误**: Internal Server Error

**解决**:
- 检查后端日志：`journalctl -u qualityguard-backend -f`
- 检查数据库连接
- 检查模型导入是否正确

## 测试功能

### 1. 创建页面对象
1. 访问页面对象库页面
2. 点击"新建页面对象"
3. 填写信息：
   - 页面对象名称：测试页面
   - URL：https://example.com
   - 选择项目
4. 点击确定

### 2. 查看页面对象列表
- 验证列表是否显示新创建的页面对象
- 验证筛选功能（按项目、搜索）

### 3. 编辑页面对象
- 点击编辑按钮
- 修改信息
- 保存

### 4. 删除页面对象
- 点击删除按钮
- 确认删除

## 后续功能开发

当前已完成：
- ✅ 页面对象库（基础CRUD）
- ✅ UI元素模型（数据库）
- ✅ UIEngine增强

待开发：
- ⏳ UI元素管理页面
- ⏳ UI测试用例页面
- ⏳ 测试执行集成
- ⏳ 执行报告展示

## 回滚步骤

如果需要回滚：

```bash
# 删除表（谨慎操作，会丢失数据）
psql -h localhost -U qualityguard -d qualityguard << EOF
DROP TABLE IF EXISTS ui_elements CASCADE;
DROP TABLE IF EXISTS page_objects CASCADE;
EOF
```

