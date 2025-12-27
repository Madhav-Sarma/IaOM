import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import DashboardLayout from '../components/DashboardLayout'
import type { CustomerCreate, CustomerUpdate, CustomerResponse, CustomerExistsResponse } from '../types/customer'

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

type ActiveView = 'list' | 'create' | 'check' | 'edit'

export default function CustomersPage() {
  const [activeView, setActiveView] = useState<ActiveView>('list')
  const [createForm, setCreateForm] = useState<CustomerCreate>({ person_name:'', person_contact:'', person_email:'', person_address:'' })
  const [editContact, setEditContact] = useState('')
  const [updateForm, setUpdateForm] = useState<CustomerUpdate>({})
  const [checkContact, setCheckContact] = useState('')
  const [checkEmail, setCheckEmail] = useState('')
  const [created, setCreated] = useState<CustomerResponse | null>(null)
  const [updated, setUpdated] = useState<CustomerResponse | null>(null)
  const [exists, setExists] = useState<CustomerExistsResponse | null>(null)
  const [list, setList] = useState<CustomerResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<CustomerResponse | null>(null)

  // Load customers on mount
  useEffect(() => {
    listCustomers()
  }, [])

  const createCustomer = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.post<CustomerResponse>('/customers', createForm, { headers: authHeader() })
      setCreated(data)
      setCreateForm({ person_name:'', person_contact:'', person_email:'', person_address:'' })
      // Refresh list
      listCustomers()
    } catch (err:any) { setError(err?.response?.data?.detail || 'Create failed') } finally { setLoading(false) }
  }
  const updateCustomer = async () => {
    if (!editContact) { setError('Provide contact to edit'); return }
    setLoading(true); setError(null)
    try {
      const { data } = await api.put<CustomerResponse>(`/customers/${encodeURIComponent(editContact)}`, updateForm, { headers: authHeader() })
      setUpdated(data)
      // Refresh list
      listCustomers()
    } catch (err:any) { setError(err?.response?.data?.detail || 'Update failed') } finally { setLoading(false) }
  }
  const listCustomers = async () => {
    setLoading(true); setError(null)
    try { const { data } = await api.get<CustomerResponse[]>('/customers?skip=0&limit=50', { headers: authHeader() }); setList(data) }
    catch (err:any) { setError(err?.response?.data?.detail || 'List failed') } finally { setLoading(false) }
  }
  const checkCustomer = async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams(); if (checkContact) params.append('contact', checkContact); else if (checkEmail) params.append('email', checkEmail)
      const { data } = await api.get<CustomerExistsResponse>(`/customers/check?${params.toString()}`, { headers: authHeader() })
      setExists(data)
    } catch (err:any) { setError(err?.response?.data?.detail || 'Check failed') } finally { setLoading(false) }
  }

  const clearMessages = () => {
    setError(null)
    setCreated(null)
    setUpdated(null)
    setExists(null)
  }

  const switchView = (view: ActiveView) => {
    clearMessages()
    setActiveView(view)
  }

  const startEditCustomer = (customer: CustomerResponse) => {
    setEditingCustomer(customer)
    setEditContact(customer.person_contact)
    setUpdateForm({
      person_name: customer.person_name,
      person_email: customer.person_email,
      person_contact: customer.person_contact,
      person_address: customer.person_address
    })
    clearMessages()
    setActiveView('edit')
  }

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
          <h3 className="fw-bold mb-0">Customers</h3>
          
          {/* Action Buttons */}
          <div className="btn-group flex-wrap" role="group">
            <button 
              className={`btn ${activeView === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => switchView('list')}
            >
              <i className="bi bi-list-ul me-1"></i> Customer List
            </button>
            <button 
              className={`btn ${activeView === 'create' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => switchView('create')}
            >
              <i className="bi bi-plus-circle me-1"></i> Create Customer
            </button>
            <button 
              className={`btn ${activeView === 'check' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => switchView('check')}
            >
              <i className="bi bi-search me-1"></i> Check Exists
            </button>
          </div>
        </div>

        {loading && (
          <div className="alert alert-info d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
            Working...
          </div>
        )}
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Customer List View */}
        {activeView === 'list' && (
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Customer List</h5>
              <button className="btn btn-outline-primary btn-sm" onClick={listCustomers}>
                <i className="bi bi-arrow-clockwise me-1"></i> Refresh
              </button>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted py-4">No customers found</td></tr>
                  ) : list.map(c => (
                    <tr key={c.person_id}>
                      <td>{c.person_id}</td>
                      <td>{c.person_name}</td>
                      <td>{c.person_contact}</td>
                      <td>{c.person_email}</td>
                      <td>{c.person_address}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <Link to={`/customers/${encodeURIComponent(c.person_contact)}`} className="btn btn-outline-secondary">View</Link>
                          <button 
                            className="btn btn-outline-primary"
                            onClick={() => startEditCustomer(c)}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Customer View */}
        {activeView === 'create' && (
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Create New Customer</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" value={createForm.person_name} onChange={(e)=>setCreateForm({...createForm, person_name:e.target.value})} placeholder="Enter full name" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email *</label>
                  <input className="form-control" type="email" value={createForm.person_email} onChange={(e)=>setCreateForm({...createForm, person_email:e.target.value})} placeholder="Enter email address" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Contact (Phone) *</label>
                  <input className="form-control" value={createForm.person_contact} onChange={(e)=>setCreateForm({...createForm, person_contact:e.target.value})} placeholder="Enter phone number" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Address</label>
                  <input className="form-control" value={createForm.person_address} onChange={(e)=>setCreateForm({...createForm, person_address:e.target.value})} placeholder="Enter address" />
                </div>
                <div className="col-12">
                  <button className="btn btn-primary" onClick={createCustomer} disabled={loading}>
                    Create Customer
                  </button>
                  <button className="btn btn-outline-secondary ms-2" onClick={() => switchView('list')}>
                    Cancel
                  </button>
                </div>
              </div>
              {created && (
                <div className="alert alert-success mt-3 mb-0">
                  <strong>Customer Created Successfully!</strong>
                  <p className="mb-0 mt-1">ID: #{created.person_id} · Name: {created.person_name} · Contact: {created.person_contact}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Customer View */}
        {activeView === 'edit' && editingCustomer && (
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Edit Customer: {editingCustomer.person_name}</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Name</label>
                  <input className="form-control" value={updateForm.person_name || ''} onChange={(e)=>setUpdateForm({...updateForm, person_name:e.target.value || undefined})} placeholder="Enter new name" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input className="form-control" value={updateForm.person_email || ''} onChange={(e)=>setUpdateForm({...updateForm, person_email:e.target.value || undefined})} placeholder="Enter new email" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Contact</label>
                  <input className="form-control" value={updateForm.person_contact || ''} onChange={(e)=>setUpdateForm({...updateForm, person_contact:e.target.value || undefined})} placeholder="Enter new contact" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Address</label>
                  <input className="form-control" value={updateForm.person_address || ''} onChange={(e)=>setUpdateForm({...updateForm, person_address:e.target.value || undefined})} placeholder="Enter new address" />
                </div>
                <div className="col-12">
                  <button className="btn btn-primary" onClick={updateCustomer} disabled={loading}>
                    Save Changes
                  </button>
                  <button className="btn btn-outline-secondary ms-2" onClick={() => { setEditingCustomer(null); setEditContact(''); setUpdateForm({}); switchView('list') }}>
                    Cancel
                  </button>
                </div>
              </div>
              {updated && (
                <div className="alert alert-success mt-3 mb-0">
                  <strong>Customer Updated Successfully!</strong>
                  <p className="mb-0 mt-1">ID: #{updated.person_id} · Name: {updated.person_name} · Contact: {updated.person_contact}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Check Customer Exists View */}
        {activeView === 'check' && (
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Check if Customer Exists</h5>
            </div>
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-md-5">
                  <label className="form-label">Search by Contact</label>
                  <input className="form-control" value={checkContact} onChange={(e)=>{setCheckContact(e.target.value); setCheckEmail('')}} placeholder="Enter phone number" />
                </div>
                <div className="col-md-1 text-center py-2">
                  <strong>OR</strong>
                </div>
                <div className="col-md-5">
                  <label className="form-label">Search by Email</label>
                  <input className="form-control" value={checkEmail} onChange={(e)=>{setCheckEmail(e.target.value); setCheckContact('')}} placeholder="Enter email address" />
                </div>
                <div className="col-12">
                  <button className="btn btn-primary" onClick={checkCustomer} disabled={loading || (!checkContact && !checkEmail)}>
                    Check Customer
                  </button>
                  <button className="btn btn-outline-secondary ms-2" onClick={() => switchView('list')}>
                    Back to List
                  </button>
                </div>
              </div>
              {exists && (
                <div className={`alert ${exists.exists ? 'alert-success' : 'alert-warning'} mt-3 mb-0`}>
                  {exists.exists ? (
                    <>
                      <strong>Customer Found!</strong>
                      <p className="mb-0 mt-1">ID: #{exists.person_id} · Name: {exists.person_name} · Contact: {exists.person_contact}</p>
                    </>
                  ) : (
                    <strong>No customer found with the given contact/email.</strong>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
