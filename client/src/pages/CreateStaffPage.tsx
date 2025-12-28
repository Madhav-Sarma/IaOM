import { useState, useMemo } from 'react'
import { api } from '../api/client'
import { useAppSelector } from '../store/hooks'
import type { RootState } from '../store/store'
import DashboardLayout from '../components/DashboardLayout'
import type { CreateStaffRequest, CreateStaffResponse } from '../types/auth'

export default function CreateStaffPage() {
  const token = useAppSelector((state: RootState) => state.auth.token)
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])
  const [form, setForm] = useState<CreateStaffRequest>({ person_name:'', person_email:'', person_contact:'', person_address:'', password:'password' })
  const [result, setResult] = useState<CreateStaffResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extractError = (e: any, fallback: string) => {
    const detail = e?.response?.data?.detail
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg || d).join('; ')
    if (typeof detail === 'string') return detail
    return fallback
  }

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.post<CreateStaffResponse>('/auth/create-staff', form, { headers: authHeader })
      setResult(data)
    } catch (err:any) {
      setError(extractError(err, 'Create staff failed'))
    } finally { setLoading(false) }
  }

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        <h3 className="fw-bold mb-4">Create Staff (Admin)</h3>
        {loading && (
          <div className="alert alert-info d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
            Working...
          </div>
        )}
        {error && <div className="alert alert-danger">{error}</div>}
        
        <div className="card" style={{ maxWidth: 600 }}>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Full Name</label>
                <input className="form-control" value={form.person_name} onChange={(e)=>setForm({...form, person_name:e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input className="form-control" value={form.person_email} onChange={(e)=>setForm({...form, person_email:e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Contact (unique)</label>
                <input className="form-control" value={form.person_contact} onChange={(e)=>setForm({...form, person_contact:e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Password (optional)</label>
                <input className="form-control" value={form.password || ''} onChange={(e)=>setForm({...form, password:e.target.value})} />
              </div>
              <div className="col-12">
                <label className="form-label">Address</label>
                <input className="form-control" value={form.person_address} onChange={(e)=>setForm({...form, person_address:e.target.value})} />
              </div>
              <div className="col-12">
                <button className="btn btn-primary" onClick={submit} disabled={loading}>
                  Create Staff (requires admin login)
                </button>
              </div>
            </div>
            
            {result && (
              <div className="alert alert-success mt-3">
                <h5 className="alert-heading">Staff created</h5>
                <p className="mb-1">User ID: {result.user_id}</p>
                <p className="mb-1">Person ID: {result.person_id}</p>
                <hr />
                <p className="mb-0">Default password is "password" if not provided.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
