import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setSettings } from '../store/storeSlice'
import type { RootState } from '../store/store'
import DashboardLayout from '../components/DashboardLayout'
import PageHeader from '../components/PageHeader'
import Loader from '../components/Loader'
import MetricCard from '../components/MetricCard'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  FiTrendingUp,
  FiPackage,
  FiAlertTriangle,
  FiDollarSign,
} from 'react-icons/fi'

interface KPIData {
  activeProducts: number
  ordersLast7Days: number
  lowStockProducts: number
  totalSalesLast30Days: number
}

interface ChartDataPoint {
  date: string
  fullDate: string
  orders: number
  sales: number
}

interface ProductContribution {
  name: string
  value: number
  percentage: number
}

interface DayDetail {
  date: string
  products: Array<{
    name: string
    sku: string
    quantity: number
    revenue: number
  }>
  totalRevenue: number
  totalOrders: number
}

export default function AdminDashboard() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((state: RootState) => state.auth.token)
  const currency = useAppSelector((state: RootState) => state.store.currency)
  const navigate = useNavigate()
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const [kpis, setKpis] = useState<KPIData>({
    activeProducts: 0,
    ordersLast7Days: 0,
    lowStockProducts: 0,
    totalSalesLast30Days: 0,
  })

  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [productContributions, setProductContributions] = useState<ProductContribution[]>([])
  const [selectedDayDetail, setSelectedDayDetail] = useState<DayDetail | null>(null)
  const [allOrdersData, setAllOrdersData] = useState<any[]>([])
  const [inventoryData, setInventoryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const COLORS = ['#0d6efd', '#6610f2', '#6f42c1', '#d63384', '#dc3545', '#fd7e14', '#ffc107', '#198754', '#20c997', '#0dcaf0']

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

      // Fetch products to count active ones
      const productsRes = await api.get('/products', { headers: authHeader })
      const activeProducts = productsRes.data.length

      // Fetch orders to calculate KPIs
      const ordersRes = await api.get('/orders', {
        headers: authHeader,
        params: {
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      })

      const allOrders = ordersRes.data
      setAllOrdersData(allOrders)
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Calculate confirmed/shipped orders in last 7 days
      const ordersLast7Days = allOrders.filter((o: any) => {
        const orderDate = new Date(o.created_at)
        return orderDate >= sevenDaysAgo && (o.status === 'confirmed' || o.status === 'shipped')
      }).length

      // Fetch inventory to find low-stock items
      const inventoryRes = await api.get('/orders/inventory', { headers: authHeader })
      const inventory = inventoryRes.data
      setInventoryData(inventory)
      
      // For now, consider anything with < 10 units as low-stock
      // In a real app, you'd fetch store settings for the threshold
      const lowStockProducts = inventory.filter((item: any) => item.units < 10).length

      // Calculate total sales (confirmed and shipped orders count as sales)
      const totalSalesLast30Days = allOrders
        .filter((order: any) => order.status === 'confirmed' || order.status === 'shipped')
        .reduce((sum: number, order: any) => {
          const unitPrice = order.unit_price || 0
          const quantity = order.order_quantity || 0
          return sum + unitPrice * quantity
        }, 0)

      setKpis({
        activeProducts,
        ordersLast7Days,
        lowStockProducts,
        totalSalesLast30Days,
      })

      // Calculate product contributions to sales
      const productSales: Record<string, { name: string; sales: number }> = {}
      allOrders
        .filter((o: any) => o.status === 'confirmed' || o.status === 'shipped')
        .forEach((order: any) => {
          const inv = inventory.find((i: any) => i.inventory_id === order.inventory_id)
          if (inv) {
            const key = inv.prod_name
            const orderSales = (order.unit_price || 0) * (order.order_quantity || 0)
            if (!productSales[key]) {
              productSales[key] = { name: key, sales: 0 }
            }
            productSales[key].sales += orderSales
          }
        })

      const contributions = Object.values(productSales)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10)
        .map(p => ({
          name: p.name,
          value: Math.round(p.sales * 100) / 100,
          percentage: Math.round((p.sales / totalSalesLast30Days) * 100 * 100) / 100,
        }))
      setProductContributions(contributions)

      // Generate chart data (only confirmed orders count for sales)
      const chartData: ChartDataPoint[] = []
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })

        const dayOrders = allOrders.filter((o: any) => {
          const orderDate = new Date(o.created_at)
          return orderDate.toDateString() === date.toDateString() && (o.status === 'confirmed' || o.status === 'shipped')
        }).length

        const daySales = allOrders
          .filter((o: any) => {
            const orderDate = new Date(o.created_at)
            return orderDate.toDateString() === date.toDateString() && (o.status === 'confirmed' || o.status === 'shipped')
          })
          .reduce((sum: number, order: any) => {
            return sum + ((order.unit_price || 0) * (order.order_quantity || 0))
          }, 0)

        chartData.push({
          date: dateStr,
          fullDate: date.toDateString(),
          orders: dayOrders,
          sales: Math.round(daySales * 100) / 100,
        })
      }
      setChartData(chartData)
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err)
      setError(err?.response?.data?.detail || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleChartClick = (data: any) => {
    if (!data || !data.activePayload) return
    const clickedData = data.activePayload[0]?.payload
    if (!clickedData) return

    const clickedDate = clickedData.fullDate
    
    // Filter orders for that specific day
    const dayOrders = allOrdersData.filter((o: any) => {
      const orderDate = new Date(o.created_at)
      return orderDate.toDateString() === clickedDate && (o.status === 'confirmed' || o.status === 'shipped')
    })

    // Calculate products sold on that day
    const productMap: Record<string, { name: string; sku: string; quantity: number; revenue: number }> = {}
    dayOrders.forEach((order: any) => {
      const inv = inventoryData.find((i: any) => i.inventory_id === order.inventory_id)
      if (inv) {
        const key = inv.product_id
        if (!productMap[key]) {
          productMap[key] = {
            name: inv.prod_name,
            sku: inv.SKU,
            quantity: 0,
            revenue: 0,
          }
        }
        productMap[key].quantity += order.order_quantity || 0
        productMap[key].revenue += (order.unit_price || 0) * (order.order_quantity || 0)
      }
    })

    const products = Object.values(productMap).sort((a, b) => b.revenue - a.revenue)
    const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0)

    setSelectedDayDetail({
      date: clickedData.date,
      products,
      totalRevenue,
      totalOrders: dayOrders.length,
    })
  }

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        <PageHeader 
          title="Admin Dashboard" 
          subtitle="Overview of your inventory and order management system"
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
            {/* KPI Cards */}
            <div className="row g-4 mb-4">
              <div className="col-12 col-md-6 col-lg-3" onClick={() => navigate('/products')} style={{ cursor: 'pointer' }}>
                <MetricCard
                  title="Active Products"
                  value={kpis.activeProducts}
                  subtitle="Total products in catalog"
                  icon={<FiPackage />}
                  color="primary"
                />
              </div>
              <div className="col-12 col-md-6 col-lg-3" onClick={() => navigate('/orders')} style={{ cursor: 'pointer' }}>
                <MetricCard
                  title="Confirmed Orders (7 Days)"
                  value={kpis.ordersLast7Days}
                  subtitle="Recent confirmed sales"
                  icon={<FiTrendingUp />}
                  color="success"
                />
              </div>
              <div className="col-12 col-md-6 col-lg-3" onClick={() => navigate('/products')} style={{ cursor: 'pointer' }}>
                <MetricCard
                  title="Low Stock Products"
                  value={kpis.lowStockProducts}
                  subtitle="Below 10 units"
                  icon={<FiAlertTriangle />}
                  color="warning"
                />
              </div>
              <div className="col-12 col-md-6 col-lg-3" onClick={() => navigate('/orders')} style={{ cursor: 'pointer' }}>
                <MetricCard
                  title="Total Sales (30 Days)"
                  value={`${currency}${kpis.totalSalesLast30Days.toFixed(2)}`}
                  subtitle="Revenue generated"
                  icon={<FiDollarSign />}
                  color="success"
                />
              </div>
            </div>

            {/* Charts Row */}
            <div className="row g-4 mb-4">
              {/* Sales Trend Chart */}
              <div className="col-lg-8">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title mb-1">Orders & Sales Trend (Last 30 Days)</h5>
                    <p className="text-muted small mb-4">Click on any bar to see detailed product breakdown</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData} onClick={handleChartClick}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />
                        <XAxis dataKey="date" stroke="#6c757d" />
                        <YAxis yAxisId="left" stroke="#6c757d" />
                        <YAxis yAxisId="right" orientation="right" stroke="#6c757d" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #dee2e6',
                            borderRadius: '6px',
                          }}
                          cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                        />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="orders"
                          fill="#0d6efd"
                          name="Orders"
                          radius={[4, 4, 0, 0]}
                          cursor="pointer"
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="sales"
                          fill="#198754"
                          name={`Sales (${currency})`}
                          radius={[4, 4, 0, 0]}
                          cursor="pointer"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Product Contribution Pie Chart */}
              <div className="col-lg-4">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title mb-4">Top Products by Revenue</h5>
                    {productContributions.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={productContributions}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry) => `${entry.percentage}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {productContributions.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: any) => `${currency}${value.toFixed(2)}`}
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #dee2e6',
                                borderRadius: '6px',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-3">
                          {productContributions.slice(0, 5).map((product, index) => (
                            <div key={index} className="d-flex align-items-center justify-content-between mb-2">
                              <div className="d-flex align-items-center gap-2">
                                <div
                                  style={{
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: COLORS[index % COLORS.length],
                                    borderRadius: '2px',
                                  }}
                                />
                                <span className="small">{product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name}</span>
                              </div>
                              <span className="badge bg-success-subtle text-success-emphasis">
                                {currency}{product.value.toFixed(0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-muted text-center py-4">No sales data available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Day Detail Modal */}
            {selectedDayDetail && (
              <div
                className="modal show d-block"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                onClick={() => setSelectedDayDetail(null)}
              >
                <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">Sales Details - {selectedDayDetail.date}</h5>
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => setSelectedDayDetail(null)}
                      />
                    </div>
                    <div className="modal-body">
                      <div className="row mb-4">
                        <div className="col-6">
                          <div className="card bg-primary-subtle">
                            <div className="card-body text-center">
                              <p className="text-muted small mb-1">Total Orders</p>
                              <h4 className="fw-bold text-primary mb-0">{selectedDayDetail.totalOrders}</h4>
                            </div>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="card bg-success-subtle">
                            <div className="card-body text-center">
                              <p className="text-muted small mb-1">Total Revenue</p>
                              <h4 className="fw-bold text-success mb-0">
                                {currency}{selectedDayDetail.totalRevenue.toFixed(2)}
                              </h4>
                            </div>
                          </div>
                        </div>
                      </div>

                      <h6 className="mb-3">Products Sold</h6>
                      <div className="table-responsive">
                        <table className="table table-hover">
                          <thead className="table-light">
                            <tr>
                              <th>SKU</th>
                              <th>Product Name</th>
                              <th className="text-end">Quantity</th>
                              <th className="text-end">Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDayDetail.products.map((product, index) => (
                              <tr key={index}>
                                <td className="fw-medium">{product.sku}</td>
                                <td>{product.name}</td>
                                <td className="text-end">
                                  <span className="badge bg-primary-subtle text-primary-emphasis">
                                    {product.quantity}
                                  </span>
                                </td>
                                <td className="text-end">
                                  <span className="badge bg-success-subtle text-success-emphasis">
                                    {currency}{product.revenue.toFixed(2)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setSelectedDayDetail(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

           
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
