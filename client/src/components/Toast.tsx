import { createContext, useContext, useState, useCallback, useMemo } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  addToast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.slice(1))
    }, 3500)
  }, [])

  const value = useMemo(() => ({ addToast }), [addToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }} aria-live="polite" aria-atomic="true">
        <div className="d-flex flex-column gap-2">
          {toasts.map((t) => (
            <div key={t.id} className={`alert alert-${t.type} shadow-sm mb-0`} role="alert">
              {t.message}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
