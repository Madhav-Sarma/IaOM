import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { setSettings as setStoreSettings } from '../store/storeSlice'
import type { RootState } from '../store/store'
import DashboardLayout from '../components/DashboardLayout'
import type { StoreSettings } from '../types/store'

export default function StoreSettingsPage() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((state: RootState) => state.auth.token)
  const role = useAppSelector((state: RootState) => state.auth.role)
  const isAdmin = role === 'admin'
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('')

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get<StoreSettings>('/store/settings', { headers: authHeader })
      setSettings(data)
      dispatch(setStoreSettings(data))
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const onChange = (field: keyof StoreSettings, value: any) => {
    if (!settings) return
    setSettings({ ...settings, [field]: value })
  }

  const save = async () => {
    if (!settings) return
    setSaving(true); setError(null); setMessage('')
    try {
      const { data } = await api.put<StoreSettings>('/store/settings', settings, { headers: authHeader })
      setSettings(data)
      setMessage('Settings updated')
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="container-fluid py-4">
        <h3 className="fw-bold mb-4">Store Settings</h3>
        {loading && (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        )}
        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {settings && (
          <div className="row">
            {/* Store Details Card */}
            <div className="col-md-6 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="mb-0">Store Details</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label">Store Name</label>
                    <input
                      className="form-control"
                      type="text"
                      value={settings.store_name}
                      disabled={!isAdmin}
                      onChange={e => onChange('store_name', e.target.value)}
                      maxLength={255}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Store Address</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={settings.store_address}
                      disabled={!isAdmin}
                      onChange={e => onChange('store_address', e.target.value)}
                      maxLength={500}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Currency Symbol</label>
                    <input
                      className="form-control"
                      type="text"
                      value={settings.currency}
                      disabled={!isAdmin}
                      onChange={e => onChange('currency', e.target.value)}
                      maxLength={8}
                      style={{ maxWidth: 100 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Settings Card */}
            <div className="col-md-6 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="mb-0">Inventory Settings</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label">Low Stock Threshold</label>
                    <input
                      className="form-control"
                      type="number"
                      min={0}
                      value={settings.low_stock_threshold}
                      disabled={!isAdmin}
                      onChange={e => onChange('low_stock_threshold', Number(e.target.value))}
                    />
                    <small className="text-muted">Alert when stock falls below this number</small>
                  </div>

                  <div className="mb-3 form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="restoreStock"
                      checked={settings.restore_stock_on_cancel}
                      disabled={!isAdmin}
                      onChange={e => onChange('restore_stock_on_cancel', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="restoreStock">
                      Restore stock on order cancellation
                    </label>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Sales Lookback (days)</label>
                    <input
                      className="form-control"
                      type="number"
                      min={0}
                      value={settings.sales_lookback_days}
                      disabled={!isAdmin}
                      onChange={e => onChange('sales_lookback_days', Number(e.target.value))}
                    />
                    <small className="text-muted">Days to analyze for sales trends</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Reorder Horizon (days)</label>
                    <input
                      className="form-control"
                      type="number"
                      min={0}
                      value={settings.reorder_horizon_days}
                      disabled={!isAdmin}
                      onChange={e => onChange('reorder_horizon_days', Number(e.target.value))}
                    />
                    <small className="text-muted">Days ahead to plan for reorders</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="col-12">
              {isAdmin ? (
                <button className="btn btn-primary btn-lg" onClick={save} disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Saving...
                    </>
                  ) : (
                    'Save All Settings'
                  )}
                </button>
              ) : (
                <div className="alert alert-info mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Only admins can change settings. You can view current values.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
