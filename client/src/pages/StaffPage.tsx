import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

interface StaffMember {
  person_id: number
  person_name: string
  person_email: string
  person_contact: string
  role: 'admin' | 'staff'
  is_active: boolean
}

export default function StaffPage() {
  const { auth } = useAuth()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${auth.token}` }), [auth.token])

  useEffect(() => {
    loadStaff()
  }, [])

  const loadStaff = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get<StaffMember[]>('/auth/staff-list', { headers: authHeader })
      setStaff(data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load staff')
    } finally { setLoading(false) }
  }

  const deactivateStaff = async (contact: string) => {
    if (!window.confirm(`Deactivate staff member with contact ${contact}?`)) return
    try {
      await api.put(`/auth/deactivate-staff/${encodeURIComponent(contact)}`, {}, { headers: authHeader })
      setStaff(staff.map(s => s.person_contact === contact ? { ...s, is_active: false } : s))
      alert('Staff member deactivated.')
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to deactivate staff')
    }
  }

  if (auth.role !== 'admin') {
    return <div className="container" style={{ padding: 16 }}>You must be an admin to view this page.</div>
  }

  return (
    <div className="container" style={{ padding: 16 }}>
      <h2>Staff Members</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {loading ? <div>Loading...</div> : (
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.person_id}>
                <td>{s.person_id}</td>
                <td>{s.person_name}</td>
                <td>{s.person_contact}</td>
                <td>{s.person_email}</td>
                <td>{s.role}</td>
                <td style={{ color: s.is_active ? 'green' : 'red' }}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </td>
                <td>
                  {s.is_active && s.role === 'staff' && (
                    <button onClick={() => deactivateStaff(s.person_contact)}>Deactivate</button>
                  )}
                  {!s.is_active && <span style={{ color: '#999' }}>Deactivated</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
