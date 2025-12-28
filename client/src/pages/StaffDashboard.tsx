import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setSettings } from '../store/storeSlice'
import type { RootState } from '../store/store'
import DashboardLayout from '../components/DashboardLayout'
import PageHeader from '../components/PageHeader'
import Loader from '../components/Loader'
import StatusBadge from '../components/StatusBadge'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { FiClock, FiTrendingUp } from 'react-icons/fi'

interface RecentOrder {
  order_id: number
  person_contact: string
  status: 'pending' | 'confirmed' | 'shipped' | 'cancelled'
  order_quantity: number
  created_at: string
}

interface TopProduct {
  SKU: string
  prod_name: string
  totalQuantity: number
  totalSales: number
}

interface ChartDataPoint {
  name: string
  quantity: number
  sales: number
}

export default function StaffDashboard() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((state: RootState) => state.auth.token)
  const currency = useAppSelector((state: RootState) => state.store.currency)
  const navigate = useNavigate()
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Load store settings (including currency)
      try {
        const settingsRes = await api.get('/store/settings', { headers: authHeader })
        dispatch(setSettings(settingsRes.data))
      } catch (err) {
        console.error('Failed to load store settings:', err)
      }

      // Fetch all orders (recent ones)
      const ordersRes = await api.get('/orders', {
        headers: authHeader,
        params: {
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      })

      const allOrders = ordersRes.data

      // Get recent orders (limit to 10)
      const recent = allOrders
        .sort((a: any, b: any) => {
          const dateA = new Date(a.created_at).getTime()
          const dateB = new Date(b.created_at).getTime()
          return dateB - dateA
        })
        .slice(0, 10)

      setRecentOrders(
        recent.map((o: any) => ({
          order_id: o.order_id,
          person_contact: o.person_contact || 'N/A',
          status: o.status,
          order_quantity: o.order_quantity,
          created_at: new Date(o.created_at).toLocaleString(),
        }))
      )

      // Fetch inventory to find top-selling products
      const inventoryRes = await api.get('/orders/inventory', { headers: authHeader })
      const inventory = inventoryRes.data

      // Aggregate quantities and sales by product (confirmed and shipped orders count as sales)
      const productQuantities: Record<string, { SKU: string; prod_name: string; quantity: number; sales: number; unitPrice: number }> = {}

      allOrders
        .filter((order: any) => order.status === 'confirmed' || order.status === 'shipped')
        .forEach((order: any) => {
          const invId = order.inventory_id
          const inv = inventory.find((i: any) => i.inventory_id === invId)
          if (inv) {
            const key = inv.product_id
            const unitPrice = order.unit_price || inv.unit_price || 0
            if (!productQuantities[key]) {
              productQuantities[key] = {
                SKU: inv.SKU,
                prod_name: inv.prod_name,
                quantity: 0,
                sales: 0,
                unitPrice: unitPrice,
              }
            }
            productQuantities[key].quantity += order.order_quantity || 0
            productQuantities[key].sales += (order.order_quantity || 0) * unitPrice
          }
        })

      // Sort and get top 5
      const topFive = Object.values(productQuantities)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5)
        .map(p => ({ SKU: p.SKU, prod_name: p.prod_name, totalQuantity: p.quantity, totalSales: Math.round(p.sales * 100) / 100 }))

      setTopProducts(topFive)

      // Chart data
      setChartData(
        topFive.map((p) => ({
          name: p.SKU,
          quantity: p.totalQuantity,
          sales: p.totalSales,
        }))
      )
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err)
      setError(err?.response?.data?.detail || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        <PageHeader 
          title="Staff Dashboard" 
          subtitle="Manage orders and track top-selling products"
        />

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && <Loader message="Loading dashboard data..." />}

        {!loading && (
          <>
            {/* Recent Orders */}
            <div className="card mb-4">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <FiClock size={24} className="text-primary" />
                  <h5 className="card-title mb-0">Recent Orders</h5>
                </div>
                <p className="text-muted small mb-4">Click any row to view order details</p>

                {recentOrders.length === 0 ? (
                  <p className="text-muted text-center py-4">No orders found</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-interactive">
                      <thead className="table-light">
                        <tr>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Status</th>
                          <th>Quantity</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => (
                          <tr key={order.order_id} onClick={() => navigate(`/orders/${order.order_id}`)}>
                            <td className="fw-medium">#{order.order_id}</td>
                            <td>{order.person_contact}</td>
                            <td><StatusBadge status={order.status} /></td>
                            <td>{order.order_quantity}</td>
                            <td className="small text-muted">{order.created_at}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Top Selling Products */}
            <div className="card mb-4">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <FiTrendingUp size={24} className="text-success" />
                  <h5 className="card-title mb-0">Top 5 Selling Products (Last 30 Days)</h5>
                </div>
                <p className="text-muted small mb-4">Click rows to view all products</p>

                {topProducts.length === 0 ? (
                  <p className="text-muted text-center py-4">No sales data available</p>
                ) : (
                  <div className="row">
                    {/* Table */}
                    <div className="col-lg-6 mb-4 mb-lg-0">
                      <div className="table-responsive">
                        <table className="table table-interactive">
                          <thead className="table-light">
                            <tr>
                              <th>SKU</th>
                              <th>Product</th>
                              <th className="text-end">Qty Sold</th>
                              <th className="text-end">Sales ({currency})</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topProducts.map((product) => (
                              <tr key={product.SKU} onClick={() => navigate('/products')}>
                                <td className="fw-medium">{product.SKU}</td>
                                <td>{product.prod_name}</td>
                                <td className="text-end">
                                  <span className="badge bg-primary-subtle text-primary-emphasis">
                                    {product.totalQuantity}
                                  </span>
                                </td>
                                <td className="text-end">
                                  <span className="badge bg-success-subtle text-success-emphasis">
                                    {currency}{product.totalSales.toFixed(2)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="col-lg-6">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />
                          <XAxis dataKey="name" stroke="#6c757d" />
                          <YAxis yAxisId="left" stroke="#6c757d" />
                          <YAxis yAxisId="right" orientation="right" stroke="#6c757d" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #dee2e6',
                              borderRadius: '6px',
                            }}
                          />
                          <Legend />
                          <Bar
                            yAxisId="left"
                            dataKey="quantity"
                            fill="#0d6efd"
                            name="Quantity"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            yAxisId="right"
                            dataKey="sales"
                            fill="#198754"
                            name={`Sales (${currency})`}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="alert alert-info" role="alert">
              <strong>💡 Quick Tips:</strong>
              <ul className="mb-0 mt-2">
                <li>Monitor recent orders to ensure timely fulfillment</li>
                <li>Focus on top-selling products for stock planning</li>
                <li>Check pending orders regularly for customer follow-ups</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
