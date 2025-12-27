import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import NavBar from './components/NavBar'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import PackagesPage from './pages/PackagesPage'
import ProductsPage from './pages/ProductsPage'
import CustomersPage from './pages/CustomersPage'
import CreateStaffPage from './pages/CreateStaffPage'
import StaffPage from './pages/StaffPage'
import OrdersPage from './pages/OrdersPage'
import StoreSettingsPage from './pages/StoreSettingsPage'
import ProfilePage from './pages/ProfilePage'
import CustomerDetailPage from './pages/CustomerDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="page">
          <header className="hero">
            <div>
              <p className="eyebrow">Inventory & Order Management</p>
              <h1>Onboard stores, staff, and customers fast</h1>
              <p className="lede">Sign up, choose a package, then manage products, staff and customers.</p>
            </div>
            <div className="chip">Backend: FastAPI · Frontend: React + TS</div>
          </header>

          <NavBar />

          <section className="panel">
            <Routes>
              <Route path="/" element={<Navigate to="/signup" replace />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/buy" element={<ProtectedRoute><PackagesPage /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
              <Route path="/customers/:contact" element={<ProtectedRoute><CustomerDetailPage /></ProtectedRoute>} />
              <Route path="/staff" element={<ProtectedRoute><CreateStaffPage /></ProtectedRoute>} />
              <Route path="/staff-list" element={<ProtectedRoute><StaffPage /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
              <Route path="/store-settings" element={<ProtectedRoute><StoreSettingsPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            </Routes>
          </section>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
