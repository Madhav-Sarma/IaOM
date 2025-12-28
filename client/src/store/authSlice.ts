import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './store.ts'

interface AuthState {
  isAuthenticated: boolean
  token: string | null
  userId: number | null
  personId: number | null
  storeId: number | null
  role: 'admin' | 'staff' | null
  isActive: boolean
}

// Load initial state from localStorage
const loadAuthFromStorage = (): AuthState => {
  try {
    const savedAuth = localStorage.getItem('auth_state')
    if (savedAuth) {
      return JSON.parse(savedAuth)
    }
  } catch (error) {
    console.error('Failed to load auth from localStorage:', error)
  }
  return {
    isAuthenticated: false,
    token: null,
    userId: null,
    personId: null,
    storeId: null,
    role: null,
    isActive: true,
  }
}

const initialState: AuthState = loadAuthFromStorage()

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<Omit<AuthState, 'isAuthenticated'>>) => {
      state.token = action.payload.token
      state.userId = action.payload.userId
      state.personId = action.payload.personId
      state.storeId = action.payload.storeId
      state.role = action.payload.role
      state.isActive = action.payload.isActive
      state.isAuthenticated = !!action.payload.token
      // Persist to localStorage
      localStorage.setItem('auth_state', JSON.stringify(state))
    },
    logout: (state) => {
      state.isAuthenticated = false
      state.token = null
      state.userId = null
      state.personId = null
      state.storeId = null
      state.role = null
      state.isActive = true
      // Clear from localStorage
      localStorage.removeItem('auth_state')
    },
  },
})

export const { setAuth, logout } = authSlice.actions
export const selectAuth = (state: RootState) => ({
  isAuthenticated: state.auth.isAuthenticated,
  token: state.auth.token,
  userId: state.auth.userId,
  personId: state.auth.personId,
  storeId: state.auth.storeId,
  role: state.auth.role,
})
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated
export const selectToken = (state: RootState) => state.auth.token
export const selectRole = (state: RootState) => state.auth.role
export default authSlice.reducer
