import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { logout } from '../store/authSlice'
import type { RootState } from '../store/store'
import DashboardLayout from '../components/DashboardLayout'
import type { Profile, ProfileUpdate } from '../types/profile'

export default function ProfilePage() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((state: RootState) => state.auth.token)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState<ProfileUpdate>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('')

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get<Profile>('/auth/me', { headers: authHeader })
      setProfile(data)
      setForm({
        person_name: data.person_name,
        person_email: data.person_email,
        person_address: data.person_address,
      })
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load profile')
      if (e?.response?.status === 401) dispatch(logout())
    } finally {
      setLoading(false)
    }
  }

  const onChange = (field: keyof ProfileUpdate, value: any) => {
    setForm({ ...form, [field]: value })
  }

  const save = async () => {
    setSaving(true); setError(null); setMessage('')
    try {
      const payload: ProfileUpdate = { ...form }
      if (!payload.password) delete payload.password
      const { data } = await api.put<Profile>('/auth/me', payload, { headers: authHeader })
      setProfile(data)
      setMessage('Profile updated')
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to update profile')
      if (e?.response?.status === 401) dispatch(logout())
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        <h3 className="fw-bold mb-4">My Profile</h3>
        {loading && (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        )}
        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {profile && (
          <div className="card" style={{ maxWidth: 500 }}>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input className="form-control" value={form.person_name || ''} onChange={e => onChange('person_name', e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={form.person_email || ''} onChange={e => onChange('person_email', e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label">Address</label>
                <input className="form-control" value={form.person_address || ''} onChange={e => onChange('person_address', e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label">New Password (optional)</label>
                <input className="form-control" type="password" value={form.password || ''} onChange={e => onChange('password', e.target.value)} />
              </div>

              <div className="d-flex gap-3 align-items-center">
                <button className="btn btn-primary" onClick={save} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
                <small className="text-muted">
                  Contact (read-only): {profile.person_contact}
                </small>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
