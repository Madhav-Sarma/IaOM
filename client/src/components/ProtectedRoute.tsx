import { Navigate } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'
import type { RootState } from '../store/store'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppSelector((state: RootState) => state.auth.isAuthenticated)
  const isActive = useAppSelector((state: RootState) => state.auth.isActive)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (!isActive) {
    return <Navigate to="/buy" replace />
  }
  
  return <>{children}</>
}
