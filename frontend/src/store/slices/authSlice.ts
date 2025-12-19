import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authService, UserResponse, LoginRequest, RegisterRequest } from '../services/auth'

interface AuthState {
  user: UserResponse | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,
}

// 登录
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (data: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authService.login(data)
      // 保存token
      localStorage.setItem('token', response.access_token)
      localStorage.setItem('refreshToken', response.refresh_token)
      
      // 获取用户信息
      const user = await authService.getCurrentUser()
      return { token: response.access_token, refreshToken: response.refresh_token, user }
    } catch (error: any) {
      // 处理不同类型的错误
      let errorMessage = '登录失败'
      if (error.response) {
        // 服务器返回的错误
        const detail = error.response.data?.detail
        if (typeof detail === 'string') {
          errorMessage = detail
        } else if (Array.isArray(detail) && detail.length > 0) {
          // 处理验证错误数组
          errorMessage = detail.map((item: any) => item.msg || item.message).join(', ')
        } else if (detail?.message) {
          errorMessage = detail.message
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      return rejectWithValue(errorMessage)
    }
  }
)

// 注册
export const registerAsync = createAsyncThunk(
  'auth/register',
  async (data: RegisterRequest, { rejectWithValue }) => {
    try {
      const user = await authService.register(data)
      return user
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '注册失败')
    }
  }
)

// 获取当前用户
export const getCurrentUserAsync = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getCurrentUser()
      return user
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || '获取用户信息失败')
    }
  }
)

// 登出
export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout()
    } catch (error: any) {
      // 即使API调用失败也清除本地状态
      console.error('登出API调用失败:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setCredentials: (state, action: PayloadAction<{ token: string; refreshToken: string; user: UserResponse }>) => {
      state.token = action.payload.token
      state.refreshToken = action.payload.refreshToken
      state.user = action.payload.user
      state.isAuthenticated = true
      localStorage.setItem('token', action.payload.token)
      localStorage.setItem('refreshToken', action.payload.refreshToken)
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.refreshToken = null
      state.isAuthenticated = false
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
    },
  },
  extraReducers: (builder) => {
    // 登录
    builder
      .addCase(loginAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false
        state.token = action.payload.token
        state.refreshToken = action.payload.refreshToken
        state.user = action.payload.user
        state.isAuthenticated = true
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })

    // 注册
    builder
      .addCase(registerAsync.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(registerAsync.fulfilled, (state) => {
        state.loading = false
        // 注册成功后不自动登录，需要用户手动登录
      })
      .addCase(registerAsync.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // 获取当前用户
    builder
      .addCase(getCurrentUserAsync.pending, (state) => {
        // 获取用户信息时不改变认证状态
      })
      .addCase(getCurrentUserAsync.fulfilled, (state, action) => {
        state.user = action.payload
        state.isAuthenticated = true
      })
      .addCase(getCurrentUserAsync.rejected, (state, action) => {
        // 只有在明确是401错误时才清除认证状态
        const error = action.payload as any
        if (error?.response?.status === 401 || error?.status === 401) {
          state.user = null
          state.isAuthenticated = false
          state.token = null
          state.refreshToken = null
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
        }
      })

    // 登出
    builder
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.refreshToken = null
        state.isAuthenticated = false
      })
  },
})

export const { clearError, setCredentials, logout } = authSlice.actions
export default authSlice.reducer
