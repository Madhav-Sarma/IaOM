import { createContext, useContext, useState } from 'react'

export interface AuthState {
  token: string | null
  role: 'admin' | 'staff' | null
  userId: number | null
  personId: number | null
  storeId: number | null
}

interface AuthContextType {
  auth: AuthState
  login: (token: string, role: string, userId: number, personId: number, storeId: number) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role') as 'admin' | 'staff' | null
    const userId = localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')!) : null
    const personId = localStorage.getItem('personId') ? parseInt(localStorage.getItem('personId')!) : null
    const storeId = localStorage.getItem('storeId') ? parseInt(localStorage.getItem('storeId')!) : null
    return { token, role, userId, personId, storeId }
  })

  const login = (token: string, role: string, userId: number, personId: number, storeId: number) => {
    setAuth({ token, role: role as 'admin' | 'staff', userId, personId, storeId })
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    localStorage.setItem('userId', String(userId))
    localStorage.setItem('personId', String(personId))
    localStorage.setItem('storeId', String(storeId))
  }

  const logout = () => {
    setAuth({ token: null, role: null, userId: null, personId: null, storeId: null })
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('userId')
    localStorage.removeItem('personId')
    localStorage.removeItem('storeId')
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout, isAuthenticated: !!auth.token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
