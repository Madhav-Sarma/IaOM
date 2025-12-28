import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAppSelector } from '../store/hooks'
import type { RootState } from '../store/store'
import DashboardLayout from '../components/DashboardLayout'

interface StaffMember {
  person_id: number
  person_name: string
  person_email: string
  person_contact: string
  role: 'admin' | 'staff'
  is_active: boolean
}

export default function StaffPage() {
  const token = useAppSelector((state: RootState) => state.auth.token)
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])
  const navigate = useNavigate()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const role = useAppSelector((state: RootState) => state.auth.role)

  if (role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="container-fluid py-4">
          <div className="alert alert-warning">You must be an admin to view this page.</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold mb-0">Staff Members</h3>
          <button className="btn btn-primary" onClick={() => navigate('/staff')}>
            + Create Staff
          </button>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-interactive">
                  <thead className="table-light">
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
                        <td><span className="badge bg-secondary">{s.role}</span></td>
                        <td>
                          <span className={`badge ${s.is_active ? 'bg-success' : 'bg-danger'}`}>
                            {s.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {s.is_active && s.role === 'staff' && (
                            <button className="btn btn-sm btn-outline-danger" onClick={() => deactivateStaff(s.person_contact)}>
                              Deactivate
                            </button>
                          )}
                          {!s.is_active && <span className="text-muted">Deactivated</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
