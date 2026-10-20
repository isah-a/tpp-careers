import { forwardRef, type ButtonHTMLAttributes } from 'react'
import type { ButtonSize, ButtonVariant } from '../../types/ui'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: string // Material Symbol icon name
  iconPosition?: 'left' | 'right'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  children,
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-label-lg font-semibold rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer'

  const variantClasses = {
    primary: 'bg-primary-container text-on-primary hover:bg-primary-hover shadow-sm hover:shadow shadow-primary/20',
    secondary: 'bg-secondary text-on-secondary hover:opacity-90 shadow-sm hover:shadow',
    ghost: 'bg-surface-container-low text-on-surface hover:bg-surface-container-high border border-surface-container-high',
    danger: 'bg-error-container text-on-error-container hover:bg-error hover:text-on-error'
  }

  const sizeClasses = {
    sm: 'h-8 px-3 text-label-sm gap-1.5',
    md: 'h-10 px-4 text-label-md gap-2',
    lg: 'h-11 px-6 text-label-lg gap-2.5'
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
      ) : (
        icon && iconPosition === 'left' && (
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        )
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      )}
    </button>
  )
})

Button.displayName = 'Button'
