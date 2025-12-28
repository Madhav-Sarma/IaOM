import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAppSelector } from '../store/hooks'
import type { RootState } from '../store/store'
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

interface GroupedReceipt {
  receiptNo: string
  anchorOrderId: number
  contact: string
  date: string
  orderIds: number[]
  totalQty: number
  status: OrderStatus
  created_at: string
  created_by: number
}

export default function CustomerDetailPage() {
  const { contact = '' } = useParams<{ contact: string }>()
  const token = useAppSelector((state: RootState) => state.auth.token)
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

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

  // Edit receipt state
  const [editingReceipt, setEditingReceipt] = useState<GroupedReceipt | null>(null)
  const [editReceiptOrders, setEditReceiptOrders] = useState<OrderResponse[]>([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  const deriveGroupStatus = (statuses: OrderStatus[]): OrderStatus => {
    if (statuses.every(s => s === 'cancelled')) return 'cancelled'
    if (statuses.some(s => s === 'pending')) return 'pending'
    if (statuses.some(s => s === 'confirmed')) return 'confirmed'
    return 'shipped'
  }

  const filteredOrders = useMemo(() => {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? (() => { const d = new Date(endDate); d.setHours(23,59,59,999); return d })() : null

    return orders.filter(order => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false
      const created = order.created_at ? new Date(order.created_at) : null
      if (start && (!created || created < start)) return false
      if (end && (!created || created > end)) return false
      return true
    })
  }, [orders, statusFilter, startDate, endDate])

  // Group orders into receipts by contact + creator within a 2-minute window (mirrors backend receipt window)
  const groupedReceipts = useMemo(() => {
    type InternalGroup = GroupedReceipt & { lineStatuses: OrderStatus[] }

    const sorted = [...filteredOrders].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      if (bTime !== aTime) return bTime - aTime
      return (b.order_id || 0) - (a.order_id || 0)
    })

    const windowMs = 120_000
    const groups: InternalGroup[] = []

    for (const order of sorted) {
      const createdAt = order.created_at || ''
      const contactValue = order.person_contact || ''
      const createdBy = order.created_by
      const last = groups[groups.length - 1]
      const lastTime = last ? new Date(last.created_at).getTime() : null
      const currentTime = createdAt ? new Date(createdAt).getTime() : null
      const withinWindow = lastTime !== null && currentTime !== null && Math.abs(currentTime - lastTime) <= windowMs
      const sameContact = last ? contactValue === last.contact : false
      const sameCreator = last ? createdBy === last.created_by : false

      if (last && withinWindow && sameContact && sameCreator) {
        last.orderIds.push(order.order_id)
        last.totalQty += order.order_quantity || 0
        last.lineStatuses.push(order.status)
        last.status = deriveGroupStatus(last.lineStatuses)
        continue
      }

      groups.push({
        receiptNo: '',
        anchorOrderId: order.order_id,
        contact: contactValue,
        date: createdAt ? new Date(createdAt).toLocaleDateString() : '',
        orderIds: [order.order_id],
        totalQty: order.order_quantity || 0,
        status: order.status,
        created_at: createdAt,
        created_by: createdBy,
        lineStatuses: [order.status],
      })
    }

    return groups.map((g) => ({
      receiptNo: `R-${g.anchorOrderId}`,
      anchorOrderId: g.anchorOrderId,
      contact: g.contact,
      date: g.date,
      orderIds: g.orderIds,
      totalQty: g.totalQty,
      status: deriveGroupStatus(g.lineStatuses),
      created_at: g.created_at,
      created_by: g.created_by,
    }))
  }, [filteredOrders])

  const paginatedReceipts = useMemo(() => {
    const start = (page - 1) * pageSize
    return groupedReceipts.slice(start, start + pageSize)
  }, [groupedReceipts, page, pageSize])

  const totalPages = Math.max(1, Math.ceil(groupedReceipts.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [statusFilter, startDate, endDate, groupedReceipts.length])

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

  const fetchReceipt = async (anchorOrderId: number) => {
    try {
      const { data } = await api.get(`/orders/${anchorOrderId}/receipt`, { headers: authHeader })
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
      setActiveReceiptOrderId(anchorOrderId)
      const created = data.created_at ? new Date(data.created_at).toLocaleString() : ''
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
      await api.put(`/orders/${String(line.orderId)}`, { order_quantity: nq }, { headers: authHeader })
      if (activeReceiptOrderId) await fetchReceipt(activeReceiptOrderId)
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to update quantity')
    }
  }

  const cancelReceiptLine = async (line: ReceiptLine) => {
    try {
      await api.put(`/orders/${String(line.orderId)}/status`, { status: 'cancelled' }, { headers: authHeader })
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

  // Edit receipt functions
  const startEditReceipt = (receipt: GroupedReceipt) => {
    const receiptOrders = orders.filter(o => receipt.orderIds.includes(o.order_id))
    setEditingReceipt(receipt)
    setEditReceiptOrders(receiptOrders)
  }

  const cancelEditReceipt = () => {
    setEditingReceipt(null)
    setEditReceiptOrders([])
  }

  const updateReceiptOrderQty = (orderId: number, newQty: number) => {
    setEditReceiptOrders(editReceiptOrders.map(o =>
      o.order_id === orderId ? { ...o, order_quantity: newQty } : o
    ))
  }

  const deleteReceiptOrder = (orderId: number) => {
    setEditReceiptOrders(editReceiptOrders.filter(o => o.order_id !== orderId))
  }

  const saveReceiptEdit = async () => {
    if (!editingReceipt || editReceiptOrders.length === 0) {
      alert('Receipt must have at least one product')
      return
    }

    try {
      // Update quantities for remaining orders
      for (const order of editReceiptOrders) {
        if (order.order_quantity !== orders.find(o => o.order_id === order.order_id)?.order_quantity) {
          const { data } = await api.put<OrderResponse>(
            `/orders/${order.order_id}`,
            { order_quantity: order.order_quantity },
            { headers: authHeader }
          )
          setOrders(orders.map(x => x.order_id === order.order_id ? data : x))
        }
      }

      // Delete orders that were removed
      const orderIdsToKeep = new Set(editReceiptOrders.map(o => o.order_id))
      const ordersToDelete = orders.filter(o => editingReceipt.orderIds.includes(o.order_id) && !orderIdsToKeep.has(o.order_id))
      for (const order of ordersToDelete) {
        await api.delete(`/orders/${order.order_id}`, { headers: authHeader })
        setOrders(orders.filter(x => x.order_id !== order.order_id))
      }

      alert('Receipt updated successfully')
      setEditingReceipt(null)
      setEditReceiptOrders([])
      await loadOrders()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to update receipt')
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
                {/* <button className="btn btn-primary btn-sm text-white" onClick={loadOrders}>Apply</button> */}
                <button className="btn btn-primary btn-sm text-white" onClick={() => { setStatusFilter('all'); setStartDate(''); setEndDate(''); setTimeout(() => loadOrders(), 0) }}>Reset</button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : (<div>
              <div className="table-responsive">
                <table className="table table-interactive">
                  <thead className="table-light">
                    <tr>
                      <th>Receipt No.</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Total Qty</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedReceipts.map(receipt => (
                      <tr key={receipt.receiptNo} onClick={() => fetchReceipt(receipt.anchorOrderId)} style={{ cursor: 'pointer' }}>
                        <td className="fw-medium">{receipt.receiptNo}</td>
                        <td>{receipt.date}</td>
                        <td><StatusBadge status={receipt.status} /></td>
                        <td>{receipt.totalQty}</td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            {receipt.status === 'pending' && (
                              <>
                                <button className="btn btn-outline-secondary text-white" onClick={(e) => { e.stopPropagation(); startEditReceipt(receipt) }}>Edit</button>
                                <button className="btn btn-success" onClick={(e) => { e.stopPropagation(); receipt.orderIds.forEach(orderId => { const order = orders.find(o => o.order_id === orderId); if (order) updateStatus(order, 'confirmed') }) }}>Confirm</button>
                                <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); receipt.orderIds.forEach(orderId => { const order = orders.find(o => o.order_id === orderId); if (order) updateStatus(order, 'cancelled') }) }}>Cancel</button>
                              </>
                            )}
                            {receipt.status === 'confirmed' && (
                              <>
                                <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); receipt.orderIds.forEach(orderId => { const order = orders.find(o => o.order_id === orderId); if (order) updateStatus(order, 'shipped') }) }}>Ship</button>
                                <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); receipt.orderIds.forEach(orderId => { const order = orders.find(o => o.order_id === orderId); if (order) updateStatus(order, 'cancelled') }) }}>Cancel</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2">
                <small className="text-muted">Showing {paginatedReceipts.length} of {groupedReceipts.length} receipts</small>
                <div className="btn-group">
                  <button className="btn btn-outline-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                  <span className="btn btn-outline-secondary btn-sm disabled">Page {page} / {totalPages}</span>
                  <button className="btn btn-outline-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
                </div>
              </div>
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
                <table className="table table-interactive table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>Receipt No.</th>
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
                              <button className="btn btn-outline-secondary text-white" onClick={() => editReceiptQuantity(line)}>Edit</button>
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

        {/* Edit Receipt Modal */}
        {editingReceipt && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={cancelEditReceipt}>
            <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit Receipt {editingReceipt.receiptNo}</h5>
                  <button type="button" className="btn-close" onClick={cancelEditReceipt}></button>
                </div>
                <div className="modal-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Customer</label>
                    <p className="form-control-plaintext">{editingReceipt.contact}</p>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Date</label>
                    <p className="form-control-plaintext">{editingReceipt.date}</p>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Products</label>
                    <table className="table table-sm table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th>Product</th>
                          <th style={{ width: '120px' }}>Quantity</th>
                          <th style={{ width: '80px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editReceiptOrders.map(order => (
                          <tr key={order.order_id}>
                            <td>{order.prod_name || 'Unknown'}</td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={order.order_quantity}
                                  min={1}
                                  onChange={e => updateReceiptOrderQty(order.order_id, Math.max(1, parseInt(e.target.value) || 1))}
                                />
                              </td>
                              <td>
                                <button
                                  className="btn btn-danger btn-sm w-100"
                                  onClick={() => deleteReceiptOrder(order.order_id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                    {editReceiptOrders.length === 0 && (
                      <div className="alert alert-warning mb-0">No products in receipt</div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={cancelEditReceipt}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveReceiptEdit} disabled={editReceiptOrders.length === 0}>Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
