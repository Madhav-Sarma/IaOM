import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAppSelector } from '../store/hooks'
import type { RootState } from '../store/store'
import DashboardLayout from '../components/DashboardLayout'
import StatusBadge from '../components/StatusBadge'
import type { OrderStatus } from '../types/order'

interface OrderDetail {
  order_id: number
  status: OrderStatus
  inventory_id: number
  order_quantity: number
  person_id: number
  created_by: number
  person_name: string
  person_contact: string
  person_email: string
  person_address: string
  created_at: string
  unit_price: number
  SKU: string
  prod_name: string
}

interface ReceiptLine {
  order_id: number
  status: OrderStatus
  inventory_id: number
  SKU: string
  prod_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export default function OrderDetailsPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const token = useAppSelector((state: RootState) => state.auth.token)
  const currency = useAppSelector((state: RootState) => state.store.currency)
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [receiptLines, setReceiptLines] = useState<ReceiptLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (orderId) {
      loadOrderDetails()
    }
  }, [orderId])

  const loadOrderDetails = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch receipt data which includes all related order lines
      const { data } = await api.get(`/orders/${orderId}/receipt`, { headers: authHeader })
      
      // Set the main order info from receipt
      if (data.lines && data.lines.length > 0) {
        const mainLine = data.lines.find((l: any) => l.order_id === Number(orderId)) || data.lines[0]
        setOrder({
          order_id: Number(orderId),
          status: mainLine.status,
          inventory_id: mainLine.inventory_id,
          order_quantity: mainLine.quantity,
          person_id: data.person_id || 0,
          created_by: 0,
          person_name: data.person_name || '',
          person_contact: data.person_contact || '',
          person_email: data.person_email || '',
          person_address: data.person_address || '',
          created_at: data.created_at || '',
          unit_price: mainLine.unit_price,
          SKU: mainLine.SKU,
          prod_name: mainLine.prod_name,
        })
      }

      // Set all receipt lines
      const lines: ReceiptLine[] = (data.lines || []).map((l: any) => ({
        order_id: l.order_id,
        status: l.status as OrderStatus,
        inventory_id: Number(l.inventory_id),
        SKU: l.SKU,
        prod_name: l.prod_name,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price ?? 0),
        subtotal: Number(l.subtotal ?? 0),
      }))
      setReceiptLines(lines)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load order details')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (newStatus: OrderStatus) => {
    if (!order) return
    try {
      await api.put(`/orders/${order.order_id}/status`, { status: newStatus }, { headers: authHeader })
      loadOrderDetails()
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update status')
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const grandTotal = receiptLines.reduce((sum, l) => sum + l.subtotal, 0)

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <button className="btn btn-outline-secondary me-3 text-white" onClick={() => navigate('/orders')}>
              ← Back to Orders
            </button>
            <span className="h4 fw-bold mb-0">Receipt #{orderId}</span>
          </div>
          {order && <StatusBadge status={order.status} />}
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : order ? (
          <div className="row">
            {/* Order Info Card */}
            <div className="col-lg-4 mb-4">
              <div className="card h-100">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0">Order Information</h5>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-5">Receipt No.</dt>
                    <dd className="col-sm-7 fw-bold">#{order.order_id}</dd>

                    <dt className="col-sm-5">Status</dt>
                    <dd className="col-sm-7"><StatusBadge status={order.status} /></dd>

                    <dt className="col-sm-5 text-primary">Created Date</dt>
                    <dd className="col-sm-7">
                      <strong className="text-primary">{formatShortDate(order.created_at)}</strong>
                    </dd>

                    <dt className="col-sm-5 text-primary">Created Time</dt>
                    <dd className="col-sm-7">
                      <strong className="text-primary">
                        {order.created_at ? new Date(order.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }) : 'N/A'}
                      </strong>
                    </dd>
                  </dl>

                  <hr />

                  <div className="bg-light p-3 rounded">
                    <small className="text-muted d-block mb-1">Full Timestamp</small>
                    <span className="fw-medium">{formatDate(order.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info Card */}
            <div className="col-lg-4 mb-4">
              <div className="card h-100">
                <div className="card-header bg-success text-white">
                  <h5 className="mb-0">Customer Information</h5>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-4">Name</dt>
                    <dd className="col-sm-8 fw-bold">{order.person_name || 'N/A'}</dd>

                    <dt className="col-sm-4">Contact</dt>
                    <dd className="col-sm-8">
                      <a href={`/customers/${order.person_contact}`} className="text-decoration-none fw-bold">
                        {order.person_contact}
                      </a>
                    </dd>

                    <dt className="col-sm-4">Email</dt>
                    <dd className="col-sm-8">{order.person_email || 'N/A'}</dd>

                    <dt className="col-sm-4">Address</dt>
                    <dd className="col-sm-8">{order.person_address || 'N/A'}</dd>
                  </dl>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="col-lg-4 mb-4">
              <div className="card h-100">
                <div className="card-header bg-warning">
                  <h5 className="mb-0">Actions</h5>
                </div>
                <div className="card-body">
                  <div className="d-grid gap-2">
                    {order.status === 'pending' && (
                      <>
                        <button className="btn btn-success" onClick={() => updateStatus('confirmed')}>
                          ✓ Confirm Order
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => updateStatus('cancelled')}>
                          ✗ Cancel Order
                        </button>
                      </>
                    )}
                    {order.status === 'confirmed' && (
                      <>
                        <button className="btn btn-primary" onClick={() => updateStatus('shipped')}>
                          📦 Mark as Shipped
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => updateStatus('cancelled')}>
                          ✗ Cancel Order
                        </button>
                      </>
                    )}
                    {order.status === 'shipped' && (
                      <div className="alert alert-success mb-0">
                        <strong>✓ Order Completed</strong><br />
                        This order has been shipped.
                      </div>
                    )}
                    {order.status === 'cancelled' && (
                      <div className="alert alert-danger mb-0">
                        <strong>✗ Order Cancelled</strong><br />
                        This order was cancelled.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items Table */}
            <div className="col-12">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Receipt</h5>
                  <div className="text-muted">
                    <strong>Customer:</strong> {order.person_name} ({order.person_contact}) | 
                    <strong> Created:</strong> {formatDate(order.created_at)}
                  </div>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-interactive">
                      <thead className="table-light">
                        <tr>
                          <th>Receipt No.</th>
                          <th>Status</th>
                          <th>SKU</th>
                          <th>Product</th>
                          <th className="text-end">Qty</th>
                          <th className="text-end">Unit Price</th>
                          <th className="text-end">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiptLines.map(line => (
                          <tr key={line.order_id} className={line.order_id === Number(orderId) ? 'table-active' : ''}>
                            <td>
                              {line.order_id === Number(orderId) ? (
                                <strong>#{line.order_id}</strong>
                              ) : (
                                <a href={`/orders/${line.order_id}`}>#{line.order_id}</a>
                              )}
                            </td>
                            <td><StatusBadge status={line.status} /></td>
                            <td>{line.SKU}</td>
                            <td>{line.prod_name}</td>
                            <td className="text-end">{line.quantity}</td>
                            <td className="text-end">{currency}{line.unit_price.toFixed(2)}</td>
                            <td className="text-end">{currency}{line.subtotal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="table-light">
                        <tr>
                          <th colSpan={6} className="text-end">Grand Total:</th>
                          <th className="text-end">{currency}{grandTotal.toFixed(2)}</th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="alert alert-warning">Order not found</div>
        )}
      </div>
    </DashboardLayout>
  )
}
