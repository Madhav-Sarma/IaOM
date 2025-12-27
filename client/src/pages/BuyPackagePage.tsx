import { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { BuyPackageRequest, BuyPackageResponse } from '../types/auth'

const initial: BuyPackageRequest = { person_contact: '', store_name: '', store_address: '' }

export default function BuyPackagePage() {
  const [form, setForm] = useState<BuyPackageRequest>(initial)
  const [result, setResult] = useState<BuyPackageResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { auth } = useAuth()

  const submit = async () => {
    setLoading(true); setError(null)
    try {
      const payload = { ...form }
      const { data } = await api.post<BuyPackageResponse>('/auth/buy-package', payload, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Buy package failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="panel">
      <h2>Upgrade Store (Admin)</h2>
      {loading && <div className="status info">Working...</div>}
      {error && <div className="status error">{error}</div>}
      <div className="form-grid">
        <label>Your Contact<input value={form.person_contact} onChange={(e)=>setForm({...form, person_contact:e.target.value})} /></label>
        <label>Store Name<input value={form.store_name} onChange={(e)=>setForm({...form, store_name:e.target.value})} /></label>
        <label className="full">Store Address<input value={form.store_address} onChange={(e)=>setForm({...form, store_address:e.target.value})} /></label>
        <div className="actions full"><button onClick={submit} disabled={loading}>Upgrade</button></div>
        {result && (
          <div className="result full">
            <h4>Upgrade complete</h4>
            <p>Store ID: {result.store_id}</p>
            <p>User ID (admin): {result.user_id}</p>
          </div>
        )}
      </div>
    </div>
  )
}
