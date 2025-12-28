import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-3 mb-md-4">
      <div className="mb-2 mb-md-0">
        <h3 className="fw-bold mb-1">{title}</h3>
        {subtitle && <div className="text-secondary small">{subtitle}</div>}
      </div>
      {actions && <div className="d-flex align-items-center gap-2">{actions}</div>}
    </div>
  )
}
