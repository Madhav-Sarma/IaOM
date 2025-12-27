import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { StoreSettings } from '../types/store'

export default function StoreSettingsPage() {
  const { auth } = useAuth()
  const isAdmin = auth.role === 'admin'
  const [settings, setSettings] = useState<StoreSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('')

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${auth.token}` }), [auth.token])

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get<StoreSettings>('/store/settings', { headers: authHeader })
      setSettings(data)
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
    <div className="container" style={{ padding: 16 }}>
      <h2>Store Settings</h2>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {message && <div style={{ color: 'green' }}>{message}</div>}

      {settings && (
        <div style={{ display: 'grid', gap: 12, maxWidth: 480 }}>
          <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <span>Low Stock Threshold</span>
            <input
              type="number"
              min={0}
              value={settings.low_stock_threshold}
              disabled={!isAdmin}
              onChange={e => onChange('low_stock_threshold', Number(e.target.value))}
            />
          </label>

          <label style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input
              type="checkbox"
              checked={settings.restore_stock_on_cancel}
              disabled={!isAdmin}
              onChange={e => onChange('restore_stock_on_cancel', e.target.checked)}
            />
            Restore stock on cancel
          </label>

          <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <span>Sales Lookback (days)</span>
            <input
              type="number"
              min={0}
              value={settings.sales_lookback_days}
              disabled={!isAdmin}
              onChange={e => onChange('sales_lookback_days', Number(e.target.value))}
            />
          </label>

          <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <span>Reorder Horizon (days)</span>
            <input
              type="number"
              min={0}
              value={settings.reorder_horizon_days}
              disabled={!isAdmin}
              onChange={e => onChange('reorder_horizon_days', Number(e.target.value))}
            />
          </label>

          <label style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <span>Currency</span>
            <input
              type="text"
              value={settings.currency}
              disabled={!isAdmin}
              onChange={e => onChange('currency', e.target.value)}
              maxLength={8}
            />
          </label>

          {isAdmin && (
            <button onClick={save} disabled={saving} style={{ padding: '10px 14px', width: 'fit-content' }}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          )}
          {!isAdmin && (
            <div style={{ color: '#666', fontSize: 13 }}>Only admins can change settings. You can view current values.</div>
          )}
        </div>
      )}
    </div>
  )
}
