import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { StoreProvider } from './context/StoreContext'
import ProtectedRoute from './components/ProtectedRoute'
import RoleProtectedRoute from './components/RoleProtectedRoute'
import NavBar from './components/NavBar'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import PackagesPage from './pages/PackagesPage'
import AdminDashboard from './pages/AdminDashboard'
import StaffDashboard from './pages/StaffDashboard'
import ProductsPage from './pages/ProductsPage'
import CustomersPage from './pages/CustomersPage'
import CreateStaffPage from './pages/CreateStaffPage'
import StaffPage from './pages/StaffPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailsPage from './pages/OrderDetailsPage'
import StoreSettingsPage from './pages/StoreSettingsPage'
import ProfilePage from './pages/ProfilePage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import StoreSetupPage from './pages/StoreSetupPage'

function DashboardRouter() {
  const { auth } = useAuth()
  
  if (auth.role === 'admin') {
    return <AdminDashboard />
  }
  return <StaffDashboard />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<Navigate to="/signup" replace />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected: Auth required */}
      <Route path="/buy" element={<ProtectedRoute><PackagesPage /></ProtectedRoute>} />
      <Route path="/store-setup" element={<ProtectedRoute><StoreSetupPage /></ProtectedRoute>} />

      {/* Protected: Role required (Admin & Staff) */}
      <Route
        path="/dashboard"
        element={
          <RoleProtectedRoute requiredRole="staff">
            <DashboardRouter />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <RoleProtectedRoute requiredRole="staff">
            <ProductsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <RoleProtectedRoute requiredRole="staff">
            <CustomersPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/customers/:contact"
        element={
          <RoleProtectedRoute requiredRole="staff">
            <CustomerDetailPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <RoleProtectedRoute requiredRole="staff">
            <OrdersPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/orders/:orderId"
        element={
          <RoleProtectedRoute requiredRole="staff">
            <OrderDetailsPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <RoleProtectedRoute requiredRole="staff">
            <ProfilePage />
          </RoleProtectedRoute>
        }
      />

      {/* Protected: Admin only */}
      <Route
        path="/staff"
        element={
          <RoleProtectedRoute requiredRole="admin">
            <CreateStaffPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/staff-list"
        element={
          <RoleProtectedRoute requiredRole="admin">
            <StaffPage />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/store-settings"
        element={
          <RoleProtectedRoute requiredRole="admin">
            <StoreSettingsPage />
          </RoleProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <BrowserRouter>
          <NavBar />
          <AppRoutes />
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  )
}
