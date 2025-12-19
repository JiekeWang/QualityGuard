# 一键导入 Token 配置指南

## 超简单！3步完成

不需要手写 JSON，只需复制粘贴 cURL 命令，系统自动生成配置。

## 操作步骤

### 步骤1：获取 A 接口的 cURL 命令

**方法1：从浏览器开发者工具复制**

1. 打开浏览器，按 F12 打开开发者工具
2. 切换到 **Network（网络）** 标签页
3. 在网页中执行登录操作（调用 A 接口）
4. 在 Network 面板中找到登录请求
5. **右键点击请求** → **Copy（复制）** → **Copy as cURL**

**方法2：从 Postman/Apipost 导出**

1. 在 Postman 中打开 A 接口请求
2. 点击右侧的 **Code（代码）** 按钮
3. 选择 **cURL**
4. 点击 **Copy（复制）**

### 步骤2：在系统中导入 cURL

1. **打开测试用例编辑窗口**
2. **切换到"高级配置" Tab**
3. **点击"从 cURL 导入 Token 配置"按钮**
4. **粘贴 cURL 命令**
5. **输入 Token 的 JSONPath 路径**（如 `$.data.token`）
6. **点击确定**

### 步骤3：配置业务接口使用 Token

在"请求配置" Tab 中，使用 `${token}` 引用：

```json
{
  "headers": {
    "Authorization": "Bearer ${token}"
  }
}
```

完成！系统会自动管理 Token 的获取和刷新。

## 示例

### cURL 命令示例

```bash
curl 'https://aresassistant.linkedcare.cn/Home/Login' \
  -H 'Content-Type: application/json' \
  --data-raw '{"username":"admin","password":"123456"}'
```

### 生成的配置

系统会自动生成：

```json
{
  "token_config": {
    "url": "https://aresassistant.linkedcare.cn/Home/Login",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "username": "admin",
      "password": "123456"
    },
    "extractors": [
      {
        "name": "token",
        "type": "json",
        "path": "$.data.token"
      }
    ],
    "retry_status_codes": [401, 403]
  }
}
```

## 常见 JSONPath 路径

根据 A 接口的响应格式，选择正确的 JSONPath：

| 响应格式 | JSONPath | 说明 |
|---------|----------|------|
| `{"data": {"token": "..."}}` | `$.data.token` | 最常见 |
| `{"token": "..."}` | `$.token` | token 在根节点 |
| `{"access_token": "..."}` | `$.access_token` | OAuth 格式 |
| `{"result": {"accessToken": "..."}}` | `$.result.accessToken` | 自定义格式 |

## 查看实际响应格式

### 方法1：浏览器开发者工具

1. F12 打开开发者工具
2. Network 标签页找到登录请求
3. 点击请求，查看 **Response（响应）** 标签页
4. 找到 token 字段的位置

### 方法2：Postman/Apipost

1. 发送请求
2. 查看响应 Body
3. 找到 token 字段的位置

## 完整流程示例

### 您的场景

**A 接口（获取 Token）**
```
https://aresassistant.linkedcare.cn/Home/Login
```

**B 接口（业务接口）**
```
http://aresassistant.lctest.cn/api/workflow/execute
```

### 操作步骤

1. **在浏览器中登录**
   - 打开 https://aresassistant.linkedcare.cn
   - F12 打开开发者工具
   - 执行登录
   - 复制登录请求的 cURL

2. **在系统中导入**
   - 打开测试用例编辑窗口
   - 切换到"高级配置" Tab
   - 点击"从 cURL 导入 Token 配置"
   - 粘贴 cURL 命令
   - 输入 Token 路径（如 `$.data.token`）

3. **配置业务接口**
   - 切换到"请求配置" Tab
   - 配置 B 接口：
   ```json
   {
     "method": "POST",
     "path": "http://aresassistant.lctest.cn/api/workflow/execute",
     "headers": {
       "Authorization": "Bearer ${token}"
     },
     "body": {
       "WorkflowName": "咬合重建-弹窗提醒",
       "WorkflowVersion": 13502,
       "ItemParameterDict": {
         "OrthoDiagnosis": {
           "Codes": ["CI-Il-bony"]
         }
       }
     }
   }
   ```

4. **执行测试**
   - 点击"确定"保存
   - 点击"执行"按钮
   - 查看日志，确认 Token 自动获取和使用

## 自动刷新机制

配置完成后，系统会自动：

1. ✅ **首次执行**：调用 A 接口获取 token
2. ✅ **使用 token**：在 B 接口请求中自动替换
3. ✅ **检测失效**：如果 B 接口返回 401
4. ✅ **自动刷新**：重新调用 A 接口获取新 token
5. ✅ **自动重试**：用新 token 重试 B 接口

全程自动，无需手动干预！

## 故障排查

### 问题1：找不到"从 cURL 导入 Token 配置"按钮

**解决方法**：
1. 刷新浏览器（Ctrl+F5）
2. 确保在测试用例编辑窗口的"高级配置" Tab

### 问题2：导入后提示"解析失败"

**可能原因**：
- cURL 命令格式不正确
- 缺少关键信息（如 URL）

**解决方法**：
1. 确保复制的是完整的 cURL 命令
2. 检查命令中是否包含 URL
3. 尝试重新从浏览器复制

### 问题3：Token 未生效

**可能原因**：
- JSONPath 路径错误
- Token 字段名不匹配

**解决方法**：
1. 查看 A 接口的实际响应
2. 确认 Token 的 JSONPath 路径
3. 重新导入并输入正确的路径

### 问题4：仍然返回 401

**可能原因**：
- Authorization 头格式不对
- Token 本身无效

**解决方法**：
1. 确认 B 接口要求的 Token 格式：
   - `Bearer ${token}` （最常见）
   - `${token}` （直接使用）
   - 其他自定义格式
2. 手动测试 A 接口，确认返回的 Token 可用

## 高级技巧

### 1. 导入后修改配置

导入后，配置会出现在"高级配置（JSON）"文本框中，您可以：
- 修改 username/password
- 调整 JSONPath 路径
- 添加更多 headers
- 修改触发刷新的状态码

### 2. 提取多个字段

如果需要提取多个字段（如 token 和 userId），可以手动修改：

```json
{
  "token_config": {
    ...
    "extractors": [
      {
        "name": "token",
        "type": "json",
        "path": "$.data.token"
      },
      {
        "name": "userId",
        "type": "json",
        "path": "$.data.user.id"
      }
    ]
  }
}
```

### 3. 不同环境使用不同配置

为不同环境（开发、测试、生产）创建不同的测试用例，每个用例配置对应环境的 Token 接口。

## 总结

使用一键导入功能，您可以：

- ✅ **3步完成配置**（复制 → 导入 → 执行）
- ✅ **无需手写 JSON**（系统自动生成）
- ✅ **自动管理 Token**（获取、刷新、重试）
- ✅ **提高效率**（节省 90% 配置时间）

现在就试试吧！如有问题，查看执行日志或联系技术支持。

