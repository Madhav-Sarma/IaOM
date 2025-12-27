import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { BuyPackageResponse } from '../types/auth'

interface StoreSetupForm {
  store_name: string
  store_address: string
}

export default function StoreSetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { auth, login } = useAuth()
  
  // Get package name from navigation state
  const packageName = location.state?.packageName || 'Starter Pack'
  
  const [form, setForm] = useState<StoreSetupForm>({
    store_name: '',
    store_address: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.store_name.trim()) {
      setError('Store name is required')
      return
    }
    if (!form.store_address.trim()) {
      setError('Store address is required')
      return
    }

    // Get person contact from auth context
    const personContact = auth.personContact
    if (!personContact) {
      setError('Session expired. Please login again.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data } = await api.post<BuyPackageResponse>('/auth/buy-package', {
        person_contact: personContact,
        store_name: form.store_name,
        store_address: form.store_address
      }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })

      // Update auth context with admin role
      login(data.access_token, 'admin', data.user_id, auth.personId!, auth.personName || '', data.store_id, personContact)
      
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create store')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container px-3 py-4 py-md-5" style={{ marginTop: '56px' }}>
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-6">
          <div className="card shadow">
            <div className="card-header bg-primary text-white text-center py-3">
              <h4 className="mb-1">Set Up Your Store</h4>
              <small>You selected: {packageName}</small>
            </div>
            <div className="card-body p-3 p-md-4">
              {error && <div className="alert alert-danger">{error}</div>}
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Store Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter your store name"
                    value={form.store_name}
                    onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                    required
                  />
                  <small className="text-muted">This will be displayed to your customers</small>
                </div>

                <div className="mb-4">
                  <label className="form-label">Store Address *</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Enter your store address"
                    value={form.store_address}
                    onChange={(e) => setForm({ ...form, store_address: e.target.value })}
                    required
                  />
                  <small className="text-muted">Full address including city and postal code</small>
                </div>

                <div className="d-grid gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creating Store...
                      </>
                    ) : (
                      'Complete Setup & Start Managing'
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={() => navigate('/buy')}
                    disabled={loading}
                  >
                    Back to Packages
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
