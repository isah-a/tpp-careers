import type { MetricCardProps } from '../../types/ui'

export function MetricCard({
  label,
  value,
  trend,
  trendType = 'positive',
  icon = 'analytics',
  description,
  accentColor = 'primary'
}: MetricCardProps) {
  const accentBarClasses = {
    primary: 'bg-primary-container',
    secondary: 'bg-secondary',
    tertiary: 'bg-tertiary-container'
  }

  const iconBgClasses = {
    primary: 'bg-surface-container-low text-primary',
    secondary: 'bg-secondary-fixed text-secondary',
    tertiary: 'bg-surface-container-low text-tertiary'
  }

  return (
    <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between">
      <div className={`absolute top-0 left-0 right-0 h-1 ${accentBarClasses[accentColor]} opacity-80 group-hover:opacity-100 transition-opacity`} />
      
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
            {label}
          </span>
          <div className="flex items-baseline gap-space-xs mt-1">
            <span className="font-headline-lg text-headline-lg text-on-surface tracking-tight tabular-nums">
              {value}
            </span>
            {trend && (
              <span className={`font-label-sm text-label-sm font-bold flex items-center ${
                trendType === 'positive' ? 'text-secondary' : trendType === 'negative' ? 'text-primary' : 'text-on-surface-variant'
              }`}>
                {trend}
              </span>
            )}
          </div>
        </div>
        
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBgClasses[accentColor]}`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
      </div>

      {description && (
        <div className="mt-space-sm pt-space-xs flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm border-t border-surface-container-high/40">
          <span>{description}</span>
        </div>
      )}
    </div>
  )
}
