import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAppDispatch } from '../store/hooks'
import { setAuth } from '../store/authSlice'
import Loader from '../components/Loader'
import { useToast } from '../components/Toast'
import type { LoginRequest, LoginResponse } from '../types/auth'

const initial: LoginRequest = { person_contact: '', password: '' }

export default function LoginPage() {
  const [form, setForm] = useState<LoginRequest>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', form)
      dispatch(setAuth({
        token: data.access_token,
        userId: data.user_id || null,
        personId: data.person_id,
        storeId: data.store_id || null,
        role: (data.role as 'admin' | 'staff' | null) || null,
        isActive: data.is_active
      }))
      addToast('success', 'Login successful!')
      
      // Check if user is deactivated staff
      if (data.has_package && !data.is_active) {
        addToast('warning', 'Your account has been deactivated. Please contact your administrator or purchase a new package.')
        navigate('/buy')
      } else if (data.has_package) {
        navigate('/dashboard')
      } else {
        navigate('/buy')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Login failed'
      setError(msg)
      addToast('error', msg)
    } finally { setLoading(false) }
  }

  return (
    <div className="container px-3 py-4 py-md-5" style={{ marginTop: '56px' }}>
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-6 col-lg-4">
          <div className="card shadow">
            <div className="card-body p-3 p-md-4">
              <h3 className="card-title text-center mb-4">Login</h3>
              
              {loading && <Loader message="Logging in..." />}
              {error && (
                <div className="alert alert-danger">
                  <strong>Login Failed</strong>
                  <p className="mb-0">{error}</p>
                </div>
              )}
              
              <div className="mb-3">
                <label className="form-label">Contact</label>
                <input className="form-control" value={form.person_contact} onChange={(e)=>setForm({...form, person_contact:e.target.value})} placeholder="Enter your phone number" />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} placeholder="Enter your password" />
              </div>
              <button className="btn btn-primary w-100" onClick={submit} disabled={loading}>Login</button>
              
              <p className="text-center mt-3 mb-0">
                Don't have an account? <Link to="/signup">Sign Up</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
