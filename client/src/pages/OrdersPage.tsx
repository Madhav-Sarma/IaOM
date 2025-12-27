import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import DashboardLayout from '../components/DashboardLayout'
import StatusBadge from '../components/StatusBadge'
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
  const { currency } = useStore()
  const navigate = useNavigate()
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
  const [receiptCustomerName, setReceiptCustomerName] = useState<string>('')
  const [receiptCreatedAt, setReceiptCreatedAt] = useState<string>('')
  const [receiptStatus, setReceiptStatus] = useState<OrderStatus | null>(null)
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | ''>('')
  const [selectedQty, setSelectedQty] = useState<number>(1)

  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [previousOnly, setPreviousOnly] = useState<boolean>(false)
  const [contactFilter, setContactFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Edit order state
  const [editingOrder, setEditingOrder] = useState<OrderResponse | null>(null)
  const [editOrderQty, setEditOrderQty] = useState<number>(1)

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
    
    // Calculate total quantity including what's already in cart
    const existingInCart = cart.find(c => c.inventoryId === selectedInventoryId)
    const totalQty = (existingInCart?.quantity || 0) + selectedQty
    
    // Check against available inventory
    if (totalQty > item.units) {
      const available = item.units - (existingInCart?.quantity || 0)
      alert(`Insufficient stock. Available: ${available > 0 ? available : 0}, Requested: ${selectedQty}`)
      return
    }
    
    // Check if already in cart
    if (existingInCart) {
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

  const updateCartQty = (inventoryId: number, newQty: number) => {
    const item = inventory.find(i => i.inventory_id === inventoryId)
    if (!item) return
    if (newQty < 1) {
      removeFromCart(inventoryId)
      return
    }
    if (newQty > item.units) {
      alert(`Cannot exceed available stock (${item.units})`)
      return
    }
    setCart(cart.map(c => c.inventoryId === inventoryId ? { ...c, quantity: newQty } : c))
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
    setReceiptCustomerName(data.person_name ?? '')
    setActiveReceiptOrderId(orderId)
    // use receipt created_at from API
    const created = data.created_at ? new Date(data.created_at).toLocaleString() : ''
    setReceiptCreatedAt(created)
    setReceiptStatus(lines[0]?.status ?? null)
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

  // Edit order functions
  const startEditOrder = (o: OrderResponse) => {
    setEditingOrder(o)
    setEditOrderQty(o.order_quantity)
  }

  const cancelEditOrder = () => {
    setEditingOrder(null)
    setEditOrderQty(1)
  }

  const saveOrderEdit = async () => {
    if (!editingOrder) return
    try {
      const { data } = await api.put<OrderResponse>(
        `/orders/${editingOrder.order_id}`,
        { order_quantity: editOrderQty },
        { headers: authHeader }
      )
      setOrders(orders.map(x => x.order_id === editingOrder.order_id ? data : x))
      setEditingOrder(null)
      setEditOrderQty(1)
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to update order')
    }
  }

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        <h3 className="fw-bold mb-4">Orders</h3>
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Shopping Cart Checkout */}
        <div className="card mb-4">
          <div className="card-header"><h5 className="mb-0">Shopping Cart Checkout</h5></div>
          <div className="card-body">
            <div className="row g-3 mb-3">
              <div className="col-12 col-sm-6 col-md-4">
                <label className="form-label">Customer Contact</label>
                <input className="form-control" value={contact} onChange={e => setContact(e.target.value)} onBlur={checkContact} />
                {contactInfo && <small className="text-muted">{contactInfo}</small>}
              </div>
              <div className="col-12 col-sm-6 col-md-4">
                <label className="form-label">Product</label>
                <select className="form-select" value={selectedInventoryId} onChange={e => setSelectedInventoryId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Select item</option>
                  {inventory.length === 0 && <option value="" disabled>No products</option>}
                  {inventory.map(i => (
                    <option key={i.inventory_id} value={i.inventory_id}>
                      {i.SKU} - {i.prod_name} (units: {i.units})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label">Qty</label>
                <input 
                  className="form-control" 
                  type="number" 
                  min={1} 
                  max={selectedInventoryId ? (inventory.find(i => i.inventory_id === selectedInventoryId)?.units || 1) - (cart.find(c => c.inventoryId === selectedInventoryId)?.quantity || 0) : undefined}
                  value={selectedQty} 
                  onChange={e => setSelectedQty(Math.max(1, Number(e.target.value)))} 
                />
                {selectedInventoryId && (
                  <small className="text-muted">
                    Available: {Math.max(0, (inventory.find(i => i.inventory_id === selectedInventoryId)?.units || 0) - (cart.find(c => c.inventoryId === selectedInventoryId)?.quantity || 0))}
                  </small>
                )}
              </div>
              <div className="col-6 col-md-2 d-flex align-items-end">
                <button className="btn btn-primary w-100" onClick={addToCart}>Add</button>
              </div>
            </div>

            {/* Cart */}
            <h6>Cart ({cart.length} items)</h6>
            {cart.length === 0 ? (
              <p className="text-muted">Cart is empty</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>SKU</th>
                      <th>Product</th>
                      <th style={{ width: '100px' }}>Qty</th>
                      <th>Price</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => {
                      const invItem = inventory.find(i => i.inventory_id === item.inventoryId)
                      const maxQty = invItem?.units || item.quantity
                      return (
                        <tr key={item.inventoryId}>
                          <td>{item.SKU}</td>
                          <td>{item.prodName}</td>
                          <td>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              min={1}
                              max={maxQty}
                              value={item.quantity}
                              onChange={e => updateCartQty(item.inventoryId, Number(e.target.value))}
                              style={{ width: '70px' }}
                            />
                          </td>
                          <td>{currency}{item.unitPrice.toFixed(2)}</td>
                          <td>{currency}{(item.unitPrice * item.quantity).toFixed(2)}</td>
                          <td><button className="btn btn-sm btn-outline-danger" onClick={() => removeFromCart(item.inventoryId)}>×</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {cart.length > 0 && (
              <div className="text-end mb-3"><strong>Total: {currency}{cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0).toFixed(2)}</strong></div>
            )}
            <div className="d-flex gap-2">
              <button className="btn btn-success" onClick={checkout} disabled={loading || cart.length === 0}>
                {loading ? 'Checking out...' : 'Checkout'}
              </button>
              <button className="btn btn-secondary" onClick={() => setCart([])}>Clear</button>
            </div>
          </div>
        </div>

        {/* Receipt */}
        {receiptLines.length > 0 && (
          <div className="card mb-4 border-dashed">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-1">Receipt</h5>
                <small className="text-muted">
                  <strong>Customer:</strong> {receiptCustomerName || '—'} ({receiptContact || '—'}) | 
                  <strong> Created:</strong> {receiptCreatedAt || '—'}
                </small>
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
                        <td>{currency}{line.unitPrice.toFixed(2)}</td>
                        <td>{currency}{line.subtotal.toFixed(2)}</td>
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
              <div className="text-end"><strong>Grand Total: {currency}{receiptLines.reduce((sum, l) => sum + l.subtotal, 0).toFixed(2)}</strong></div>
            </div>
          </div>
        )}

        {/* Order List with Filters */}
        <div className="card">
          <div className="card-header"><h5 className="mb-0">Order History</h5></div>
          <div className="card-body">
            <div className="row g-2 g-md-3 mb-3">
              <div className="col-6 col-sm-4 col-md-2">
                <label className="form-label">Status</label>
                <select className="form-select form-select-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="shipped">Shipped</option>
                </select>
              </div>
              <div className="col-6 col-sm-4 col-md-2">
                <label className="form-label">Customer</label>
                <input className="form-control form-control-sm" value={contactFilter} onChange={e => setContactFilter(e.target.value)} placeholder="Contact" />
              </div>
              <div className="col-6 col-sm-4 col-md-2">
                <label className="form-label">Start</label>
                <input className="form-control form-control-sm" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="col-6 col-sm-4 col-md-2">
                <label className="form-label">End</label>
                <input className="form-control form-control-sm" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div className="col-12 col-sm-8 col-md-4 d-flex align-items-end gap-2">
                <button className="btn btn-primary btn-sm flex-grow-1 flex-md-grow-0" onClick={loadOrders}>Apply</button>
                <button className="btn btn-outline-secondary btn-sm flex-grow-1 flex-md-grow-0" onClick={() => { setStatusFilter('all'); setContactFilter(''); setStartDate(''); setEndDate(''); setPreviousOnly(false); loadOrders() }}>Reset</button>
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
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Qty</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.filter(o => {
                      if (previousOnly && o.status === 'pending') return false
                      if (statusFilter === 'all') return true
                      return o.status === statusFilter
                    }).map(o => (
                      <tr key={o.order_id} onClick={() => fetchReceipt(o.order_id)} style={{ cursor: 'pointer' }}>
                        <td>#{o.order_id}</td>
                        <td>{o.person_contact ?? ''}</td>
                        <td><StatusBadge status={o.status} /></td>
                        <td>{o.order_quantity}</td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-info" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${o.order_id}`) }}>View</button>
                            {o.status === 'pending' && (
                              <>
                                <button className="btn btn-outline-secondary" onClick={(e) => { e.stopPropagation(); startEditOrder(o) }}>Edit</button>
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

        {/* Edit Order Modal */}
        {editingOrder && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={cancelEditOrder}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit Order #{editingOrder.order_id}</h5>
                  <button type="button" className="btn-close" onClick={cancelEditOrder}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Customer</label>
                    <input className="form-control" value={editingOrder.person_contact ?? ''} disabled />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Product</label>
                    <input className="form-control" value={inventory.find(i => i.inventory_id === editingOrder.inventory_id)?.prod_name ?? ''} disabled />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editOrderQty}
                      min={1}
                      max={inventory.find(i => i.inventory_id === editingOrder.inventory_id)?.units || 999}
                      onChange={e => setEditOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <small className="text-muted">
                      Available: {inventory.find(i => i.inventory_id === editingOrder.inventory_id)?.units ?? 'N/A'}
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={cancelEditOrder}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveOrderEdit}>Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

