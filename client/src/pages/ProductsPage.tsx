import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import DashboardLayout from '../components/DashboardLayout'
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
      alert('Please fill in required fields')
      return
    }
    try {
      const { data } = await api.post<ProductResponse>('/products', createForm, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
      setProducts([...products, data])
      setCreateForm({ SKU: '', prod_name: '', prod_category: '', prod_description: '', unit_price: 0, inventory: 0 })
      setShowCreateForm(false)
      alert('Product created successfully!')
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to create product')
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
      alert('Product updated successfully!')
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update product')
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
      alert(`Stock added successfully! New inventory: ${data.inventory}`)
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to add stock')
    }
  }

  const handleDeleteProduct = async (prod_id: number) => {
    if (!window.confirm('Are you sure you want to delete this product? This will:\n- Remove the product from inventory\n- Cancel all pending orders for this product')) return
    try {
      const { data } = await api.delete(`/products/${prod_id}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
      setProducts(products.filter(p => p.prod_id !== prod_id))
      if (data.cancelled_orders > 0) {
        alert(`Product deleted successfully!\n${data.cancelled_orders} pending order(s) were cancelled.`)
      } else {
        alert('Product deleted successfully!')
      }
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete product')
    }
  }

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="fw-bold mb-0">Products</h3>
          {(auth.role === 'admin' || auth.role === 'staff') && (
            <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
              {showCreateForm ? 'Cancel' : '+ Add Product'}
            </button>
          )}
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {loading && (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

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
          <div className="alert alert-info">No products yet. {(auth.role === 'admin' || auth.role === 'staff') && 'Create one to get started!'}</div>
        )}

        {products.length > 0 && (
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Inventory</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
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
                              <button className="btn btn-success" onClick={() => handleUpdateProduct(product.prod_id)}>Save</button>
                              <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                            </>
                          ) : (auth.role === 'admin' || auth.role === 'staff') ? (
                            <button className="btn btn-outline-primary" onClick={() => { setEditingId(product.prod_id); setEditForm({}) }}>Edit</button>
                          ) : null}

                          {editingInventoryId === product.prod_id ? (
                            <>
                              <button className="btn btn-success" onClick={() => handleUpdateInventory(product.prod_id)}>Add</button>
                              <button className="btn btn-secondary" onClick={() => setEditingInventoryId(null)}>Cancel</button>
                            </>
                          ) : (
                            <button className="btn btn-outline-info" onClick={() => { setEditingInventoryId(product.prod_id); setInventoryForm({ add_quantity: 0 }) }}>+ Stock</button>
                          )}

                          {auth.role === 'admin' && (
                            <button className="btn btn-outline-danger" onClick={() => handleDeleteProduct(product.prod_id)}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
