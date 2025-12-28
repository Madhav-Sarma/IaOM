import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { FiMenu, FiX } from 'react-icons/fi'

export default function NavBar() {
  const { isAuthenticated, auth } = useAuth()
  const { settings } = useStore()
  const [isMenuOpen, setIsMenuOpen] = useState(false)


  return (
    <nav className="navbar navbar-expand-md navbar-dark navbar-glass px-3 px-md-4 fixed-top" style={{ zIndex: 1030 }}>
      <Link to={isAuthenticated && auth.role ? '/dashboard' : '/'} className="navbar-brand fw-bold" style={{ marginLeft: auth.role ? '50px' : '0' }}>
        IaOM
      </Link>

      {/* Center store name */}
      <div className="position-absolute start-50 translate-middle-x d-none d-md-block">
        <span className="text-white fw-semibold">{settings?.store_name || 'Store'}</span>
      </div>
      
      {/* Mobile toggle for non-sidebar users */}
      {!auth.role && (
        <button
          className="navbar-toggler border-0"
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation"
        >
          {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      )}

      <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`}>
        <div className="ms-auto d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 gap-md-3 py-3 py-md-0">
          {!isAuthenticated ? (
            <>
              <Link to="/signup" className="btn btn-outline-light btn-sm w-100 w-md-auto" onClick={() => setIsMenuOpen(false)}>Signup</Link>
              <Link to="/login" className="btn btn-light btn-sm w-100 w-md-auto" onClick={() => setIsMenuOpen(false)}>Login</Link>
            </>
          ) : (
            <>
              {!auth.role && <Link to="/buy" className="btn btn-outline-light btn-sm" onClick={() => setIsMenuOpen(false)}>View Packages</Link>}
              {/* Store name for mobile */}
              <span className="text-white fw-semibold d-md-none">{settings?.store_name || 'Store'}</span>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
