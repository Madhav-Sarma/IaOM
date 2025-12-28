import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import Loader from '../components/Loader'
import { useToast } from '../components/Toast'
import type { SignupRequest, SignupResponse } from '../types/auth'

const initial: SignupRequest = { person_name: '', person_email: '', person_contact: '', person_address: '', password: '' }

export default function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<SignupRequest>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addToast } = useToast()

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      await api.post<SignupResponse>('/auth/signup', form)
      addToast('success', 'Account created! Redirecting to login...')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Signup failed'
      setError(msg)
      addToast('error', msg)
      setLoading(false)
    }
  }

  return (
    <div className="container px-3 py-4 py-md-5" style={{ marginTop: '56px' }}>
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-6">
          <div className="card shadow">
            <div className="card-body p-3 p-md-4">
              <h3 className="card-title text-center mb-4">Sign Up</h3>
              
              {loading && <Loader message="Creating account..." />}
              {error && <div className="alert alert-danger">{error}</div>}
              
              {!loading && (
                <>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Full Name</label>
                      <input className="form-control" value={form.person_name} onChange={(e)=>setForm({...form, person_name:e.target.value})} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Email</label>
                      <input className="form-control" type="email" value={form.person_email} onChange={(e)=>setForm({...form, person_email:e.target.value})} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Contact (Phone)</label>
                      <input className="form-control" value={form.person_contact} onChange={(e)=>setForm({...form, person_contact:e.target.value})} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">Address</label>
                      <input className="form-control" value={form.person_address} onChange={(e)=>setForm({...form, person_address:e.target.value})} />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Password</label>
                      <input className="form-control" type="password" value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} />
                    </div>
                    <div className="col-12">
                      <button className="btn btn-primary w-100" onClick={submit} disabled={loading}>
                        Create Account
                      </button>
                    </div>
                  </div>
                  <p className="text-center mt-3 mb-0">
                    Already have an account? <Link to="/login">Login</Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
