type StatusType = 'pending' | 'confirmed' | 'shipped' | 'cancelled'

interface StatusBadgeProps {
  status: StatusType
}

const statusConfig: Record<StatusType, { bg: string; label: string }> = {
  pending: { bg: 'bg-warning-subtle text-warning-emphasis', label: 'Pending' },
  confirmed: { bg: 'bg-primary-subtle text-primary-emphasis', label: 'Confirmed' },
  shipped: { bg: 'bg-success-subtle text-success-emphasis', label: 'Shipped' },
  cancelled: { bg: 'bg-danger-subtle text-danger-emphasis', label: 'Cancelled' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending
  return (
    <span className={`badge ${config.bg}`}>
      {config.label}
    </span>
  )
}
