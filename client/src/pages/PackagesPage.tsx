import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import type { BuyPackageResponse } from '../types/auth'
import './PackagesPage.css'

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
  const { auth, login } = useAuth()

  const handleBuyPackage = async (pkg: Package) => {
    if (!auth.personId) {
      alert('Person ID missing')
      return
    }

    // Get contact from form or re-fetch from API
    const contact = prompt('Enter your contact (phone) to confirm purchase:')
    if (!contact) return

    try {
      const { data } = await api.post<BuyPackageResponse>('/auth/buy-package', {
        person_contact: contact,
        store_name: `Store - ${pkg.name}`,
        store_address: 'Address to be updated'
      }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })

      // Update auth context with admin role
      login(data.access_token, 'admin', data.user_id, auth.personId, data.store_id)
      
      alert(`Package purchased! Welcome, Admin. You can now manage customers and staff.`)
      navigate('/customers')
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Purchase failed')
    }
  }

  return (
    <div className="packages-page">
      <h2>Choose Your Package</h2>
      <p className="subtitle">Upgrade your account to manage customers and staff</p>
      
      <div className="packages-grid">
        {packages.map((pkg) => (
          <div key={pkg.id} className="package-card">
            <div className="package-header">
              <h3>{pkg.name}</h3>
              <div className="price">
                <span className="amount">Rs.{pkg.cost}</span>
                <span className="period">/month</span>
              </div>
            </div>
            
            <p className="description">{pkg.description}</p>
            
            <ul className="features">
              {pkg.features.map((feature, idx) => (
                <li key={idx}>✓ {feature}</li>
              ))}
            </ul>
            
            <button 
              className="buy-btn"
              onClick={() => handleBuyPackage(pkg)}
            >
              {pkg.cost === 0 ? 'Get Free Pack' : `Buy Now - Rs.${pkg.cost}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
