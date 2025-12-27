import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Profile, ProfileUpdate } from '../types/profile'

export default function ProfilePage() {
  const { auth, logout } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm] = useState<ProfileUpdate>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('')

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${auth.token}` }), [auth.token])

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
      if (e?.response?.status === 401) logout()
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
      if (e?.response?.status === 401) logout()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container" style={{ padding: 16 }}>
      <h2>My Profile</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {message && <div style={{ color: 'green' }}>{message}</div>}

      {profile && (
        <div style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
          <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <span>Name</span>
            <input value={form.person_name || ''} onChange={e => onChange('person_name', e.target.value)} />
          </label>

          <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <span>Email</span>
            <input type="email" value={form.person_email || ''} onChange={e => onChange('person_email', e.target.value)} />
          </label>

          <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <span>Address</span>
            <input value={form.person_address || ''} onChange={e => onChange('person_address', e.target.value)} />
          </label>

          <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <span>New Password (optional)</span>
            <input type="password" value={form.password || ''} onChange={e => onChange('password', e.target.value)} />
          </label>

          <div style={{ display:'flex', gap:12, alignItems:'center' }}>
            <button onClick={save} disabled={saving} style={{ padding:'10px 14px' }}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <div style={{ color:'#666', fontSize:13 }}>
              Contact (read-only): {profile.person_contact}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
