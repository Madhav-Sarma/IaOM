import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { OrderCreate, OrderResponse, OrderStatus, OrderStatusUpdate, InventoryItem } from '../types/order'

interface CartItem {
  inventoryId: number
  quantity: number
  SKU: string
  prodName: string
  unitPrice: number
}

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

export default function OrdersPage() {
  const { auth } = useAuth()
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [contact, setContact] = useState('')
  const [contactInfo, setContactInfo] = useState<string>('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [receiptLines, setReceiptLines] = useState<ReceiptLine[]>([])
  const [activeReceiptOrderId, setActiveReceiptOrderId] = useState<number | null>(null)
  const [receiptContact, setReceiptContact] = useState<string>('')
  const [receiptCreatedAt, setReceiptCreatedAt] = useState<string>('')
  const [receiptStatus, setReceiptStatus] = useState<OrderStatus | null>(null)
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | ''>('')
  const [selectedQty, setSelectedQty] = useState<number>(1)

  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [previousOnly, setPreviousOnly] = useState<boolean>(false)
  const [contactFilter, setContactFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${auth.token}` }), [auth.token])

  useEffect(() => {
    loadInventory()
    loadOrders()
  }, [])

  const extractError = (e: any, fallback: string) => {
    const detail = e?.response?.data?.detail
    if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join('; ')
    if (typeof detail === 'string') return detail
    return fallback
  }

  const loadInventory = async () => {
    try {
      const { data } = await api.get<InventoryItem[]>('/orders/inventory', { headers: authHeader })
      setInventory(data)
    } catch (e: any) {
      setError(extractError(e, 'Failed to load inventory'))
    }
  }

  const loadOrders = async () => {
    setLoading(true); setError(null)
    try {
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (contactFilter) params.customer_contact = contactFilter
      if (startDate) params.start_date = new Date(startDate).toISOString()
      if (endDate) {
        // set end of day for endDate
        const dt = new Date(endDate)
        dt.setHours(23, 59, 59, 999)
        params.end_date = dt.toISOString()
      }
      const { data } = await api.get<OrderResponse[]>('/orders', { headers: authHeader, params })
      setOrders(data)
    } catch (e: any) {
      setError(extractError(e, 'Failed to load orders'))
    } finally { setLoading(false) }
  }

  const checkContact = async () => {
    if (!contact) return
    try {
      const { data } = await api.get('/customers/check', {
        headers: authHeader,
        params: { contact }
      })
      if (data.exists) {
        setContactInfo(`Customer exists: ${data.person_name || contact}`)
      } else {
        setContactInfo('No customer found. Will be created automatically.')
      }
    } catch (e: any) {
      setContactInfo('Unable to check contact')
    }
  }

  const addToCart = () => {
    if (!selectedInventoryId) {
      alert('Select a product')
      return
    }
    const item = inventory.find(i => i.inventory_id === selectedInventoryId)
    if (!item) return
    
    // Check if already in cart
    const existing = cart.find(c => c.inventoryId === selectedInventoryId)
    if (existing) {
      setCart(cart.map(c => c.inventoryId === selectedInventoryId ? { ...c, quantity: c.quantity + selectedQty } : c))
    } else {
      setCart([...cart, {
        inventoryId: selectedInventoryId,
        quantity: selectedQty,
        SKU: item.SKU,
        prodName: item.prod_name,
        unitPrice: Number((item as any).unit_price ?? 0),
      }])
    }
    setSelectedInventoryId('')
    setSelectedQty(1)
  }

  const removeFromCart = (inventoryId: number) => {
    setCart(cart.filter(c => c.inventoryId !== inventoryId))
  }

  const checkout = async () => {
    if (!contact) {
      alert('Enter customer contact')
      return
    }
    if (cart.length === 0) {
      alert('Add items to cart')
      return
    }

    setLoading(true)
    let created = 0
    const lines: ReceiptLine[] = []
    for (const item of cart) {
      try {
        const payload: OrderCreate = { contact, inventory_id: item.inventoryId, order_quantity: item.quantity }
        const { data } = await api.post<OrderResponse>('/orders', payload, { headers: authHeader })
        created++
        lines.push({
          orderId: data.order_id,
          status: data.status,
          inventoryId: item.inventoryId,
          SKU: item.SKU,
          prodName: item.prodName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.unitPrice * item.quantity,
        })
      } catch (e: any) {
        alert(`Failed to create order for ${item.SKU}: ${e?.response?.data?.detail || 'Error'}`)
      }
    }
    setLoading(false)

    if (created === cart.length) {
      alert(`${created} order(s) created successfully!`)
      // Snapshot created orders with statuses for receipt before clearing
      setReceiptLines(lines)
      setReceiptContact(lines.length > 0 ? (dataRefPersonContact(lines) || contact) : '')
      setCart([])
      setContact('')
      setContactInfo('')
      loadOrders()
    }
  }

  const fetchReceipt = async (orderId: number) => {
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
    setReceiptContact(data.person_contact ?? '')
    setActiveReceiptOrderId(orderId)
    // use first line timestamp as receipt created time
    const created = (data.lines?.[0]?.created_at) ? new Date(data.lines[0].created_at).toLocaleString() : ''
    setReceiptCreatedAt(created)
    setReceiptStatus(lines[0]?.status ?? null)
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

  // Helper to try fetching person_contact from latest order list
  const dataRefPersonContact = (lines: ReceiptLine[]) => {
    // Since backend returns person_contact in create response, receiptContact is set above.
    // As a fallback, find contact from current orders state matching any created order.
    const ids = new Set(lines.map(l => l.orderId))
    const match = orders.find(o => ids.has(o.order_id) && o.person_contact)
    return match?.person_contact ?? ''
  }

  const updateStatus = async (o: OrderResponse, status: OrderStatus) => {
    const body: OrderStatusUpdate = { status }
    try {
      const { data } = await api.put<OrderResponse>(`/orders/${o.order_id}/status`, body, { headers: authHeader })
      setOrders(orders.map(x => x.order_id === o.order_id ? data : x))
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to change status')
    }
  }

  return (
    <div className="container" style={{ padding: 16 }}>
      <h2>Orders</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <section style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        <h3>Shopping Cart Checkout</h3>
        <div style={{ marginBottom: 12 }}>
          <label>Customer Contact</label>
          <input value={contact} onChange={e => setContact(e.target.value)} onBlur={checkContact} />
          {contactInfo && <div style={{ fontSize: 12, color: '#666' }}>{contactInfo}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, marginBottom: 12 }}>
          <div>
            <label>Products In Your Store</label>
            <select value={selectedInventoryId} onChange={e => setSelectedInventoryId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Select item</option>
              {inventory.length === 0 && (
                <option value="" disabled>No products for your store</option>
              )}
              {inventory.map(i => (
                <option key={i.inventory_id} value={i.inventory_id}>
                  {i.SKU} - {i.prod_name} (units: {i.units})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Quantity</label>
            <input type="number" min={1} value={selectedQty} onChange={e => setSelectedQty(Number(e.target.value))} />
          </div>
          <div style={{ alignSelf: 'end' }}>
            <button onClick={addToCart}>Add to Cart</button>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <h4>Cart ({cart.length} items)</h4>
          {cart.length === 0 ? (
            <div style={{ color: '#999' }}>Cart is empty</div>
          ) : (
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Subtotal</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cart.map(item => (
                  <tr key={item.inventoryId}>
                    <td>{item.SKU}</td>
                    <td>{item.prodName}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unitPrice.toFixed(2)}</td>
                    <td>{(item.unitPrice * item.quantity).toFixed(2)}</td>
                    <td>
                      <button onClick={() => removeFromCart(item.inventoryId)} style={{ fontSize: '12px' }}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {cart.length > 0 && (
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <strong>Total: {cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0).toFixed(2)}</strong>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={checkout} disabled={loading || cart.length === 0} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white' }}>
            {loading ? 'Checking out...' : 'Checkout'}
          </button>
          <button onClick={() => setCart([])} style={{ padding: '10px 20px' }}>Clear Cart</button>
        </div>
      </section>

      {receiptLines.length > 0 && (
        <section style={{ border: '1px dashed #aaa', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
            <div>
              <h3 style={{ margin: 0 }}>Receipt</h3>
              <div style={{ fontSize: 13, color: '#555' }}>
                <div>Customer: {receiptContact || '—'}</div>
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

      <section style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
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
          <label>Customer contact
            <input value={contactFilter} onChange={e => setContactFilter(e.target.value)} placeholder="e.g. phone" />
          </label>
          <label>Start date
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </label>
          <label>End date
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </label>
          <label style={{ display:'flex', alignItems:'center', gap:6 }}>
            <input type="checkbox" checked={previousOnly} onChange={e => setPreviousOnly(e.target.checked)} />
            Previous orders only (exclude pending)
          </label>
          <div>
            <button onClick={loadOrders} style={{ padding:'8px 12px' }}>Apply Filters</button>
            <button onClick={() => { setStatusFilter('all'); setContactFilter(''); setStartDate(''); setEndDate(''); setPreviousOnly(false); loadOrders() }} style={{ marginLeft:8, padding:'8px 12px' }}>Reset</button>
          </div>
        </div>
        {loading ? <div>Loading...</div> : (
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Contact</th>
                <th>Status</th>
                <th>Qty</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(orders.filter(o => {
                if (previousOnly && o.status === 'pending') return false
                if (statusFilter === 'all') return true
                return o.status === statusFilter
              })).map(o => (
                <tr key={o.order_id} onClick={() => fetchReceipt(o.order_id)} style={{ cursor: 'pointer' }}>
                  <td>{o.order_id}</td>
                  <td>{o.person_contact ?? ''}</td>
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
    </div>
  )
}

