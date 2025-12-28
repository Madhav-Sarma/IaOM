import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './store.ts'
import type { StoreSettings } from '../types/store'

interface StoreState {
  settings: StoreSettings | null
  loading: boolean
  currency: string
}

const initialState: StoreState = {
  settings: null,
  loading: true,
  currency: '₹',
}

export const storeSlice = createSlice({
  name: 'store',
  initialState,
  reducers: {
    setSettings: (state, action: PayloadAction<StoreSettings>) => {
      state.settings = action.payload
      state.currency = action.payload.currency || '₹'
      state.loading = false
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    clearSettings: (state) => {
      state.settings = null
      state.currency = '₹'
      state.loading = false
    },
  },
})

export const { setSettings, setLoading, clearSettings } = storeSlice.actions
export const selectSettings = (state: RootState) => state.store.settings
export const selectCurrency = (state: RootState) => state.store.currency
export const selectStoreLoading = (state: RootState) => state.store.loading
export default storeSlice.reducer
