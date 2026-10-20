import { forwardRef, type SelectHTMLAttributes } from 'react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  containerClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  className = '',
  containerClassName = '',
  id,
  children,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className="font-label-md text-label-md text-on-surface-variant flex items-center justify-between">
          <span>{label}</span>
        </label>
      )}
      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          className={`w-full h-11 appearance-none rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm pl-3.5 pr-10 border transition-all duration-150 cursor-pointer focus:outline-none ${
            error
              ? 'border-error bg-error-container/10 focus:border-error'
              : 'border-transparent focus:border-primary focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <span className="material-symbols-outlined absolute right-3 pointer-events-none text-outline text-[20px]">
          expand_more
        </span>
      </div>
      {error && <span className="font-label-sm text-label-sm text-error mt-0.5">{error}</span>}
    </div>
  )
})

Select.displayName = 'Select'
