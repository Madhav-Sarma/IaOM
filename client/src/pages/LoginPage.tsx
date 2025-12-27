import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { LoginRequest, LoginResponse } from '../types/auth'

const initial: LoginRequest = { person_contact: '', password: '' }

export default function LoginPage() {
  const [form, setForm] = useState<LoginRequest>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', form)
      login(data.access_token, data.role || 'customer', data.user_id || 0, data.person_id, data.store_id || 0)
      // Route based on whether they have a package
      if (data.has_package) {
        navigate('/customers')
      } else {
        navigate('/buy')
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="panel">
      <h2>Login (Staff/Admin)</h2>
      {loading && <div className="status info">Logging in...</div>}
      {error && (
        <div className="status error">
          <strong>Login Failed</strong>
          <p>{error}</p>
        </div>
      )}
      <div className="form-grid">
        <label>Contact<input value={form.person_contact} onChange={(e)=>setForm({...form, person_contact:e.target.value})} placeholder="Enter your phone number" /></label>
        <label>Password<input type="password" value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} placeholder="Enter your password" /></label>
        <div className="actions full"><button onClick={submit} disabled={loading}>Login</button></div>
      </div>
    </div>
  )
}
