import { forwardRef, type InputHTMLAttributes } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  prefixIcon?: string
  suffixIcon?: string
  onSuffixClick?: () => void
  containerClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  prefixIcon,
  suffixIcon,
  onSuffixClick,
  className = '',
  containerClassName = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="font-label-md text-label-md text-on-surface-variant flex items-center justify-between">
          <span>{label}</span>
        </label>
      )}
      <div className="relative flex items-center">
        {prefixIcon && (
          <span className="material-symbols-outlined absolute left-3 text-outline text-[20px] pointer-events-none">
            {prefixIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full h-11 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm transition-all duration-150 border focus:outline-none ${
            error
              ? 'border-error bg-error-container/10 focus:border-error focus:ring-1 focus:ring-error'
              : 'border-transparent focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary'
          } ${prefixIcon ? 'pl-10' : 'pl-3.5'} ${suffixIcon ? 'pr-10' : 'pr-3.5'} ${className}`}
          {...props}
        />
        {suffixIcon && (
          <button
            type="button"
            onClick={onSuffixClick}
            className="absolute right-3 text-outline hover:text-on-surface flex items-center justify-center p-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[19px]">{suffixIcon}</span>
          </button>
        )}
      </div>
      {error && <span className="font-label-sm text-label-sm text-error mt-0.5">{error}</span>}
    </div>
  )
})

Input.displayName = 'Input'
