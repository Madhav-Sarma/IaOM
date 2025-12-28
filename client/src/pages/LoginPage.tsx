import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/Loader'
import { useToast } from '../components/Toast'
import type { LoginRequest, LoginResponse } from '../types/auth'

const initial: LoginRequest = { person_contact: '', password: '' }

export default function LoginPage() {
  const [form, setForm] = useState<LoginRequest>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', form)
      login(data.access_token, data.role || null, data.user_id || null, data.person_id, data.person_name, data.store_id || null, form.person_contact)
      addToast('success', 'Login successful!')
      if (data.has_package) {
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
