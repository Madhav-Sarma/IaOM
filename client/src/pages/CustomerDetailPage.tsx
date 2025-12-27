import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { CustomerResponse } from '../types/customer'
import type { OrderResponse, OrderStatus, InventoryItem } from '../types/order'

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
  const [inventory, setInventory] = useState<InventoryItem[]>([])
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
    loadInventory()
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

  const loadInventory = async () => {
    try {
      const { data } = await api.get<InventoryItem[]>(`/orders/inventory`, { headers: authHeader })
      setInventory(data)
    } catch (e: any) {
      setError(extractError(e, 'Failed to load inventory'))
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

  const editReceiptInventory = async (line: ReceiptLine, newInvId: number) => {
    try {
      await api.put(`/orders/${line.orderId}`, { inventory_id: newInvId }, { headers: authHeader })
      if (activeReceiptOrderId) await fetchReceipt(activeReceiptOrderId)
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to change inventory')
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
    <div className="container" style={{ padding: 16 }}>
      <h2>Customer Detail</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <section style={{ border:'1px solid #eee', padding:12, borderRadius:8, marginBottom:16 }}>
        {customer ? (
          <div>
            <h3 style={{ marginTop:0 }}>{customer.person_name}</h3>
            <div style={{ fontSize:14, color:'#555' }}>
              <div>Contact: {customer.person_contact}</div>
              <div>Email: {customer.person_email}</div>
              <div>Address: {customer.person_address}</div>
            </div>
          </div>
        ) : (
          <div>Loading customer…</div>
        )}
      </section>

      <section style={{ border:'1px solid #eee', padding:12, borderRadius:8 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:12, alignItems:'center' }}>
          <label>Filter status
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="shipped">Shipped</option>
            </select>
          </label>
          <label>Start date
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </label>
          <label>End date
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </label>
          <div>
            <button onClick={loadOrders} style={{ padding:'8px 12px' }}>Apply Filters</button>
            <button onClick={() => { setStatusFilter('all'); setStartDate(''); setEndDate(''); loadOrders() }} style={{ marginLeft:8, padding:'8px 12px' }}>Reset</button>
          </div>
        </div>
        {loading ? <div>Loading orders…</div> : (
          <table className="table" style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Qty</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.order_id} onClick={() => fetchReceipt(o.order_id)} style={{ cursor:'pointer' }}>
                  <td>{o.order_id}</td>
                  <td>{o.status}</td>
                  <td>{o.order_quantity}</td>
                  <td>
                    {o.status === 'pending' && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(o, 'confirmed') }}>Confirm</button>
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(o, 'cancelled') }}>Cancel</button>
                      </>
                    )}
                    {o.status === 'confirmed' && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(o, 'shipped') }}>Mark shipped</button>
                        <button onClick={(e) => { e.stopPropagation(); updateStatus(o, 'cancelled') }}>Cancel</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {receiptLines.length > 0 && (
        <section style={{ border: '1px dashed #aaa', padding: 12, borderRadius: 8, marginTop: 16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
            <div>
              <h3 style={{ margin: 0 }}>Receipt</h3>
              <div style={{ fontSize: 13, color: '#555' }}>
                <div>Customer: {receiptContact || contact}</div>
                <div>Created: {receiptCreatedAt || '—'}</div>
              </div>
            </div>
            {receiptStatus && (
              <span style={{ padding:'4px 8px', borderRadius: 6, background:'#eef', color:'#223' }}>Status: {receiptStatus}</span>
            )}
          </div>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>SKU</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Subtotal</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receiptLines.map(line => (
                <tr key={`r-${line.orderId}`}>
                  <td>{line.orderId}</td>
                  <td>{line.status}</td>
                  <td>{line.SKU}</td>
                  <td>{line.prodName}</td>
                  <td>{line.quantity}</td>
                  <td>{line.unitPrice.toFixed(2)}</td>
                  <td>{line.subtotal.toFixed(2)}</td>
                  <td>
                    {line.status === 'pending' && (
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <select onChange={e => {
                          const invId = Number(e.target.value)
                          if (!invId) return
                          editReceiptInventory(line, invId)
                          e.currentTarget.selectedIndex = 0
                        }}>
                          <option value="">Change inventory…</option>
                          {inventory.map(i => (
                            <option key={i.inventory_id} value={i.inventory_id}>
                              {i.SKU} - {i.prod_name} (units: {i.units})
                            </option>
                          ))}
                        </select>
                        <button onClick={() => editReceiptQuantity(line)}>Edit qty</button>
                        <button onClick={() => cancelReceiptLine(line)}>Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <strong>Grand Total: {receiptLines.reduce((sum, l) => sum + l.subtotal, 0).toFixed(2)}</strong>
          </div>
        </section>
      )}
    </div>
  )
}
