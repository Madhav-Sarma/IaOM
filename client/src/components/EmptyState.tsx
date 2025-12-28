import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="card">
      <div className="card-body text-center">
        {icon && <div className="mb-2 fs-2 text-secondary">{icon}</div>}
        <h5 className="fw-semibold mb-1">{title}</h5>
        {description && <p className="text-secondary mb-3">{description}</p>}
        {action}
      </div>
    </div>
  )
}
