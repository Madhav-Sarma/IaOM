import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { logout } from '../store/authSlice'
import { api } from '../api/client'
import type { RootState } from '../store/store'
import {
  FiHome,
  FiPackage,
  FiUsers,
  FiShoppingCart,
  FiSettings,
  FiLogOut,
  FiMenu,
  FiX,
  FiUser,
} from 'react-icons/fi'

const menuItems = [
  { label: 'Dashboard', icon: FiHome, href: '/dashboard' },
  { label: 'Products', icon: FiPackage, href: '/products' },
  { label: 'Customers', icon: FiUsers, href: '/customers' },
  { label: 'Orders', icon: FiShoppingCart, href: '/orders' },
]

const adminMenuItems = [
  { label: 'Staff Management', icon: FiUsers, href: '/staff-list' },
  { label: 'Store Settings', icon: FiSettings, href: '/store-settings' },
]

export default function Sidebar() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((state: RootState) => state.auth.token)
  const role = useAppSelector((state: RootState) => state.auth.role)
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [displayName, setDisplayName] = useState<string | null>(null)

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  // Fetch name from profile if not in auth context
  useEffect(() => {
    if (token) {
      api.get('/auth/me', { headers: authHeader })
        .then(({ data }) => {
          if (data.person_name) {
            setDisplayName(data.person_name)
            localStorage.setItem('personName', data.person_name)
          }
        })
        .catch(() => {
          // Fallback to role if profile fetch fails
          setDisplayName(role === 'admin' ? 'Admin' : 'Staff')
        })
    }
  }, [token, authHeader, role])

  const handleLogout = () => {
    dispatch(logout())
  }

  const isActive = (href: string) => location.pathname === href

  if (!role) {
    return null
  }

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="btn btn-dark d-lg-none position-fixed"
        style={{ zIndex: 1051, top: '8px', left: '8px' }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <FiX size={20} /> : <FiMenu size={20} />}
      </button>

      {/* Sidebar overlay for mobile */}
      {isOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-lg-none"
          style={{ zIndex: 1040 }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar-glass text-white position-fixed start-0 d-flex flex-column transition-all ${isOpen ? 'translate-0' : 'd-none d-lg-flex'}`}
        style={{ width: '260px', zIndex: 1045, top: '56px', height: 'calc(100vh - 56px)' }}
      >
        <div className="p-3 border-bottom border-secondary">
          <small className="text-secondary">Inventory & Orders Management</small>
        </div>

        <nav className="flex-grow-1 p-3">
          <ul className="nav flex-column gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.href} className="nav-item">
                  <Link
                    to={item.href}
                    className={`nav-link d-flex align-items-center gap-2 ${
                      isActive(item.href) ? 'bg-primary text-white' : 'text-white-50'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          {role === 'admin' && (
            <>
              <hr className="border-secondary my-3" />
              <small className="text-secondary text-uppercase px-3">Admin</small>
              <ul className="nav flex-column gap-1 mt-2">
                {adminMenuItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.href} className="nav-item">
                      <Link
                        to={item.href}
                        className={`nav-link d-flex align-items-center gap-2 ${
                          isActive(item.href) ? 'bg-primary text-white' : 'text-white-50'
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </nav>

        <div className="p-3 border-top border-secondary">
          <div className="d-flex align-items-center gap-2 mb-3">
            <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
              {displayName ? displayName.charAt(0).toUpperCase() : (role === 'admin' ? 'A' : 'S')}
            </div>
            <div>
              <div className="small">{displayName || 'Loading...'}</div>
              <small className="text-secondary">{role?.toUpperCase()}</small>
            </div>
          </div>
          <Link to="/profile" className="btn btn-outline-light btn-sm w-100 mb-2 d-flex align-items-center justify-content-center gap-2">
            <FiUser size={16} />
            <span>Profile</span>
          </Link>
          <button
            className="btn btn-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={handleLogout}
          >
            <FiLogOut size={16} />
            <span className="text-white">Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}
