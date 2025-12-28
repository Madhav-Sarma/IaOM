interface LoaderProps {
  message?: string
  className?: string
}

export default function Loader({ message = 'Loading...', className = '' }: LoaderProps) {
  return (
    <div className={`text-center py-4 ${className}`} aria-live="polite" aria-busy="true">
      <div className="spinner-border text-primary" role="status" aria-hidden="true"></div>
      <div className="mt-2 text-secondary small">{message}</div>
    </div>
  )
}
