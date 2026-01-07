# UI自动化功能部署总结

## 📋 部署清单

### ✅ 已完成的工作

1. **数据库模型**
   - ✅ `PageObject` 模型（页面对象）
   - ✅ `UIElement` 模型（UI元素）
   - ✅ 数据库迁移SQL脚本

2. **后端API**
   - ✅ `/api/v1/page-objects` - 页面对象CRUD
   - ✅ `/api/v1/ui-elements` - UI元素CRUD
   - ✅ 路由已注册到API系统

3. **UIEngine增强**
   - ✅ 支持多种操作（点击、输入、选择、拖拽等）
   - ✅ 支持多种断言（元素存在、文本匹配、URL验证等）
   - ✅ 支持截图、变量提取、脚本执行

4. **前端页面**
   - ✅ 页面对象库页面（列表、创建、编辑、删除）
   - ✅ 前端Service（pageObjectService, uiElementService）
   - ✅ 路由配置和菜单更新

## 🚀 快速部署步骤

### 1. 上传代码到服务器

```bash
# 确保所有新文件已提交
git add .
git commit -m "feat: 添加UI自动化功能（第一阶段MVP）"
git push

# 在服务器上拉取最新代码
cd /root/QualityGuard
git pull
```

### 2. 执行数据库迁移

```bash
cd /root/QualityGuard

# 方法1: 使用部署脚本（推荐）
chmod +x scripts/deploy-ui-automation.sh
./scripts/deploy-ui-automation.sh

# 方法2: 手动执行SQL
export PGPASSWORD=qualityguard123
psql -h localhost -U qualityguard -d qualityguard -f backend/migrations/create_page_objects_table.sql
psql -h localhost -U qualityguard -d qualityguard -f backend/migrations/create_ui_elements_table.sql
unset PGPASSWORD
```

### 3. 安装Playwright浏览器

```bash
cd /root/QualityGuard/backend
python3 -m playwright install chromium

# 如果需要安装系统依赖（CentOS/RHEL）
yum install -y nss atk at-spi2-atk libdrm libxkbcommon libxcomposite libxdamage libxrandr mesa-libgbm
```

### 4. 重启服务

```bash
# 重启后端服务
systemctl restart qualityguard-backend

# 检查服务状态
systemctl status qualityguard-backend

# 查看日志
journalctl -u qualityguard-backend -f
```

### 5. 重新构建前端（如果需要）

```bash
cd /root/QualityGuard/frontend
npm install
npm run build

# 如果使用Nginx，重启Nginx
systemctl restart nginx
```

## 🧪 测试验证

### 1. API测试

```bash
# 获取Token（先登录获取）
TOKEN="your_token_here"

# 测试页面对象API
curl -X GET "http://localhost:8000/api/v1/page-objects" \
  -H "Authorization: Bearer $TOKEN"

# 测试UI元素API
curl -X GET "http://localhost:8000/api/v1/ui-elements" \
  -H "Authorization: Bearer $TOKEN"
```

或使用测试脚本：
```bash
chmod +x scripts/test-ui-automation-api.sh
TOKEN=your_token ./scripts/test-ui-automation-api.sh
```

### 2. 前端测试

1. 访问：`http://your-domain/ui-automation/page-objects`
2. 验证页面是否正常加载
3. 尝试创建页面对象
4. 验证列表、编辑、删除功能

## 📝 功能说明

### 当前可用功能

1. **页面对象管理**
   - 创建页面对象（名称、URL、描述、项目关联）
   - 查看页面对象列表（支持项目筛选、搜索）
   - 编辑页面对象
   - 删除页面对象

2. **UI元素模型**
   - 数据库模型已创建
   - API接口已实现
   - 前端页面待开发

3. **UIEngine能力**
   - 支持多种浏览器操作
   - 支持多种断言类型
   - 支持截图和变量提取

### 待开发功能

1. **UI元素管理页面** - 在页面对象详情中管理元素
2. **UI测试用例页面** - 创建和编辑UI测试用例
3. **测试执行集成** - 将UI用例集成到执行框架
4. **执行报告展示** - 展示执行结果和截图

## ⚠️ 注意事项

1. **Playwright浏览器安装**
   - 必须在服务器上安装Playwright浏览器
   - 无头模式需要系统依赖库

2. **数据库迁移**
   - 迁移脚本会创建新表，不会影响现有数据
   - 建议在测试环境先验证

3. **前端构建**
   - 如果修改了前端代码，需要重新构建
   - 确保Nginx配置正确

4. **服务重启**
   - 修改后端代码后需要重启服务
   - 检查日志确认服务正常启动

## 🔍 故障排查

### 问题1: 数据库表不存在
```bash
# 检查表是否存在
psql -h localhost -U qualityguard -d qualityguard -c "\d page_objects"

# 如果不存在，执行迁移
psql -h localhost -U qualityguard -d qualityguard -f backend/migrations/create_page_objects_table.sql
```

### 问题2: Playwright错误
```bash
# 检查Playwright是否安装
python3 -c "import playwright; print(playwright.__version__)"

# 安装浏览器
python3 -m playwright install chromium

# 检查系统依赖
python3 -m playwright install-deps chromium
```

### 问题3: API返回500错误
```bash
# 查看后端日志
journalctl -u qualityguard-backend -n 100

# 检查模型导入
python3 -c "from app.models.page_object import PageObject; print('OK')"
```

### 问题4: 前端路由404
```bash
# 检查前端是否构建
ls -la frontend/dist/

# 检查Nginx配置
nginx -t

# 重启Nginx
systemctl restart nginx
```

## 📞 支持

如有问题，请检查：
1. 后端日志：`journalctl -u qualityguard-backend -f`
2. 前端控制台：浏览器开发者工具
3. 数据库连接：`psql -h localhost -U qualityguard -d qualityguard`

---

**部署完成后，请访问 `/ui-automation/page-objects` 测试功能！**

