# 部署最佳实践

## 问题回顾：2025-12-18

### 发现的问题
在修复测试用例删除功能时，修改了 `backend/app/api/v1/test_cases.py`，但部署脚本只上传了 `test_executions.py`，导致代码没有真正更新到服务器。

### 问题根源
- **旧的部署方式**：硬编码单个文件路径
  ```powershell
  scp backend\app\api\v1\test_executions.py root@server:/path/to/file
  ```
- **问题**：每次修改新文件时，需要手动更新部署脚本，容易遗漏

### 解决方案
- **新的部署方式**：部署整个目录
  ```powershell
  scp -r backend/app/* root@server:/root/QualityGuard/backend/app/
  ```
- **优势**：
  - ✅ 自动包含所有修改的文件
  - ✅ 不需要维护文件列表
  - ✅ 不会遗漏任何文件
  - ✅ 支持新增文件和删除文件

---

## 部署脚本改进历史

### v1.0 - 初始版本（有问题）
```powershell
# 只上传单个文件
scp backend\app\api\v1\test_executions.py root@server:/path/
```
**问题**：遗漏其他修改的文件

### v2.0 - 手动添加文件（仍有问题）
```powershell
# 手动添加多个文件
scp backend\app\api\v1\test_executions.py root@server:/path/
scp backend\app\api\v1\test_cases.py root@server:/path/
```
**问题**：每次修改新文件都要更新脚本

### v3.0 - 目录同步（当前版本）✅
```powershell
# 同步整个目录
scp -r backend/app/* root@server:/root/QualityGuard/backend/app/
```
**优势**：自动部署所有变更

---

## 部署检查清单

### 部署前
- [ ] 确认本地代码已提交到版本控制
- [ ] 运行本地测试确保代码无误
- [ ] 检查 linter 是否有错误

### 部署中
- [ ] 前端构建成功
- [ ] 前端文件上传成功
- [ ] 后端文件上传成功
- [ ] 后端服务重启成功

### 部署后
- [ ] 检查服务器上的文件时间戳
- [ ] 检查后端服务状态（`systemctl status`）
- [ ] 查看后端日志确认无错误（`journalctl -u service -n 50`）
- [ ] 前端清除缓存并刷新
- [ ] 功能测试验证

---

## 验证部署是否成功

### 1. 验证文件是否上传
```bash
# SSH 到服务器
ssh root@server

# 检查文件时间戳（应该是最新的）
ls -lh /root/QualityGuard/backend/app/api/v1/test_cases.py

# 检查文件内容是否包含最新修改
grep -n "关键代码片段" /root/QualityGuard/backend/app/api/v1/test_cases.py
```

### 2. 验证服务是否正常
```bash
# 检查服务状态
systemctl status qualityguard-backend

# 查看最新日志
journalctl -u qualityguard-backend -n 50 --no-pager

# 检查是否有错误
journalctl -u qualityguard-backend -n 100 | grep -i error
```

### 3. 验证前端是否更新
1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 清空缓存并硬性重新加载
4. 检查加载的 JS/CSS 文件名是否是最新的

---

## 常见问题

### Q1: 部署后功能还是没更新？
**原因**：浏览器缓存  
**解决**：
1. 按 F12 打开开发者工具
2. 右键刷新按钮 → 选择"清空缓存并硬性重新加载"
3. 或者在 Application → Clear storage → 清除所有

### Q2: 后端服务启动失败？
**原因**：代码有语法错误或依赖问题  
**排查**：
```bash
# 查看详细错误日志
journalctl -u qualityguard-backend -n 100 --no-pager

# 手动启动查看错误
cd /root/QualityGuard/backend
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Q3: 如何确认某个文件是否被部署？
**方法**：
```bash
# 检查文件修改时间（应该是刚才的部署时间）
ssh root@server "stat /root/QualityGuard/backend/app/api/v1/test_cases.py"

# 或者比较文件内容
diff <(cat backend/app/api/v1/test_cases.py) \
     <(ssh root@server "cat /root/QualityGuard/backend/app/api/v1/test_cases.py")
```

---

## 未来改进方向

### 1. 使用 rsync（更高效）
```powershell
# rsync 只传输变化的文件，更快
rsync -avz --delete backend/app/ root@server:/root/QualityGuard/backend/app/
```

### 2. 集成 Git（版本控制）
```bash
# 在服务器上直接 pull 代码
ssh root@server "cd /root/QualityGuard && git pull && systemctl restart qualityguard-backend"
```

### 3. CI/CD 自动化
- 使用 GitHub Actions / GitLab CI
- 代码提交后自动测试、构建、部署
- 失败自动回滚

### 4. 蓝绿部署
- 维护两套环境
- 新版本部署到备用环境
- 测试通过后切换流量
- 出问题立即切回

---

## 总结

**核心原则**：
1. ✅ **自动化优于手动** - 减少人为错误
2. ✅ **全量部署优于增量** - 避免遗漏文件
3. ✅ **验证优于假设** - 部署后必须验证
4. ✅ **记录优于记忆** - 文档化所有步骤

**吸取的教训**：
- 永远不要硬编码单个文件路径
- 部署脚本应该是幂等的（多次执行结果相同）
- 每次部署后都要验证关键文件是否更新
- 保持部署脚本简单且健壮

