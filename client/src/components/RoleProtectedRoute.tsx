import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

interface RoleProtectedRouteProps {
  children: ReactNode
  requiredRole: 'admin' | 'staff'
}

/**
 * RoleProtectedRoute ensures user has a valid role.
 * If user is authenticated but has NO role, redirect to /buy (Packages page).
 * If user doesn't have the required role, redirect to dashboard.
 */
export default function RoleProtectedRoute({
  children,
  requiredRole,
}: RoleProtectedRouteProps) {
  const { auth, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // User is authenticated but has no role - send them to pick a package
  if (!auth.role) {
    return <Navigate to="/buy" replace />
  }

  // User has a role, but it doesn't match the required role (and it's not admin accessing staff-only)
  if (requiredRole === 'admin' && auth.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
