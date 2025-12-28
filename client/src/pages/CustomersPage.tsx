import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAppSelector } from '../store/hooks'
import type { RootState } from '../store/store'
import DashboardLayout from '../components/DashboardLayout'
import PageHeader from '../components/PageHeader'
import Loader from '../components/Loader'
import EmptyState from '../components/EmptyState'
import { useToast } from '../components/Toast'
import { FiUsers } from 'react-icons/fi'
import type { CustomerCreate, CustomerUpdate, CustomerResponse, CustomerExistsResponse } from '../types/customer'

type ActiveView = 'list' | 'create' | 'check' | 'edit'

export default function CustomersPage() {
  const token = useAppSelector((state: RootState) => state.auth.token)
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])
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
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<keyof CustomerResponse | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  // Load customers on mount
  useEffect(() => {
    listCustomers()
  }, [])

  const createCustomer = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.post<CustomerResponse>('/customers', createForm, { headers: authHeader })
      setCreated(data)
      setCreateForm({ person_name:'', person_contact:'', person_email:'', person_address:'' })
      addToast('success', 'Customer created successfully')
      listCustomers()
      switchView('list')
    } catch (err:any) { 
      const msg = err?.response?.data?.detail || 'Create failed'
      setError(msg)
      addToast('error', msg)
    } finally { setLoading(false) }
  }
  const updateCustomer = async () => {
    if (!editContact) { addToast('warning', 'Provide contact to edit'); return }
    setLoading(true); setError(null)
    try {
      const { data } = await api.put<CustomerResponse>(`/customers/${encodeURIComponent(editContact)}`, updateForm, { headers: authHeader })
      setUpdated(data)
      addToast('success', 'Customer updated successfully')
      listCustomers()
      switchView('list')
    } catch (err:any) { 
      const msg = err?.response?.data?.detail || 'Update failed'
      setError(msg)
      addToast('error', msg)
    } finally { setLoading(false) }
  }
  const listCustomers = async () => {
    setLoading(true); setError(null)
    try { const { data } = await api.get<CustomerResponse[]>('/customers?skip=0&limit=50', { headers: authHeader }); setList(data) }
    catch (err:any) { setError(err?.response?.data?.detail || 'List failed') } finally { setLoading(false) }
  }
  const checkCustomer = async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams(); if (checkContact) params.append('contact', checkContact); else if (checkEmail) params.append('email', checkEmail)
      const { data } = await api.get<CustomerExistsResponse>(`/customers/check?${params.toString()}`, { headers: authHeader })
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(c => 
      c.person_name.toLowerCase().includes(q) ||
      c.person_contact.toLowerCase().includes(q) ||
      (c.person_email || '').toLowerCase().includes(q)
    )
  }, [list, search])

  const sorted = useMemo(() => {
    if (!sortField) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (aVal === bVal) return 0
      const comparison = aVal > bVal ? 1 : -1
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [filtered, sortField, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [search, pageSize])

  const handleSort = (field: keyof CustomerResponse) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // const toggleRowSelect = (id: number) => {
  //   const newSelected = new Set(selectedRows)
  //   if (newSelected.has(id)) {
  //     newSelected.delete(id)
  //   } else {
  //     newSelected.add(id)
  //   }
  //   setSelectedRows(newSelected)
  // }

  // const toggleAllRows = () => {
  //   if (selectedRows.size === pageItems.length) {
  //     setSelectedRows(new Set())
  //   } else {
  //     setSelectedRows(new Set(pageItems.map(c => c.person_id)))
  //   }
  // }

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        <PageHeader
          title="Customers"
          subtitle="Manage customer information and contacts"
          actions={
            <div className="flex-wrap" role="group">
              <button 
                className={`btn btn-sm text-white me-1  ${activeView === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => switchView('list')}
              >
                Customer List
              </button>
              <button 
                className={`btn btn-sm text-white me-1 ${activeView === 'create' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => switchView('create')}
              >
                + Create
              </button>
              <button 
                className={`btn btn-sm text-white ${activeView === 'check' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => switchView('check')}
              >
                Check Exists
              </button>
            </div>
          }
        />

        {loading && <Loader message="Loading customers..." />}
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Customer List View */}
        {activeView === 'list' && (
          <>
            {list.length === 0 ? (
              <EmptyState
                title="No customers yet"
                description="Create a customer to get started"
                icon={<FiUsers />}
                action={<button className="btn btn-primary " onClick={() => switchView('create')}>Create Customer</button>}
              />
            ) : (
              <div className="card">
                <div className="card-body">
                  <div className="row g-2 align-items-center mb-3">
                    <div className="col-12 col-md-6">
                      <input
                        type="search"
                        className="form-control"
                        placeholder="Search by name, contact, or email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="col-6 col-md-3">
                      <select
                        className="form-select"
                        value={pageSize}
                        onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                      >
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                      </select>
                    </div>
                    <div className="col-6 col-md-3 text-end">
                      <button className="btn btn-outline-primary btn-sm text-white" onClick={listCustomers}>
                        Refresh
                      </button>
                    </div>
                  </div>
                  {selectedRows.size > 0 && (
                    <div className="alert alert-info py-2 mb-0 d-flex align-items-center justify-content-between">
                      <span><strong>{selectedRows.size}</strong> customer{selectedRows.size > 1 ? 's' : ''} selected</span>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedRows(new Set())}>Clear Selection</button>
                    </div>
                  )}
                </div>
                <div className="table-responsive">
                  <table className="table table-interactive mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className={`sortable-header ${sortField === 'person_id' ? `sorted-${sortOrder}` : ''}`} onClick={() => handleSort('person_id')}>ID</th>
                        <th className={`sortable-header ${sortField === 'person_name' ? `sorted-${sortOrder}` : ''}`} onClick={() => handleSort('person_name')}>Name</th>
                        <th className={`sortable-header ${sortField === 'person_contact' ? `sorted-${sortOrder}` : ''}`} onClick={() => handleSort('person_contact')}>Contact</th>
                        <th className={`sortable-header ${sortField === 'person_email' ? `sorted-${sortOrder}` : ''}`} onClick={() => handleSort('person_email')}>Email</th>
                        <th>Address</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.length === 0 ? (
                        <tr><td colSpan={6} className="text-center text-muted py-4">No customers match your search</td></tr>
                      ) : pageItems.map(c => (
                    <tr 
                      key={c.person_id}
                      className={selectedRows.has(c.person_id) ? 'selected' : ''}
                    >
                      <td>{c.person_id}</td>
                      <td>{c.person_name}</td>
                      <td>{c.person_contact}</td>
                      <td>{c.person_email}</td>
                      <td>{c.person_address}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <Link to={`/customers/${encodeURIComponent(c.person_contact)}`} className="btn btn-outline-secondary table-action-btn">View</Link>
                          <button 
                            className="btn btn-outline-primary table-action-btn text-white"
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
                <div className="card-body">
                  <nav aria-label="Customers pagination">
                    <div className="d-flex justify-content-end">
                      <div className="btn-group">
                        <button className="btn btn-outline-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                        <span className="btn btn-outline-secondary btn-sm disabled">Page {page} / {totalPages}</span>
                        <button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
                      </div>
                    </div>
                  </nav>
                </div>
              </div>
            )}
          </>
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
                  <button className="btn btn-outline-secondary ms-2 text-white" onClick={() => switchView('list')}>
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
