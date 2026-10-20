import { useEffect } from 'react'

export interface ToastProps {
  message: string | null
  type?: 'success' | 'error' | 'info'
  onClose: () => void
  duration?: number
}

export function Toast({
  message,
  type = 'success',
  onClose,
  duration = 3500
}: ToastProps) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [message, duration, onClose])

  if (!message) return null

  const iconName = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'
  const iconColor = type === 'success' ? 'text-secondary-container' : type === 'error' ? 'text-error-container' : 'text-primary-fixed'

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-space-md py-3 rounded-xl bg-inverse-surface text-inverse-on-surface shadow-xl animate-in slide-in-from-bottom-5 duration-200"
    >
      <span className={`material-symbols-outlined text-lg ${iconColor}`}>
        {iconName}
      </span>
      <span className="font-label-md text-label-md lowercase">
        {message}
      </span>
      <button
        onClick={onClose}
        className="ml-2 text-inverse-on-surface/60 hover:text-inverse-on-surface cursor-pointer"
        aria-label="Dismiss message"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  )
}
