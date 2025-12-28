import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api/client'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setSettings } from '../store/storeSlice'
import { setAuth } from '../store/authSlice'
import type { RootState } from '../store/store'
import type { BuyPackageResponse } from '../types/auth'

interface StoreSetupForm {
  store_name: string
  store_address: string
  currency: string
  low_stock_threshold: number
  restore_stock_on_cancel: boolean
}

export default function StoreSetupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const token = useAppSelector((state: RootState) => state.auth.token)
  const personId = useAppSelector((state: RootState) => state.auth.personId)
  
  // Get package name from navigation state
  const packageName = location.state?.packageName || 'Starter Pack'
  
  const [form, setForm] = useState<StoreSetupForm>({
    store_name: '',
    store_address: '',
    currency: '₹',
    low_stock_threshold: 10,
    restore_stock_on_cancel: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)

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

    setLoading(true)
    setError(null)

    try {
      if (!personId) {
        setError('Person ID not found. Please log in again.')
        setLoading(false)
        return
      }

      const { data } = await api.post<BuyPackageResponse>('/auth/buy-package', {
        person_id: personId,
        store_name: form.store_name,
        store_address: form.store_address
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Update auth context with admin role
      dispatch(setAuth({
        token: data.access_token,
        userId: data.user_id || null,
        personId: data.user_id || 0, // Use user_id as fallback since person_id is not returned
        storeId: data.store_id || null,
        role: 'admin',
        isActive: true
      }))
      dispatch(setSettings({ 
        store_name: form.store_name, 
        currency: form.currency,
        store_address: form.store_address,
        low_stock_threshold: form.low_stock_threshold,
        restore_stock_on_cancel: form.restore_stock_on_cancel,
        sales_lookback_days: 30,
        reorder_horizon_days: 14
      }))
      
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
        <div className="col-12 col-lg-8">
          {/* Progress Steps */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className={`flex-fill text-center ${currentStep >= 1 ? 'text-primary fw-bold' : 'text-muted'}`}>
                <div className={`rounded-circle d-inline-flex align-items-center justify-content-center ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-light'}`} style={{ width: '40px', height: '40px' }}>
                  {currentStep > 1 ? '✓' : '1'}
                </div>
                <div className="small mt-1">Store Details</div>
              </div>
              <div className={`flex-fill border-top ${currentStep >= 2 ? 'border-primary' : 'border-secondary'}`} style={{ marginTop: '-20px' }}></div>
              <div className={`flex-fill text-center ${currentStep >= 2 ? 'text-primary fw-bold' : 'text-muted'}`}>
                <div className={`rounded-circle d-inline-flex align-items-center justify-content-center ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-light'}`} style={{ width: '40px', height: '40px' }}>
                  {currentStep > 2 ? '✓' : '2'}
                </div>
                <div className="small mt-1">Settings</div>
              </div>
              <div className={`flex-fill border-top ${currentStep >= 3 ? 'border-primary' : 'border-secondary'}`} style={{ marginTop: '-20px' }}></div>
              <div className={`flex-fill text-center ${currentStep >= 3 ? 'text-primary fw-bold' : 'text-muted'}`}>
                <div className={`rounded-circle d-inline-flex align-items-center justify-content-center ${currentStep >= 3 ? 'bg-primary text-white' : 'bg-light'}`} style={{ width: '40px', height: '40px' }}>
                  3
                </div>
                <div className="small mt-1">Review</div>
              </div>
            </div>
          </div>

          <div className="card shadow-lg">
            <div className="card-header bg-primary text-white text-center py-4">
              <h3 className="mb-1">Set Up Your Store</h3>
              <small className="opacity-75">Package: {packageName}</small>
            </div>
            <div className="card-body p-4">
              {error && <div className="alert alert-danger">{error}</div>}
              
              <form onSubmit={handleSubmit}>
                {/* Step 1: Store Details */}
                {currentStep === 1 && (
                  <div className="animate-fade-in">
                    <h5 className="mb-3">Store Information</h5>
                    <div className="mb-4">
                      <label className="form-label fw-semibold">Store Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-lg"
                        placeholder="e.g., Tech Store, Fashion Hub"
                        value={form.store_name}
                        onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                        required
                      />
                      <small className="text-muted">This name will be displayed on invoices and reports</small>
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Store Address *</label>
                      <textarea
                        className="form-control form-control-lg"
                        rows={4}
                        placeholder="Street address, City, State, Postal Code"
                        value={form.store_address}
                        onChange={(e) => setForm({ ...form, store_address: e.target.value })}
                        required
                      />
                      <small className="text-muted">Full address helps with shipping and customer communication</small>
                    </div>

                    <div className="d-grid gap-2">
                      <button 
                        type="button" 
                        className="btn btn-primary btn-lg"
                        onClick={() => {
                          if (!form.store_name.trim()) {
                            setError('Store name is required')
                            return
                          }
                          if (!form.store_address.trim()) {
                            setError('Store address is required')
                            return
                          }
                          setError(null)
                          setCurrentStep(2)
                        }}
                      >
                        Next: Configure Settings
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/buy')}
                      >
                        Back to Packages
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                  <div className="animate-fade-in">
                    <h5 className="mb-3">Store Settings</h5>
                    <div className="mb-4">
                      <label className="form-label fw-semibold">Currency Symbol *</label>
                      <div className="row">
                        <div className="col-md-6">
                          <input
                            type="text"
                            className="form-control form-control-lg"
                            placeholder="₹"
                            value={form.currency}
                            onChange={(e) => setForm({ ...form, currency: e.target.value })}
                            maxLength={5}
                            required
                          />
                          <small className="text-muted">E.g., $, €, £, ₹, ¥</small>
                        </div>
                        <div className="col-md-6 d-flex align-items-center mt-3 mt-md-0">
                          <div className="alert alert-info mb-0 w-100 py-2">
                            <small>Preview: <strong>{form.currency}1,234.56</strong></small>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Low Stock Alert Threshold</label>
                      <input
                        type="number"
                        className="form-control form-control-lg"
                        min={1}
                        max={1000}
                        value={form.low_stock_threshold}
                        onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })}
                      />
                      <small className="text-muted">Get notified when product stock falls below this number</small>
                    </div>

                    <div className="mb-4">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="restoreStock"
                          checked={form.restore_stock_on_cancel}
                          onChange={(e) => setForm({ ...form, restore_stock_on_cancel: e.target.checked })}
                          style={{ width: '3em', height: '1.5em', cursor: 'pointer' }}
                        />
                        <label className="form-check-label fw-semibold ms-2" htmlFor="restoreStock" style={{ cursor: 'pointer' }}>
                          Restore stock when order is cancelled
                        </label>
                      </div>
                      <small className="text-muted ms-5">Automatically add items back to inventory on cancellation</small>
                    </div>

                    <div className="d-grid gap-2">
                      <button 
                        type="button" 
                        className="btn btn-primary btn-lg"
                        onClick={() => setCurrentStep(3)}
                      >
                        Next: Review & Finish
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary"
                        onClick={() => setCurrentStep(1)}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Review */}
                {currentStep === 3 && (
                  <div className="animate-fade-in">
                    <h5 className="mb-4">Review Your Store Setup</h5>
                    
                    <div className="card bg-light mb-3">
                      <div className="card-body">
                        <h6 className="text-primary mb-3">Store Details</h6>
                        <div className="row mb-2">
                          <div className="col-4 text-muted">Name:</div>
                          <div className="col-8 fw-semibold">{form.store_name}</div>
                        </div>
                        <div className="row">
                          <div className="col-4 text-muted">Address:</div>
                          <div className="col-8">{form.store_address}</div>
                        </div>
                      </div>
                    </div>

                    <div className="card bg-light mb-4">
                      <div className="card-body">
                        <h6 className="text-primary mb-3">Settings</h6>
                        <div className="row mb-2">
                          <div className="col-4 text-muted">Currency:</div>
                          <div className="col-8 fw-semibold">{form.currency}</div>
                        </div>
                        <div className="row mb-2">
                          <div className="col-4 text-muted">Low Stock Alert:</div>
                          <div className="col-8">{form.low_stock_threshold} units</div>
                        </div>
                        <div className="row">
                          <div className="col-4 text-muted">Restore on Cancel:</div>
                          <div className="col-8">{form.restore_stock_on_cancel ? 'Yes' : 'No'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="alert alert-info">
                      <strong>💡 Pro Tip:</strong> You can change these settings anytime from the Store Settings page in your dashboard.
                    </div>

                    <div className="d-grid gap-2">
                      <button 
                        type="submit" 
                        className="btn btn-success btn-lg"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Creating Your Store...
                          </>
                        ) : (
                          <>
                            🚀 Complete Setup & Start Managing
                          </>
                        )}
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-outline-secondary"
                        onClick={() => setCurrentStep(2)}
                        disabled={loading}
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Help Text */}
          {currentStep === 1 && (
            <div className="text-center mt-4">
              <small className="text-muted">
                Need help? All settings can be modified later from your dashboard
              </small>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
