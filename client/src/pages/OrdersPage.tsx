import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAppSelector } from '../store/hooks'
import type { RootState } from '../store/store'
import DashboardLayout from '../components/DashboardLayout'
import PageHeader from '../components/PageHeader'
import Loader from '../components/Loader'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import { useToast } from '../components/Toast'
import { FiShoppingCart } from 'react-icons/fi'
import type { OrderCreate, OrderResponse, OrderStatus, InventoryItem } from '../types/order'
import type { CustomerCreate, CustomerExistsResponse } from '../types/customer'

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

interface GroupedReceipt {
  receiptNo: string
  anchorOrderId: number
  contact: string
  customerName: string
  date: string
  orderIds: number[]
  totalQty: number
  status: OrderStatus
  created_at: string
  created_by: number
}

export default function OrdersPage() {
  const token = useAppSelector((state: RootState) => state.auth.token)
  const currency = useAppSelector((state: RootState) => state.store.currency)
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [contact, setContact] = useState('')
  const [contactInfo, setContactInfo] = useState<string>('')
  const [contactInfoTone, setContactInfoTone] = useState<'muted' | 'success' | 'warning' | 'danger'>('muted')
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
  const [contactFilter, setContactFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Customer validation for checkout
  const [customerExists, setCustomerExists] = useState<boolean | null>(null)
  const [showCreateCustomer, setShowCreateCustomer] = useState(false)
  const [createCustomerForm, setCreateCustomerForm] = useState<CustomerCreate>({
    person_name: '',
    person_contact: '',
    person_email: '',
    person_address: '',
  })
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  // Receipt-level actions
  const [actioningReceipt, setActioningReceipt] = useState<string | null>(null)

  // Edit receipt state
  const [editingReceipt, setEditingReceipt] = useState<GroupedReceipt | null>(null)
  const [editReceiptOrders, setEditReceiptOrders] = useState<OrderResponse[]>([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const { addToast } = useToast()

  const deriveGroupStatus = (statuses: OrderStatus[]): OrderStatus => {
    if (statuses.every(s => s === 'cancelled')) return 'cancelled'
    if (statuses.some(s => s === 'pending')) return 'pending'
    if (statuses.some(s => s === 'confirmed')) return 'confirmed'
    return 'shipped'
  }

  // Client-side filtering to ensure partial contact + date ranges work regardless of backend
  const filteredOrders = useMemo(() => {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? (() => { const d = new Date(endDate); d.setHours(23,59,59,999); return d })() : null
    const contactTerm = contactFilter.trim().toLowerCase()

    return orders.filter(order => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false
      if (contactTerm && !(order.person_contact || '').toLowerCase().includes(contactTerm)) return false
      const created = order.created_at ? new Date(order.created_at) : null
      if (start && (!created || created < start)) return false
      if (end && (!created || created > end)) return false
      return true
    })
  }, [orders, statusFilter, contactFilter, startDate, endDate])

  // Group orders into receipts by person + creator within a short time window (mirrors backend receipt window)
  const groupedReceipts = useMemo(() => {
    type InternalGroup = GroupedReceipt & { lineStatuses: OrderStatus[] }

    const sorted = [...filteredOrders].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      if (bTime !== aTime) return bTime - aTime
      return (b.order_id || 0) - (a.order_id || 0)
    })

    const windowMs = 120_000 // 2 minutes
    const groups: InternalGroup[] = []

    for (const order of sorted) {
      const createdAt = order.created_at || ''
      const contact = order.person_contact || ''
      const createdBy = order.created_by
      const last = groups[groups.length - 1]
      const lastTime = last ? new Date(last.created_at).getTime() : null
      const currentTime = createdAt ? new Date(createdAt).getTime() : null
      const withinWindow = lastTime !== null && currentTime !== null && Math.abs(currentTime - lastTime) <= windowMs
      const sameContact = last ? contact === last.contact : false
      const sameCreator = last ? createdBy === last.created_by : false

      if (last && withinWindow && sameContact && sameCreator) {
        last.orderIds.push(order.order_id)
        last.totalQty += order.order_quantity || 0
        last.lineStatuses.push(order.status)
        last.status = deriveGroupStatus(last.lineStatuses)
        continue
      }

      groups.push({
        receiptNo: '', // filled after grouping
        anchorOrderId: order.order_id,
        contact,
        customerName: '',
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
      customerName: g.customerName,
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
  }, [statusFilter, contactFilter, startDate, endDate, groupedReceipts.length])

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

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
      
      // Only send status param if not "all"
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      
      // Add optional filters
      if (startDate) {
        params.start_date = new Date(startDate).toISOString()
      }
      if (endDate) {
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

  const resetContactState = () => {
    setCustomerExists(null)
    setContactInfo('')
    setContactInfoTone('muted')
  }

  const handleContactChange = (value: string) => {
    setContact(value)
    resetContactState()
  }

  const openCreateCustomerModal = (person_contact: string) => {
    setCreateCustomerForm({
      person_name: '',
      person_contact,
      person_email: '',
      person_address: '',
    })
    setShowCreateCustomer(true)
  }

  const checkContact = async (): Promise<boolean | null> => {
    if (!contact.trim()) return null
    try {
      const { data } = await api.get<CustomerExistsResponse>('/customers/check', {
        headers: authHeader,
        params: { contact: contact.trim() },
      })

      setCustomerExists(data.exists)

      if (data.exists) {
        setContactInfo(`Customer found: ${data.person_name || contact}`)
        setContactInfoTone('success')
        setShowCreateCustomer(false)
        return true
      } else {
        setContactInfo('Customer not found. Please create a customer before checkout.')
        setContactInfoTone('warning')
        openCreateCustomerModal(contact.trim())
        return false
      }
    } catch (e: any) {
      setContactInfo('Unable to check contact')
      setContactInfoTone('danger')
      setCustomerExists(null)
      return null
    }
  }

  const createCustomer = async () => {
    if (!createCustomerForm.person_name || !createCustomerForm.person_contact || !createCustomerForm.person_address) {
      addToast('warning', 'Name, contact, and address are required')
      return
    }

    setCreatingCustomer(true)
    try {
      await api.post('/customers', createCustomerForm, { headers: authHeader })
      addToast('success', 'Customer created')
      setCustomerExists(true)
      setShowCreateCustomer(false)
      setContactInfo(`Customer created: ${createCustomerForm.person_name}`)
    } catch (e: any) {
      addToast('error', extractError(e, 'Failed to create customer'))
    } finally {
      setCreatingCustomer(false)
    }
  }

  const addToCart = () => {
    if (!selectedInventoryId) {
      addToast('warning', 'Select a product')
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
      addToast('error', `Insufficient stock. Available: ${available > 0 ? available : 0}, Requested: ${selectedQty}`)
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
      addToast('error', `Cannot exceed available stock (${item.units})`)
      return
    }
    setCart(cart.map(c => c.inventoryId === inventoryId ? { ...c, quantity: newQty } : c))
  }

  const checkout = async () => {
    if (!contact) {
      addToast('warning', 'Enter customer contact')
      return
    }
    if (customerExists === false) {
      addToast('warning', 'Create this customer before checkout')
      openCreateCustomerModal(contact.trim())
      return
    }
    // If we haven't validated yet, trigger a check first
    if (customerExists === null) {
      const exists = await checkContact()
      if (exists !== true) return
    }
    if (cart.length === 0) {
      addToast('warning', 'Add items to cart')
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
        addToast('error', `Failed to create order for ${item.SKU}: ${e?.response?.data?.detail || 'Error'}`)
      }
    }
    setLoading(false)

    if (created === cart.length) {
      addToast('success', `${created} order(s) created successfully!`)
      // Snapshot created orders with statuses for receipt before clearing
      setReceiptLines(lines)
      setReceiptContact(lines.length > 0 ? (dataRefPersonContact(lines) || contact) : '')
      setCart([])
      setContact('')
      setContactInfo('')
      loadOrders()
    }
  }

  const fetchReceipt = async (anchorOrderId: number) => {
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
    setReceiptContact(data.person_contact ?? '')
    setReceiptCustomerName(data.person_name ?? '')
    setActiveReceiptOrderId(anchorOrderId)
    // use receipt created_at from API
    const created = data.created_at ? new Date(data.created_at).toLocaleString() : ''
    setReceiptCreatedAt(created)
    setReceiptStatus(lines[0]?.status ?? null)
  }

  const editReceiptQuantity = async (line: ReceiptLine) => {
    const n = prompt('New quantity', String(line.quantity))
    if (!n) return
    const nq = Number(n)
    if (Number.isNaN(nq) || nq < 1) { addToast('error', 'Invalid quantity'); return }
    try {
      await api.put(`/orders/${String(line.orderId)}`, { order_quantity: nq }, { headers: authHeader })
      if (activeReceiptOrderId) await fetchReceipt(activeReceiptOrderId)
      addToast('success', 'Quantity updated')
    } catch (e: any) {
      addToast('error', e?.response?.data?.detail || 'Failed to update quantity')
    }
  }

  const cancelReceiptLine = async (line: ReceiptLine) => {
    try {
      await api.put(`/orders/${String(line.orderId)}/status`, { status: 'cancelled' }, { headers: authHeader })
      if (activeReceiptOrderId) await fetchReceipt(activeReceiptOrderId)
      addToast('success', 'Order cancelled')
    } catch (e: any) {
      addToast('error', e?.response?.data?.detail || 'Failed to cancel')
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

  const updateReceiptStatus = async (receipt: GroupedReceipt, status: OrderStatus) => {
    setActioningReceipt(receipt.receiptNo)
    try {
      await Promise.all(
        receipt.orderIds.map(orderId => api.put(`/orders/${orderId}/status`, { status }, { headers: authHeader }))
      )
      addToast('success', `Receipt ${receipt.receiptNo} updated to ${status}`)
      await loadOrders()
      // Refresh open receipt view if it's the one we just updated
      if (activeReceiptOrderId && receipt.orderIds.includes(activeReceiptOrderId)) {
        await fetchReceipt(activeReceiptOrderId)
      }
    } catch (e: any) {
      addToast('error', extractError(e, 'Failed to update receipt'))
    } finally {
      setActioningReceipt(null)
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
      addToast('error', 'Receipt must have at least one product')
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

      addToast('success', 'Receipt updated successfully')
      setEditingReceipt(null)
      setEditReceiptOrders([])
      await loadOrders()
    } catch (e: any) {
      addToast('error', e?.response?.data?.detail || 'Failed to update receipt')
    }
  }

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        <PageHeader 
          title="Orders" 
          subtitle="Create and manage customer orders"
        />
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Shopping Cart Checkout */}
        <div className="card mb-4">
          <div className="card-header"><h5 className="mb-0">Shopping Cart Checkout</h5></div>
          <div className="card-body">
            <div className="row g-3 mb-2 align-items-center">
              <div className="col-12 col-sm-6 col-md-4">
                <label className="form-label">Customer Contact</label>
                <input className="form-control" value={contact} onChange={e => handleContactChange(e.target.value)} onBlur={checkContact} />
              </div>
              <div className="col-12 col-sm-6 col-md-4">
                <label className="form-label">Product</label>
                <select className="form-control" value={selectedInventoryId} onChange={e => setSelectedInventoryId(e.target.value ? Number(e.target.value) : '')}>
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
              <div className="col-6 col-md-2 d-flex align-items-end pt-4">
                <button className="btn btn-primary w-100" style={{ minWidth: '120px' }} onClick={addToCart}>Add</button>
              </div>
            </div>
            {contactInfo && (
              <div className="mb-3">
                <small className={`text-${contactInfoTone}`}>{contactInfo}</small>
              </div>
            )}

            {/* Cart */}
            <h6>Cart ({cart.length} items)</h6>
            {cart.length === 0 ? (
              <p className="text-muted">Cart is empty</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-interactive table-sm">
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
                <select className="form-control form-select-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
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
                {/* <button className="btn btn-primary btn-sm flex-grow-1 flex-md-grow-0" onClick={loadOrders}>Apply</button> */}
                <button className="btn btn-outline-secondary btn-sm flex-grow-1 flex-md-grow-0 text-white" onClick={() => { 
                  setStatusFilter('all'); 
                  setContactFilter(''); 
                  setStartDate(''); 
                  setEndDate('');
                  // Reset and reload with default filters
                  setTimeout(() => loadOrders(), 0);
                }}>Reset</button>
              </div>
            </div>

            {loading ? (
              <Loader message="Loading orders..." />
            ) : orders.length === 0 ? (
              <EmptyState 
                title="No orders found" 
                description="Orders matching your filters will appear here" 
                icon={<FiShoppingCart />}
              />
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-interactive">
                    <thead className="table-light">
                      <tr>
                        <th>Receipt No.</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Total Qty</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedReceipts.map(receipt => (
                        <tr key={receipt.receiptNo} onClick={() => fetchReceipt(receipt.anchorOrderId)}>
                          <td className="fw-medium">{receipt.receiptNo}</td>
                          <td>{receipt.contact}</td>
                          <td>{receipt.date}</td>
                          <td><StatusBadge status={receipt.status} /></td>
                          <td>{receipt.totalQty}</td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-info table-action-btn text-white" onClick={(e) => { e.stopPropagation(); navigate(`/orders/${receipt.orderIds[0]}`) }}>View</button>
                              {receipt.status === 'pending' && (
                                <>
                                  <button className="btn btn-outline-secondary table-action-btn" onClick={(e) => { e.stopPropagation(); startEditReceipt(receipt) }}>Edit</button>
                                  <button className="btn btn-success table-action-btn" onClick={(e) => { e.stopPropagation(); updateReceiptStatus(receipt, 'confirmed') }} disabled={actioningReceipt === receipt.receiptNo}>Confirm</button>
                                  <button className="btn btn-danger table-action-btn" onClick={(e) => { e.stopPropagation(); updateReceiptStatus(receipt, 'cancelled') }} disabled={actioningReceipt === receipt.receiptNo}>Cancel</button>
                                </>
                              )}
                              {receipt.status === 'confirmed' && (
                                <>
                                  <button className="btn btn-primary table-action-btn" onClick={(e) => { e.stopPropagation(); updateReceiptStatus(receipt, 'shipped') }} disabled={actioningReceipt === receipt.receiptNo}>Ship</button>
                                  <button className="btn btn-danger table-action-btn" onClick={(e) => { e.stopPropagation(); updateReceiptStatus(receipt, 'cancelled') }} disabled={actioningReceipt === receipt.receiptNo}>Cancel</button>
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
              </>
            )}
          </div>
        </div>

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
                            <td>{inventory.find(i => i.inventory_id === order.inventory_id)?.prod_name ?? 'Unknown'}</td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={order.order_quantity}
                                min={1}
                                max={inventory.find(i => i.inventory_id === order.inventory_id)?.units || 999}
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

        {/* Create Customer Modal */}
        {showCreateCustomer && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowCreateCustomer(false)}>
            <div className="modal-dialog" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Create Customer</h5>
                  <button type="button" className="btn-close" onClick={() => setShowCreateCustomer(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Contact</label>
                    <input className="form-control" value={createCustomerForm.person_contact} disabled />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control"
                      value={createCustomerForm.person_name}
                      onChange={e => setCreateCustomerForm({ ...createCustomerForm, person_name: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      className="form-control"
                      type="email"
                      value={createCustomerForm.person_email}
                      onChange={e => setCreateCustomerForm({ ...createCustomerForm, person_email: e.target.value })}
                      placeholder="Email (optional)"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Address</label>
                    <input
                      className="form-control"
                      value={createCustomerForm.person_address}
                      onChange={e => setCreateCustomerForm({ ...createCustomerForm, person_address: e.target.value })}
                      placeholder="Address"
                    />
                  </div>
                  <div className="alert alert-info mb-0">This contact does not exist. Please create the customer to continue checkout.</div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setShowCreateCustomer(false)} disabled={creatingCustomer}>Cancel</button>
                  <button className="btn btn-primary" onClick={createCustomer} disabled={creatingCustomer}>
                    {creatingCustomer ? 'Creating...' : 'Create Customer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

