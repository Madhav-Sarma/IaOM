import { useEffect, useState, useMemo } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import DashboardLayout from '../components/DashboardLayout'
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
  orders: number
  sales: number
}

export default function AdminDashboard() {
  const { auth } = useAuth()
  const { currency } = useStore()
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${auth.token}` }), [auth.token])

  const [kpis, setKpis] = useState<KPIData>({
    activeProducts: 0,
    ordersLast7Days: 0,
    lowStockProducts: 0,
    totalSalesLast30Days: 0,
  })

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

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="h3 fw-bold">Admin Dashboard</h1>
          <p className="text-muted">Welcome back! Here's your store overview.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-2">Loading dashboard...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* KPI Cards */}
            <div className="row g-4 mb-4">
              <div className="col-12 col-md-6 col-lg-3">
                <MetricCard
                  title="Active Products"
                  value={kpis.activeProducts}
                  subtitle="Total products in catalog"
                  icon={<FiPackage />}
                  color="primary"
                />
              </div>
              <div className="col-12 col-md-6 col-lg-3">
                <MetricCard
                  title="Confirmed Orders (7 Days)"
                  value={kpis.ordersLast7Days}
                  subtitle="Recent confirmed sales"
                  icon={<FiTrendingUp />}
                  color="success"
                />
              </div>
              <div className="col-12 col-md-6 col-lg-3">
                <MetricCard
                  title="Low Stock Products"
                  value={kpis.lowStockProducts}
                  subtitle="Below 10 units"
                  icon={<FiAlertTriangle />}
                  color="warning"
                />
              </div>
              <div className="col-12 col-md-6 col-lg-3">
                <MetricCard
                  title="Total Sales (30 Days)"
                  value={`${currency}${kpis.totalSalesLast30Days.toFixed(2)}`}
                  subtitle="Revenue generated"
                  icon={<FiDollarSign />}
                  color="success"
                />
              </div>
            </div>

            {/* Chart */}
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title mb-4">Orders & Sales Trend (Last 30 Days)</h5>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
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
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="orders"
                      fill="#0d6efd"
                      name="Orders"
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

            {/* Tip */}
            <div className="alert alert-info" role="alert">
              <strong>💡 Tip:</strong> Keep an eye on low-stock products and reorder when necessary.
              Regular inventory audits help prevent stockouts.
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
