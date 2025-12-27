import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './NavBar.css'

export default function NavBar() {
  const { isAuthenticated, auth, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="nav">
      <div className="brand">I&O Manager</div>
      <div className="links">
        {!isAuthenticated ? (
          <>
            <Link to="/signup">Signup</Link>
            <Link to="/login">Login</Link>
          </>
        ) : (
          <>
            {auth.role === 'admin' || auth.role === 'staff' ? (
              <>
                <Link to="/products">Products</Link>
                <Link to="/customers">Customers</Link>
                <Link to="/orders">Orders</Link>
                <Link to="/profile">Profile</Link>
                {auth.role === 'admin' && <Link to="/store-settings">Store Settings</Link>}
                {auth.role === 'admin' && <Link to="/staff">Create Staff</Link>}
                {auth.role === 'admin' && <Link to="/staff-list">View Staff</Link>}
              </>
            ) : (
              <Link to="/buy">View Packages</Link>
            )}
            <span className="user-info">{auth.role || 'customer'} • ID:{auth.userId || auth.personId}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </>
        )}
      </div>
    </nav>
  )
}
