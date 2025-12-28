import { useState, useEffect, useMemo } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import DashboardLayout from '../components/DashboardLayout'
import PageHeader from '../components/PageHeader'
import Loader from '../components/Loader'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import DataTableControls from '../components/DataTableControls'
import { useToast } from '../components/Toast'
import type { ProductResponse, ProductCreate, ProductUpdate, ProductInventoryUpdate } from '../types/product'

export default function ProductsPage() {
  const { auth } = useAuth()
  const { currency } = useStore()
  const [products, setProducts] = useState<ProductResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingInventoryId, setEditingInventoryId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const { addToast } = useToast()

  // UX: search & pagination
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [page, setPage] = useState(1)
  
  // Interactive features: sorting and selection
  const [sortField, setSortField] = useState<keyof ProductResponse | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [createForm, setCreateForm] = useState<ProductCreate>({
    SKU: '',
    prod_name: '',
    prod_category: '',
    prod_description: '',
    unit_price: 0,
    inventory: 0
  })

  const [editForm, setEditForm] = useState<ProductUpdate>({})
  const [inventoryForm, setInventoryForm] = useState<ProductInventoryUpdate>({ add_quantity: 0 })

  // Load products
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get<ProductResponse[]>('/products', {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
      setProducts(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load products')
    } finally { setLoading(false) }
  }

  const handleCreateProduct = async () => {
    if (!createForm.SKU || !createForm.prod_name || !createForm.prod_category) {
      addToast('warning', 'Please fill in required fields')
      return
    }
    try {
      const { data } = await api.post<ProductResponse>('/products', createForm, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
      setProducts([...products, data])
      setCreateForm({ SKU: '', prod_name: '', prod_category: '', prod_description: '', unit_price: 0, inventory: 0 })
      setShowCreateForm(false)
      addToast('success', 'Product created successfully')
    } catch (err: any) {
      addToast('error', err?.response?.data?.detail || 'Failed to create product')
    }
  }

  const handleUpdateProduct = async (prod_id: number) => {
    try {
      const { data } = await api.put<ProductResponse>(`/products/${prod_id}`, editForm, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
      setProducts(products.map(p => p.prod_id === prod_id ? data : p))
      setEditingId(null)
      setEditForm({})
      addToast('success', 'Product updated successfully')
    } catch (err: any) {
      addToast('error', err?.response?.data?.detail || 'Failed to update product')
    }
  }

  const handleUpdateInventory = async (prod_id: number) => {
    try {
      const { data } = await api.put<ProductResponse>(`/products/${prod_id}/inventory`, inventoryForm, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
      setProducts(products.map(p => p.prod_id === prod_id ? data : p))
      setEditingInventoryId(null)
      setInventoryForm({ add_quantity: 0 })
      addToast('success', `Stock added. New inventory: ${data.inventory}`)
    } catch (err: any) {
      addToast('error', err?.response?.data?.detail || 'Failed to add stock')
    }
  }

  const handleDeleteProduct = async (prod_id: number) => {
    try {
      const { data } = await api.delete(`/products/${prod_id}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
      setProducts(products.filter(p => p.prod_id !== prod_id))
      if (data.cancelled_orders > 0) {
        addToast('warning', `${data.cancelled_orders} pending order(s) were cancelled.`)
      }
      addToast('success', 'Product deleted successfully')
    } catch (err: any) {
      addToast('error', err?.response?.data?.detail || 'Failed to delete product')
    }
  }

  // Derived lists for UX
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(p => (
      p.SKU.toLowerCase().includes(q) ||
      p.prod_name.toLowerCase().includes(q) ||
      p.prod_category.toLowerCase().includes(q)
    ))
  }, [products, search])

  // Sort filtered products
  const sorted = useMemo(() => {
    if (!sortField) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (aVal === undefined && bVal === undefined) return 0
      if (aVal === undefined) return 1
      if (bVal === undefined) return -1
      if (aVal === bVal) return 0
      const comparison = aVal > bVal ? 1 : -1
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [filtered, sortField, sortOrder])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, page, pageSize])

  useEffect(() => {
    // Reset to page 1 if filters change
    setPage(1)
  }, [search, pageSize])

  // Handle sorting
  const handleSort = (field: keyof ProductResponse) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        <PageHeader
          title="Products"
          subtitle="Manage inventory, pricing, and stock"
          actions={(auth.role === 'admin' || auth.role === 'staff') ? (
            <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)} aria-label="Add product">
              {showCreateForm ? 'Cancel' : '+ Add Product'}
            </button>
          ) : undefined}
        />

        {error && <div className="alert alert-danger">{error}</div>}
        {loading && <Loader message="Loading products..." />}

        {/* Create Product Form */}
        {showCreateForm && (auth.role === 'admin' || auth.role === 'staff') && (
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Create New Product</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Product SKU *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., PROD-001"
                    value={createForm.SKU}
                    onChange={(e) => setCreateForm({ ...createForm, SKU: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Wireless Mouse"
                    value={createForm.prod_name}
                    onChange={(e) => setCreateForm({ ...createForm, prod_name: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Category *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Electronics"
                    value={createForm.prod_category}
                    onChange={(e) => setCreateForm({ ...createForm, prod_category: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Unit Price ({currency}) *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={createForm.unit_price}
                    onChange={(e) => setCreateForm({ ...createForm, unit_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Initial Inventory</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0"
                    min="0"
                    value={createForm.inventory}
                    onChange={(e) => setCreateForm({ ...createForm, inventory: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Optional"
                    value={createForm.prod_description || ''}
                    onChange={(e) => setCreateForm({ ...createForm, prod_description: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <button className="btn btn-primary me-2" onClick={handleCreateProduct}>Create Product</button>
                  <button className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Table */}
        {products.length === 0 && !loading && (
          <EmptyState
            title="No products yet"
            description={(auth.role === 'admin' || auth.role === 'staff') ? 'Create one to get started' : undefined}
            action={(auth.role === 'admin' || auth.role === 'staff') ? (
              <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>Add Product</button>
            ) : undefined}
          />
        )}

        {products.length > 0 && (
          <div className="card">
            <div className='card-header p-0'>
              <div className="d-flex justify-content-between align-items-center pt-2 ps-2">
                <DataTableControls
                  search={search}
                  onSearchChange={setSearch}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                />
              </div>
              </div>
            <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-interactive mb-0">
                <thead className="table-light">
                  <tr>
                    <th className={`sortable-header ${sortField === 'SKU' ? `sorted-${sortOrder}` : ''}`} onClick={() => handleSort('SKU')}>SKU</th>
                    <th className={`sortable-header ${sortField === 'prod_name' ? `sorted-${sortOrder}` : ''}`} onClick={() => handleSort('prod_name')}>Product Name</th>
                    <th className={`sortable-header ${sortField === 'prod_category' ? `sorted-${sortOrder}` : ''}`} onClick={() => handleSort('prod_category')}>Category</th>
                    <th className={`sortable-header ${sortField === 'unit_price' ? `sorted-${sortOrder}` : ''}`} onClick={() => handleSort('unit_price')}>Price</th>
                    <th className={`sortable-header ${sortField === 'inventory' ? `sorted-${sortOrder}` : ''}`} onClick={() => handleSort('inventory')}>Inventory</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((product) => (
                    <tr key={product.prod_id}>
                      <td className="fw-medium">{product.SKU}</td>
                      <td>
                        {editingId === product.prod_id ? (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editForm.prod_name || product.prod_name}
                            onChange={(e) => setEditForm({ ...editForm, prod_name: e.target.value })}
                          />
                        ) : (
                          product.prod_name
                        )}
                      </td>
                      <td>
                        {editingId === product.prod_id ? (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editForm.prod_category || product.prod_category}
                            onChange={(e) => setEditForm({ ...editForm, prod_category: e.target.value })}
                          />
                        ) : (
                          product.prod_category
                        )}
                      </td>
                      <td>
                        {editingId === product.prod_id ? (
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={editForm.unit_price || product.unit_price}
                            onChange={(e) => setEditForm({ ...editForm, unit_price: parseFloat(e.target.value) })}
                          />
                        ) : (
                          `${currency}${product.unit_price}`
                        )}
                      </td>
                      <td>
                        {editingInventoryId === product.prod_id ? (
                          <div className="d-flex align-items-center gap-1">
                            <span className="badge bg-secondary">{product.inventory}</span>
                            <span>+</span>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              style={{ width: '70px' }}
                              min="0"
                              placeholder="Qty"
                              value={inventoryForm.add_quantity}
                              onChange={(e) => setInventoryForm({ add_quantity: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        ) : (
                          <span className={`badge ${product.inventory === 0 ? 'bg-danger' : 'bg-success'}`}>
                            {product.inventory === 0 ? 'Empty' : product.inventory}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          {editingId === product.prod_id ? (
                            <>
                              <button className="btn btn-success me-2 table-action-btn text-white" onClick={() => handleUpdateProduct(product.prod_id)}>Save</button>
                              <button className="btn btn-secondary me-2 table-action-btn text-white" onClick={() => setEditingId(null)}>Cancel</button>
                            </>
                          ) : (auth.role === 'admin' || auth.role === 'staff') ? (
                            <button className="btn btn-outline-primary me-2 table-action-btn text-white" onClick={() => { setEditingId(product.prod_id); setEditForm({}) }}>Edit</button>
                          ) : null}

                          {editingInventoryId === product.prod_id ? (
                            <>
                              <button className="btn btn-success me-2 table-action-btn text-white" onClick={() => handleUpdateInventory(product.prod_id)}>Add</button>
                              <button className="btn btn-secondary me-2 table-action-btn text-white" onClick={() => setEditingInventoryId(null)}>Cancel</button>
                            </>
                          ) : (
                            <button className="btn btn-outline-info me-2 table-action-btn text-white" onClick={() => { setEditingInventoryId(product.prod_id); setInventoryForm({ add_quantity: 0 }) }}>+ Stock</button>
                          )}

                          {auth.role === 'admin' && (
                            <button className="btn btn-outline-danger me-2 table-action-btn text-white" onClick={() => setConfirmDeleteId(product.prod_id)}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex justify-content-between align-items-center px-3 py-2 flex-wrap gap-2">
              <small className="text-muted">Showing {pageItems.length} of {sorted.length} products</small>
              <div className="btn-group">
                <button className="btn btn-outline-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                <span className="btn btn-outline-secondary btn-sm disabled">Page {page} / {totalPages}</span>
                <button className="btn btn-outline-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
              </div>
            </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          show={confirmDeleteId !== null}
          title="Delete Product"
          message="Are you sure you want to delete this product? This will remove it from inventory and cancel any pending orders that include it."
          confirmText="Delete"
          onConfirm={() => {
            if (confirmDeleteId) {
              const id = confirmDeleteId
              setConfirmDeleteId(null)
              handleDeleteProduct(id)
            }
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      </div>
    </DashboardLayout>
  )
}
