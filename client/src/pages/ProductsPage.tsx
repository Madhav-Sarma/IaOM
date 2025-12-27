import { useState, useEffect } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { ProductResponse, ProductCreate, ProductUpdate, ProductInventoryUpdate } from '../types/product'
import './ProductsPage.css'

export default function ProductsPage() {
  const { auth } = useAuth()
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
  const [inventoryForm, setInventoryForm] = useState<ProductInventoryUpdate>({ inventory: 0 })

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
      setInventoryForm({ inventory: 0 })
      alert('Inventory updated successfully!')
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update inventory')
    }
  }

  const handleDeleteProduct = async (prod_id: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return
    try {
      await api.delete(`/products/${prod_id}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
      setProducts(products.filter(p => p.prod_id !== prod_id))
      alert('Product deleted successfully!')
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete product')
    }
  }

  return (
    <div className="products-page">
      <div className="products-header">
        <h2>Products</h2>
        {auth.role === 'admin' && (
          <button className="btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : '+ Add Product'}
          </button>
        )}
      </div>

      {error && <div className="status error">{error}</div>}
      {loading && <div className="status info">Loading products...</div>}

      {/* Create Product Form */}
      {showCreateForm && auth.role === 'admin' && (
        <div className="form-section">
          <h3>Create New Product</h3>
          <div className="form-group">
            <label>Product SKU *</label>
            <input
              type="text"
              placeholder="e.g., PROD-001"
              value={createForm.SKU}
              onChange={(e) => setCreateForm({ ...createForm, SKU: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                placeholder="e.g., Wireless Mouse"
                value={createForm.prod_name}
                onChange={(e) => setCreateForm({ ...createForm, prod_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <input
                type="text"
                placeholder="e.g., Electronics"
                value={createForm.prod_category}
                onChange={(e) => setCreateForm({ ...createForm, prod_category: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Unit Price (Rs.) *</label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={createForm.unit_price}
                onChange={(e) => setCreateForm({ ...createForm, unit_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Initial Inventory</label>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={createForm.inventory}
                onChange={(e) => setCreateForm({ ...createForm, inventory: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              placeholder="Optional product description"
              value={createForm.prod_description || ''}
              onChange={(e) => setCreateForm({ ...createForm, prod_description: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={handleCreateProduct}>Create Product</button>
            <button className="btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Products Table */}
      {products.length === 0 && !loading && (
        <div className="empty-state">No products yet. {auth.role === 'admin' && 'Create one to get started!'}</div>
      )}

      {products.length > 0 && (
        <div className="products-table">
          <table>
            <thead>
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
                  <td>{product.SKU}</td>
                  <td>
                    {editingId === product.prod_id ? (
                      <input
                        type="text"
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
                        value={editForm.unit_price || product.unit_price}
                        onChange={(e) => setEditForm({ ...editForm, unit_price: parseFloat(e.target.value) })}
                      />
                    ) : (
                      `Rs.${product.unit_price}`
                    )}
                  </td>
                  <td>
                    {editingInventoryId === product.prod_id ? (
                      <input
                        type="number"
                        value={inventoryForm.inventory}
                        onChange={(e) => setInventoryForm({ inventory: parseInt(e.target.value) })}
                      />
                    ) : (
                      <span className={product.inventory === 0 ? 'inventory-empty' : 'inventory-available'}>
                        {product.inventory === 0 ? 'Empty' : product.inventory}
                      </span>
                    )}
                  </td>
                  <td className="actions">
                    {editingId === product.prod_id ? (
                      <>
                        <button className="btn-small btn-success" onClick={() => handleUpdateProduct(product.prod_id)}>Save</button>
                        <button className="btn-small btn-danger" onClick={() => setEditingId(null)}>Cancel</button>
                      </>
                    ) : auth.role === 'admin' ? (
                      <button className="btn-small btn-edit" onClick={() => { setEditingId(product.prod_id); setEditForm({}) }}>Edit</button>
                    ) : null}

                    {editingInventoryId === product.prod_id ? (
                      <>
                        <button className="btn-small btn-success" onClick={() => handleUpdateInventory(product.prod_id)}>Save</button>
                        <button className="btn-small btn-danger" onClick={() => setEditingInventoryId(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="btn-small btn-info" onClick={() => { setEditingInventoryId(product.prod_id); setInventoryForm({ inventory: product.inventory }) }}>Update</button>
                    )}

                    {auth.role === 'admin' && (
                      <button className="btn-small btn-danger" onClick={() => handleDeleteProduct(product.prod_id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
