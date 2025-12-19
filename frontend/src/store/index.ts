import { configureStore } from '@reduxjs/toolkit'
import projectSlice from './slices/projectSlice'
import authSlice from './slices/authSlice'

export const store = configureStore({
  reducer: {
    projects: projectSlice,
    auth: authSlice,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

