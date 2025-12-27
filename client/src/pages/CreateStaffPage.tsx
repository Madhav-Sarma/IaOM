import { useState } from 'react'
import { api } from '../api/client'
import type { CreateStaffRequest, CreateStaffResponse } from '../types/auth'

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

export default function CreateStaffPage() {
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
      const { data } = await api.post<CreateStaffResponse>('/auth/create-staff', form, { headers: authHeader() })
      setResult(data)
    } catch (err:any) {
      setError(extractError(err, 'Create staff failed'))
    } finally { setLoading(false) }
  }

  return (
    <div className="panel">
      <h2>Create Staff (Admin)</h2>
      {loading && <div className="status info">Working...</div>}
      {error && <div className="status error">{error}</div>}
      <div className="form-grid">
        <label>Full Name<input value={form.person_name} onChange={(e)=>setForm({...form, person_name:e.target.value})} /></label>
        <label>Email<input value={form.person_email} onChange={(e)=>setForm({...form, person_email:e.target.value})} /></label>
        <label>Contact (unique)<input value={form.person_contact} onChange={(e)=>setForm({...form, person_contact:e.target.value})} /></label>
        <label className="full">Address<input value={form.person_address} onChange={(e)=>setForm({...form, person_address:e.target.value})} /></label>
        <label className="full">Password (optional)<input value={form.password || ''} onChange={(e)=>setForm({...form, password:e.target.value})} /></label>
        <div className="actions full"><button onClick={submit}>Create staff (requires admin login)</button></div>
        {result && (
          <div className="result full">
            <h4>Staff created</h4>
            <p>User ID: {result.user_id}</p>
            <p>Person ID: {result.person_id}</p>
            <p>Default password is "password" if not provided.</p>
          </div>
        )}
      </div>
    </div>
  )
}
