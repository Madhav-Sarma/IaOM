import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { SignupRequest, SignupResponse } from '../types/auth'

const initial: SignupRequest = { person_name: '', person_email: '', person_contact: '', person_address: '', password: '' }

export default function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<SignupRequest>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      await api.post<SignupResponse>('/auth/signup', form)
      // Auto-redirect to login after 1.5 seconds
      setTimeout(() => navigate('/login'), 1500)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Signup failed')
      setLoading(false)
    }
  }

  return (
    <div className="panel">
      <h2>Sign Up (Create Account)</h2>
      {loading && <div className="status info">✓ Account created! Redirecting to login...</div>}
      {error && <div className="status error">{error}</div>}
      {!loading && (
        <div className="form-grid">
          <label>Full Name<input value={form.person_name} onChange={(e)=>setForm({...form, person_name:e.target.value})} /></label>
          <label>Email<input type="email" value={form.person_email} onChange={(e)=>setForm({...form, person_email:e.target.value})} /></label>
          <label>Contact (Phone)<input value={form.person_contact} onChange={(e)=>setForm({...form, person_contact:e.target.value})} /></label>
          <label className="full">Address<input value={form.person_address} onChange={(e)=>setForm({...form, person_address:e.target.value})} /></label>
          <label className="full">Password<input type="password" value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} /></label>
          <div className="actions full"><button onClick={submit} disabled={loading}>Create Account</button></div>
        </div>
      )}
    </div>
  )
}
