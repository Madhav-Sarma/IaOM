import { createContext, useContext, useState } from 'react'

export interface AuthState {
  token: string | null
  role: 'admin' | 'staff' | null
  userId: number | null
  personId: number | null
  personName: string | null
  storeId: number | null
  personContact: string | null
}

interface AuthContextType {
  auth: AuthState
  login: (token: string, role: string | null, userId: number | null, personId: number, personName: string, storeId: number | null, personContact?: string) => void
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
    const personName = localStorage.getItem('personName')
    const storeId = localStorage.getItem('storeId') ? parseInt(localStorage.getItem('storeId')!) : null
    const personContact = localStorage.getItem('personContact')
    return { token, role, userId, personId, personName, storeId, personContact }
  })

  const login = (token: string, role: string | null, userId: number | null, personId: number, personName: string, storeId: number | null, personContact?: string) => {
    setAuth({ token, role: role as 'admin' | 'staff' | null, userId, personId, personName, storeId, personContact: personContact || null })
    localStorage.setItem('token', token)
    if (role) localStorage.setItem('role', role)
    else localStorage.removeItem('role')
    if (userId) localStorage.setItem('userId', String(userId))
    else localStorage.removeItem('userId')
    localStorage.setItem('personId', String(personId))
    if (personName) localStorage.setItem('personName', personName)
    else localStorage.removeItem('personName')
    if (storeId) localStorage.setItem('storeId', String(storeId))
    else localStorage.removeItem('storeId')
    if (personContact) localStorage.setItem('personContact', personContact)
    else localStorage.removeItem('personContact')
  }

  const logout = () => {
    setAuth({ token: null, role: null, userId: null, personId: null, personName: null, storeId: null, personContact: null })
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('userId')
    localStorage.removeItem('personId')
    localStorage.removeItem('personName')
    localStorage.removeItem('storeId')
    localStorage.removeItem('personContact')
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
