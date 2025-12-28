import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { logout } from '../store/authSlice'
import type { RootState } from '../store/store'

interface Package {
  id: number
  name: string
  cost: number
  features: string[]
  description: string
}

const packages: Package[] = [
  {
    id: 1,
    name: 'Starter Pack',
    cost: 0,
    features: [
      'Unlimited customers',
      'Staff management',
      'Order tracking',
      'Basic analytics'
    ],
    description: 'Get started with our free starter pack to manage your store and team'
  }
]

export default function PackagesPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const personId = useAppSelector((state: RootState) => state.auth.personId)
  const isAuthenticated = useAppSelector((state: RootState) => state.auth.isAuthenticated)

  const handleBuyPackage = (pkg: Package) => {
    if (!personId) {
      alert('Please log in first')
      navigate('/login')
      return
    }

    // Navigate to store setup page with package info
    navigate('/store-setup', { state: { packageName: pkg.name, packageId: pkg.id } })
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="container px-3 py-4 py-md-5" style={{ marginTop: '56px' }}>
      <div className="text-center mb-4 mb-md-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="fw-bold mb-0">Choose Your Package</h2>
          {isAuthenticated && (
            <button 
              className="btn btn-outline-danger"
              onClick={handleLogout}
            >
              Logout
            </button>
          )}
        </div>
        <p className="text-muted">Upgrade your account to manage customers and staff</p>
      </div>
      
      <div className="row justify-content-center g-4">
        {packages.map((pkg) => (
          <div key={pkg.id} className="col-12 col-sm-10 col-md-6 col-lg-4">
            <div className="card shadow h-100">
              <div className="card-header text-center bg-primary text-white py-3">
                <h4 className="mb-0">{pkg.name}</h4>
              </div>
              <div className="card-body d-flex flex-column p-3 p-md-4">
                <div className="text-center mb-3">
                  <span className="display-5 display-md-4 fw-bold">Rs.{pkg.cost}</span>
                  <span className="text-muted">/month</span>
                </div>
                
                <p className="text-muted">{pkg.description}</p>
                
                <ul className="list-unstyled flex-grow-1">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx} className="mb-2">
                      <span className="text-success me-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <button 
                  className="btn btn-primary btn-lg w-100 mt-3"
                  onClick={() => handleBuyPackage(pkg)}
                >
                  {pkg.cost === 0 ? 'Get Free Pack' : `Buy Now - Rs.${pkg.cost}`}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
