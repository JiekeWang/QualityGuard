import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../services/api'

interface Project {
  id: number
  name: string
  description: string
  created_at: string
}

interface ProjectState {
  items: Project[]
  loading: boolean
  error: string | null
}

const initialState: ProjectState = {
  items: [],
  loading: false,
  error: null,
}

export const fetchProjects = createAsyncThunk(
  'projects/fetchProjects',
  async () => {
    const response = await api.get('/projects')
    return response.data.projects
  }
)

const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch projects'
      })
  },
})

export default projectSlice.reducer

