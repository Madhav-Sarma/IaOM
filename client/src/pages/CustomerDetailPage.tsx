import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import StatusBadge from '../components/StatusBadge'
import type { CustomerResponse } from '../types/customer'
import type { OrderResponse, OrderStatus } from '../types/order'

interface ReceiptLine {
  orderId: number
  status: OrderStatus
  inventoryId: number
  SKU: string
  prodName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export default function CustomerDetailPage() {
  const { contact = '' } = useParams<{ contact: string }>()
  const { auth } = useAuth()
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${auth.token}` }), [auth.token])

  const [customer, setCustomer] = useState<CustomerResponse | null>(null)
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [receiptLines, setReceiptLines] = useState<ReceiptLine[]>([])
  const [receiptContact, setReceiptContact] = useState<string>('')
  const [receiptCreatedAt, setReceiptCreatedAt] = useState<string>('')
  const [receiptStatus, setReceiptStatus] = useState<OrderStatus | null>(null)
  const [activeReceiptOrderId, setActiveReceiptOrderId] = useState<number | null>(null)

  useEffect(() => {
    if (!contact) return
    loadCustomer()
    loadOrders()
  }, [contact])

  const extractError = (e: any, fallback: string) => {
    const detail = e?.response?.data?.detail
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('; ')
    if (typeof detail === 'string') return detail
    return fallback
  }

  const loadCustomer = async () => {
    try {
      const { data } = await api.get<CustomerResponse>(`/customers/${encodeURIComponent(contact)}`, { headers: authHeader })
      setCustomer(data)
    } catch (e: any) {
      setError(extractError(e, 'Failed to load customer'))
    }
  }

  const loadOrders = async () => {
    setLoading(true); setError(null)
    try {
      const params: any = { customer_contact: contact }
      if (statusFilter !== 'all') params.status = statusFilter
      if (startDate) params.start_date = new Date(startDate).toISOString()
      if (endDate) {
        const dt = new Date(endDate)
        dt.setHours(23, 59, 59, 999)
        params.end_date = dt.toISOString()
      }
      const { data } = await api.get<OrderResponse[]>(`/orders`, { headers: authHeader, params })
      setOrders(data)
    } catch (e: any) {
      setError(extractError(e, 'Failed to load orders'))
    } finally { setLoading(false) }
  }

  const fetchReceipt = async (orderId: number) => {
    try {
      const { data } = await api.get(`/orders/${orderId}/receipt`, { headers: authHeader })
      const lines: ReceiptLine[] = (data.lines || []).map((l: any) => ({
        orderId: l.order_id,
        status: l.status as OrderStatus,
        inventoryId: Number(l.inventory_id),
        SKU: l.SKU,
        prodName: l.prod_name,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unit_price ?? 0),
        subtotal: Number(l.subtotal ?? 0),
      }))
      setReceiptLines(lines)
      setReceiptContact(data.person_contact ?? contact)
      setActiveReceiptOrderId(orderId)
      const created = (data.lines?.[0]?.created_at) ? new Date(data.lines[0].created_at).toLocaleString() : ''
      setReceiptCreatedAt(created)
      setReceiptStatus(lines[0]?.status ?? null)
    } catch (e: any) {
      setError(extractError(e, 'Failed to load receipt'))
    }
  }

  const editReceiptQuantity = async (line: ReceiptLine) => {
    const n = prompt('New quantity', String(line.quantity))
    if (!n) return
    const nq = Number(n)
    if (Number.isNaN(nq) || nq < 1) return alert('Invalid quantity')
    try {
      await api.put(`/orders/${line.orderId}`, { order_quantity: nq }, { headers: authHeader })
      if (activeReceiptOrderId) await fetchReceipt(activeReceiptOrderId)
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to update quantity')
    }
  }

  const cancelReceiptLine = async (line: ReceiptLine) => {
    try {
      await api.put(`/orders/${line.orderId}/status`, { status: 'cancelled' }, { headers: authHeader })
      if (activeReceiptOrderId) await fetchReceipt(activeReceiptOrderId)
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to cancel')
    }
  }

  const updateStatus = async (o: OrderResponse, status: OrderStatus) => {
    try {
      const { data } = await api.put<OrderResponse>(`/orders/${o.order_id}/status`, { status }, { headers: authHeader })
      setOrders(orders.map(x => x.order_id === o.order_id ? data : x))
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to change status')
    }
  }

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        <h3 className="fw-bold mb-4">Customer Detail</h3>
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Customer Info */}
        <div className="card mb-4">
          <div className="card-body">
            {customer ? (
              <div>
                <h4 className="mb-3">{customer.person_name}</h4>
                <div className="row">
                  <div className="col-md-4"><strong>Contact:</strong> {customer.person_contact}</div>
                  <div className="col-md-4"><strong>Email:</strong> {customer.person_email}</div>
                  <div className="col-md-4"><strong>Address:</strong> {customer.person_address}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span className="ms-2">Loading customer…</span>
              </div>
            )}
          </div>
        </div>

        {/* Orders with Filters */}
        <div className="card mb-4">
          <div className="card-header"><h5 className="mb-0">Orders</h5></div>
          <div className="card-body">
            <div className="row g-3 mb-3">
              <div className="col-md-3">
                <label className="form-label">Status</label>
                <select className="form-select form-select-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="shipped">Shipped</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Start date</label>
                <input className="form-control form-control-sm" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label">End date</label>
                <input className="form-control form-control-sm" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div className="col-md-3 d-flex align-items-end gap-2">
                <button className="btn btn-primary btn-sm" onClick={loadOrders}>Apply</button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => { setStatusFilter('all'); setStartDate(''); setEndDate(''); loadOrders() }}>Reset</button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Order ID</th>
                      <th>Status</th>
                      <th>Qty</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.order_id} onClick={() => fetchReceipt(o.order_id)} style={{ cursor: 'pointer' }}>
                        <td>#{o.order_id}</td>
                        <td><StatusBadge status={o.status} /></td>
                        <td>{o.order_quantity}</td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            {o.status === 'pending' && (
                              <>
                                <button className="btn btn-success" onClick={(e) => { e.stopPropagation(); updateStatus(o, 'confirmed') }}>Confirm</button>
                                <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); updateStatus(o, 'cancelled') }}>Cancel</button>
                              </>
                            )}
                            {o.status === 'confirmed' && (
                              <>
                                <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); updateStatus(o, 'shipped') }}>Ship</button>
                                <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); updateStatus(o, 'cancelled') }}>Cancel</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Receipt */}
        {receiptLines.length > 0 && (
          <div className="card border-dashed">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-1">Receipt</h5>
                <small className="text-muted">Customer: {receiptContact || contact} | Created: {receiptCreatedAt || '—'}</small>
              </div>
              {receiptStatus && <StatusBadge status={receiptStatus} />}
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>Order ID</th>
                      <th>Status</th>
                      <th>SKU</th>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Subtotal</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptLines.map(line => (
                      <tr key={`r-${line.orderId}`}>
                        <td>{line.orderId}</td>
                        <td><StatusBadge status={line.status} /></td>
                        <td>{line.SKU}</td>
                        <td>{line.prodName}</td>
                        <td>{line.quantity}</td>
                        <td>{line.unitPrice.toFixed(2)}</td>
                        <td>{line.subtotal.toFixed(2)}</td>
                        <td>
                          {line.status === 'pending' && (
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-secondary" onClick={() => editReceiptQuantity(line)}>Edit</button>
                              <button className="btn btn-outline-danger" onClick={() => cancelReceiptLine(line)}>Cancel</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-end"><strong>Grand Total: {receiptLines.reduce((sum, l) => sum + l.subtotal, 0).toFixed(2)}</strong></div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
