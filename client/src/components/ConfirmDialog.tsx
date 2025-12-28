import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  show: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  show,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (show) {
      dialogRef.current?.focus()
    }
  }, [show])

  if (!show) return null

  return (
    <div
      className="modal d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmDialogTitle"
      aria-describedby="confirmDialogMessage"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel()
      }}
    >
      <div className="modal-dialog" role="document">
        <div className="modal-content" ref={dialogRef}>
          <div className="modal-header">
            <h5 className="modal-title" id="confirmDialogTitle">{title}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onCancel}></button>
          </div>
          <div className="modal-body">
            <p id="confirmDialogMessage" className="mb-0">{message}</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>{cancelText}</button>
            <button type="button" className="btn btn-danger" onClick={onConfirm}>{confirmText}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
