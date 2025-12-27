import { useState } from 'react'
import { api } from '../api/client'
import type { CustomerCreate, CustomerUpdate, CustomerResponse, CustomerExistsResponse } from '../types/customer'

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

export default function CustomersPage() {
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

  const createCustomer = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.post<CustomerResponse>('/customers', createForm, { headers: authHeader() })
      setCreated(data)
    } catch (err:any) { setError(err?.response?.data?.detail || 'Create failed') } finally { setLoading(false) }
  }
  const updateCustomer = async () => {
    if (!editContact) { setError('Provide contact to edit'); return }
    setLoading(true); setError(null)
    try {
      const { data } = await api.put<CustomerResponse>(`/customers/${encodeURIComponent(editContact)}`, updateForm, { headers: authHeader() })
      setUpdated(data)
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

  return (
    <div className="panel">
      <h2>Customers (Staff/Admin)</h2>
      {loading && <div className="status info">Working...</div>}
      {error && <div className="status error">{error}</div>}
      <div className="form-grid">
        <h3 className="full">Create Customer</h3>
        <label>Full Name<input value={createForm.person_name} onChange={(e)=>setCreateForm({...createForm, person_name:e.target.value})} /></label>
        <label>Email<input value={createForm.person_email} onChange={(e)=>setCreateForm({...createForm, person_email:e.target.value})} /></label>
        <label>Contact<input value={createForm.person_contact} onChange={(e)=>setCreateForm({...createForm, person_contact:e.target.value})} /></label>
        <label className="full">Address<input value={createForm.person_address} onChange={(e)=>setCreateForm({...createForm, person_address:e.target.value})} /></label>
        <div className="actions full"><button onClick={createCustomer}>Create (requires login)</button></div>
        {created && <div className="result full"><h4>Created</h4><p>#{created.person_id} · {created.person_name} · {created.person_contact}</p></div>}

        <h3 className="full">Edit by Contact</h3>
        <label>Contact to edit<input value={editContact} onChange={(e)=>setEditContact(e.target.value)} /></label>
        <label>New Name<input value={updateForm.person_name || ''} onChange={(e)=>setUpdateForm({...updateForm, person_name:e.target.value || undefined})} /></label>
        <label>New Email<input value={updateForm.person_email || ''} onChange={(e)=>setUpdateForm({...updateForm, person_email:e.target.value || undefined})} /></label>
        <label>New Contact<input value={updateForm.person_contact || ''} onChange={(e)=>setUpdateForm({...updateForm, person_contact:e.target.value || undefined})} /></label>
        <label className="full">New Address<input value={updateForm.person_address || ''} onChange={(e)=>setUpdateForm({...updateForm, person_address:e.target.value || undefined})} /></label>
        <div className="actions full"><button onClick={updateCustomer}>Update (requires login)</button></div>
        {updated && <div className="result full"><h4>Updated</h4><p>#{updated.person_id} · {updated.person_name} · {updated.person_contact}</p></div>}

        <h3 className="full">List & Check</h3>
        <div className="actions"><button onClick={listCustomers}>List Customers</button></div>
        <div className="full" style={{overflowX:'auto'}}>
          <table className="table"><thead><tr><th>ID</th><th>Name</th><th>Contact</th><th>Email</th><th>Address</th><th>Details</th></tr></thead><tbody>
            {list.map(c=> <tr key={c.person_id}><td>{c.person_id}</td><td>{c.person_name}</td><td>{c.person_contact}</td><td>{c.person_email}</td><td>{c.person_address}</td><td><a href={`/customers/${encodeURIComponent(c.person_contact)}`}>View</a></td></tr>)}
          </tbody></table>
        </div>
        <label>Check by Contact<input value={checkContact} onChange={(e)=>{setCheckContact(e.target.value); setCheckEmail('')}} /></label>
        <label>Or by Email<input value={checkEmail} onChange={(e)=>{setCheckEmail(e.target.value); setCheckContact('')}} /></label>
        <div className="actions"><button onClick={checkCustomer}>Check</button></div>
        {exists && <div className="result full"><h4>Exists: {String(exists.exists)}</h4>{exists.exists && <p>#{exists.person_id} · {exists.person_name} · {exists.person_contact}</p>}</div>}
      </div>
    </div>
  )
}
