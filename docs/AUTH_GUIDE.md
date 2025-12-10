# 认证授权模块使用指南

## 概述

认证授权模块已完整实现，包括：
- ✅ 用户注册
- ✅ 用户登录（支持 OAuth2 和 JSON 格式）
- ✅ JWT Token 生成和验证
- ✅ Token 刷新机制
- ✅ 权限管理（普通用户、超级用户）
- ✅ 密码加密（bcrypt）

## API 端点

### 1. 用户注册

**POST** `/api/v1/auth/register`

**请求体：**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

**响应：**
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "is_active": true,
  "is_superuser": false,
  "created_at": "2025-01-27T10:00:00"
}
```

### 2. 用户登录（OAuth2 格式）

**POST** `/api/v1/auth/login`

**请求格式：** `application/x-www-form-urlencoded`

**参数：**
- `username`: 用户名或邮箱
- `password`: 密码

**响应：**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 3. 用户登录（JSON 格式）

**POST** `/api/v1/auth/login/json`

**请求体：**
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**响应：** 同 OAuth2 格式

### 4. 刷新访问令牌

**POST** `/api/v1/auth/refresh`

**请求体：**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**响应：**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 5. 获取当前用户信息

**GET** `/api/v1/auth/me`

**请求头：**
```
Authorization: Bearer <access_token>
```

**响应：**
```json
{
  "id": 1,
  "username": "testuser",
  "email": "test@example.com",
  "is_active": true,
  "is_superuser": false,
  "created_at": "2025-01-27T10:00:00"
}
```

### 6. 用户登出

**POST** `/api/v1/auth/logout`

**请求头：**
```
Authorization: Bearer <access_token>
```

**响应：**
```json
{
  "message": "登出成功"
}
```

## 用户管理 API

### 1. 获取用户列表（需要超级用户权限）

**GET** `/api/v1/users/?skip=0&limit=100`

**请求头：**
```
Authorization: Bearer <access_token>
```

### 2. 获取当前用户信息

**GET** `/api/v1/users/me`

**请求头：**
```
Authorization: Bearer <access_token>
```

### 3. 获取指定用户信息

**GET** `/api/v1/users/{user_id}`

**请求头：**
```
Authorization: Bearer <access_token>
```

**注意：** 只能查看自己的信息，除非是超级用户

### 4. 更新当前用户信息

**PUT** `/api/v1/users/me`

**请求头：**
```
Authorization: Bearer <access_token>
```

**请求体：**
```json
{
  "email": "newemail@example.com",
  "password": "newpassword123"
}
```

## 权限管理

### 依赖项

1. **`get_current_user`** - 获取当前登录用户（验证 token）
2. **`get_current_active_user`** - 获取当前激活的用户
3. **`get_current_superuser`** - 获取当前超级用户（需要超级用户权限）

### 使用示例

```python
from app.core.dependencies import get_current_active_user, get_current_superuser
from app.models.user import User

@router.get("/protected")
async def protected_route(
    current_user: User = Depends(get_current_active_user)
):
    """需要登录的接口"""
    return {"message": f"Hello, {current_user.username}"}

@router.get("/admin-only")
async def admin_route(
    current_user: User = Depends(get_current_superuser)
):
    """需要超级用户权限的接口"""
    return {"message": "Admin only"}
```

## 初始化管理员用户

运行初始化脚本创建默认管理员：

```bash
cd backend
python scripts/init_admin.py
```

默认管理员信息：
- 用户名：`admin`
- 密码：`admin123`
- ⚠️ **请及时修改默认密码！**

## Token 配置

在 `.env` 文件中配置：

```env
# JWT配置
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

## 安全特性

1. **密码加密**：使用 bcrypt 进行密码哈希
2. **JWT Token**：使用 HS256 算法签名
3. **Token 过期**：访问令牌 30 分钟过期，刷新令牌 7 天过期
4. **权限控制**：支持普通用户和超级用户权限
5. **账户状态**：支持禁用/启用用户账户

## 前端集成示例

### 登录

```typescript
const login = async (username: string, password: string) => {
  const response = await fetch('/api/v1/auth/login/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
  
  const data = await response.json();
  // 保存 token
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
};
```

### 使用 Token 请求

```typescript
const fetchWithAuth = async (url: string) => {
  const token = localStorage.getItem('access_token');
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (response.status === 401) {
    // Token 过期，尝试刷新
    await refreshToken();
    // 重试请求
  }
  
  return response.json();
};
```

### 刷新 Token

```typescript
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  
  const data = await response.json();
  localStorage.setItem('access_token', data.access_token);
};
```

## 错误处理

### 常见错误码

- `400` - 请求参数错误（如用户名已存在、邮箱已被注册）
- `401` - 未授权（token 无效或过期）
- `403` - 权限不足（账户被禁用、非超级用户）
- `404` - 资源不存在（用户不存在）

### 错误响应格式

```json
{
  "detail": "错误描述信息"
}
```

## 测试

使用 curl 测试：

```bash
# 注册用户
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'

# 登录
curl -X POST "http://localhost:8000/api/v1/auth/login/json" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123"}'

# 获取当前用户
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer <access_token>"
```

## 下一步

- [ ] 实现 Token 黑名单机制（Redis）
- [ ] 添加登录日志记录
- [ ] 实现密码重置功能
- [ ] 添加邮箱验证
- [ ] 实现多因素认证（MFA）

