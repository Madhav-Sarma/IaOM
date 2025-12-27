import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { api } from '../api/client'
import { useAuth } from './AuthContext'
import type { StoreSettings } from '../types/store'

interface StoreContextType {
  currency: string
  settings: StoreSettings | null
  loading: boolean
  refresh: () => Promise<void>
}

const defaultCurrency = '₹'

const StoreContext = createContext<StoreContextType>({
  currency: defaultCurrency,
  settings: null,
  loading: true,
  refresh: async () => {}
})

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { auth, isAuthenticated } = useAuth()
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${auth.token}` }), [auth.token])

  const loadSettings = async () => {
    if (!isAuthenticated || !auth.storeId) {
      setLoading(false)
      return
    }
    try {
      const { data } = await api.get<StoreSettings>('/store/settings', { headers: authHeader })
      setSettings(data)
    } catch (e) {
      console.error('Failed to load store settings:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && auth.storeId) {
      loadSettings()
    } else {
      setSettings(null)
      setLoading(false)
    }
  }, [isAuthenticated, auth.storeId, auth.token])

  const currency = settings?.currency || defaultCurrency

  return (
    <StoreContext.Provider value={{ currency, settings, loading, refresh: loadSettings }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

// Helper function to format currency
export function formatCurrency(amount: number, currency: string): string {
  return `${currency}${amount.toFixed(2)}`
}
