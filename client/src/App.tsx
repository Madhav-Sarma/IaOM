import { useMemo, useState } from 'react'
import './App.css'
import { api } from './api/client'
import type {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  BuyPackageRequest,
  BuyPackageResponse,
} from './types/auth'

type TabKey = 'signup' | 'login' | 'buy'

const initialSignup: SignupRequest = {
  person_name: '',
  person_email: '',
  person_contact: '',
  person_address: '',
}

const initialLogin: LoginRequest = {
  person_email: '',
  password: '',
}

const initialBuy: BuyPackageRequest = {
  person_id: 0,
  store_name: '',
  store_address: '',
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('signup')
  const [signupData, setSignupData] = useState<SignupRequest>(initialSignup)
  const [loginData, setLoginData] = useState<LoginRequest>(initialLogin)
  const [buyData, setBuyData] = useState<BuyPackageRequest>(initialBuy)

  const [signupResult, setSignupResult] = useState<SignupResponse | null>(null)
  const [loginResult, setLoginResult] = useState<LoginResponse | null>(null)
  const [buyResult, setBuyResult] = useState<BuyPackageResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tabs: { key: TabKey; label: string; description: string }[] = useMemo(
    () => [
      { key: 'signup', label: 'Sign Up (Customer)', description: 'Create a person record. No login yet.' },
      { key: 'buy', label: 'Buy Package (Admin)', description: 'Upgrade to admin, create a store, get default password.' },
      { key: 'login', label: 'Login (Staff/Admin)', description: 'Staff/Admin login only.' },
    ],
    [],
  )

  const handleSignup = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post<SignupResponse>('/auth/signup', signupData)
      setSignupResult(data)
      setBuyData((prev) => ({ ...prev, person_id: data.person_id }))
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Signup failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', loginData)
      setLoginResult(data)
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Login failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleBuy = async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = {
        ...buyData,
        person_id: Number(buyData.person_id),
      }
      const { data } = await api.post<BuyPackageResponse>('/auth/buy-package', payload)
      setBuyResult(data)
      // After package purchase, prefill login email if we know it
      if (signupResult?.person_email) {
        setLoginData((prev) => ({ ...prev, person_email: signupResult.person_email, password: 'password' }))
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Buy package failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const renderStatus = () => {
    if (loading) return <div className="status info">Working...</div>
    if (error) return <div className="status error">{error}</div>
    return null
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Inventory & Order Management</p>
          <h1>Onboard stores, staff, and customers fast</h1>
          <p className="lede">
            Sign up customers, buy a package to become an admin and create a store, then login as staff or admin.
          </p>
        </div>
        <div className="chip">Backend: FastAPI · Frontend: React + TS</div>
      </header>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(tab.key)}
          >
            <div className="tab-label">{tab.label}</div>
            <div className="tab-desc">{tab.description}</div>
          </button>
        ))}
      </div>

      {renderStatus()}

      <section className="panel">
        {activeTab === 'signup' && (
          <div className="form-grid">
            <label>
              Full Name
              <input
                value={signupData.person_name}
                onChange={(e) => setSignupData({ ...signupData, person_name: e.target.value })}
                placeholder="Jane Doe"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={signupData.person_email}
                onChange={(e) => setSignupData({ ...signupData, person_email: e.target.value })}
                placeholder="jane@example.com"
              />
            </label>
            <label>
              Contact
              <input
                value={signupData.person_contact}
                onChange={(e) => setSignupData({ ...signupData, person_contact: e.target.value })}
                placeholder="+91 90000 00000"
              />
            </label>
            <label className="full">
              Address
              <input
                value={signupData.person_address}
                onChange={(e) => setSignupData({ ...signupData, person_address: e.target.value })}
                placeholder="123 MG Road, Bengaluru"
              />
            </label>
            <div className="actions full">
              <button onClick={handleSignup} disabled={loading}>
                Create customer
              </button>
            </div>
            {signupResult && (
              <div className="result full">
                <h4>Signup success</h4>
                <p>Person ID: {signupResult.person_id}</p>
                <p>{signupResult.message}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'buy' && (
          <div className="form-grid">
            <label>
              Person ID (from signup)
              <input
                type="number"
                value={buyData.person_id}
                onChange={(e) => setBuyData({ ...buyData, person_id: Number(e.target.value) })}
                placeholder="e.g. 1"
              />
            </label>
            <label>
              Store Name
              <input
                value={buyData.store_name}
                onChange={(e) => setBuyData({ ...buyData, store_name: e.target.value })}
                placeholder="Acme Retail"
              />
            </label>
            <label className="full">
              Store Address
              <input
                value={buyData.store_address}
                onChange={(e) => setBuyData({ ...buyData, store_address: e.target.value })}
                placeholder="42 Market Street, Mumbai"
              />
            </label>
            <div className="note full">Default password set to <strong>password</strong>. Change it after login.</div>
            <div className="actions full">
              <button onClick={handleBuy} disabled={loading}>
                Buy package & create store
              </button>
            </div>
            {buyResult && (
              <div className="result full">
                <h4>Package purchased</h4>
                <p>Store ID: {buyResult.store_id}</p>
                <p>User ID (admin): {buyResult.user_id}</p>
                <p>Token: {buyResult.access_token.slice(0, 24)}...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'login' && (
          <div className="form-grid">
            <label>
              Email
              <input
                type="email"
                value={loginData.person_email}
                onChange={(e) => setLoginData({ ...loginData, person_email: e.target.value })}
                placeholder="admin@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                placeholder="password"
              />
            </label>
            <div className="actions full">
              <button onClick={handleLogin} disabled={loading}>
                Login
              </button>
            </div>
            {loginResult && (
              <div className="result full">
                <h4>Login success</h4>
                <p>Role: {loginResult.role}</p>
                <p>Store ID: {loginResult.store_id}</p>
                <p>User ID: {loginResult.user_id}</p>
                <p>Token: {loginResult.access_token.slice(0, 24)}...</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export default App
