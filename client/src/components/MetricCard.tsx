import type { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  color?: 'primary' | 'success' | 'warning' | 'danger'
}

const colorMap = {
  primary: { border: 'border-primary', bg: 'bg-primary-subtle', text: 'text-primary' },
  success: { border: 'border-success', bg: 'bg-success-subtle', text: 'text-success' },
  warning: { border: 'border-warning', bg: 'bg-warning-subtle', text: 'text-warning' },
  danger: { border: 'border-danger', bg: 'bg-danger-subtle', text: 'text-danger' },
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
}: MetricCardProps) {
  const colors = colorMap[color]

  return (
    <div className={`card ${colors.bg} border-start border-4 ${colors.border}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <p className="text-muted small mb-1">{title}</p>
            <h3 className={`fw-bold mb-1 ${colors.text}`}>{value}</h3>
            {subtitle && <p className="text-muted small mb-0">{subtitle}</p>}
          </div>
          {icon && <div className={`fs-3 ${colors.text}`}>{icon}</div>}
        </div>
      </div>
    </div>
  )
}
