import { useEffect } from 'react'
import type { DrawerProps } from '../../types/ui'

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  badgeText,
  badgeVariant = 'secondary',
  children,
  footerActions,
  maxWidth = '2xl'
}: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden')
    } else {
      document.body.classList.remove('overflow-hidden')
    }
    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const widthClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Flyout panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className={`w-screen ${widthClasses[maxWidth]} bg-surface-container-lowest shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300`}>
          {/* Header */}
          <div className="px-space-lg py-space-md bg-surface-container-low flex items-center justify-between shrink-0 border-b border-surface-container-high">
            <div className="flex flex-col">
              {subtitle && (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`w-2 h-2 rounded-full ${badgeVariant === 'secondary' ? 'bg-secondary-container' : 'bg-primary-container'}`} />
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">
                    {subtitle}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <h2 className="font-headline-sm text-headline-sm text-on-surface lowercase tracking-tight">
                  {title}
                </h2>
                {badgeText && (
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-bold">
                    {badgeText}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-space-lg py-space-md space-y-space-lg">
            {children}
          </div>

          {/* Sticky Footer Actions */}
          {footerActions && (
            <div className="px-space-lg py-space-md bg-surface-container-low/60 flex items-center justify-between shrink-0 border-t border-surface-container-high">
              {footerActions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
