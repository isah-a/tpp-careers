import type { ReactNode } from 'react'
import type { ApplicationStage } from '../../types'

export type BadgeVariant = 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'error' | 'neutral'

export interface BadgeProps {
  variant?: BadgeVariant
  stage?: ApplicationStage
  size?: 'sm' | 'md'
  dot?: boolean
  children?: ReactNode
  className?: string
}

export function Badge({
  variant = 'primary',
  stage,
  size = 'md',
  dot = false,
  children,
  className = ''
}: BadgeProps) {
  // If stage is provided, map to semantic styling
  const stageStyles: Record<ApplicationStage, { bg: string; text: string; dotColor: string; defaultLabel: string }> = {
    screening: { bg: 'bg-primary-fixed', text: 'text-primary', dotColor: 'bg-primary', defaultLabel: 'Screening' },
    review: { bg: 'bg-surface-container', text: 'text-on-surface-variant', dotColor: 'bg-primary-container', defaultLabel: 'Review' },
    interview: { bg: 'bg-secondary-fixed', text: 'text-secondary', dotColor: 'bg-secondary', defaultLabel: 'Interview' },
    offer: { bg: 'bg-tertiary-fixed', text: 'text-tertiary', dotColor: 'bg-tertiary', defaultLabel: 'Offer' },
    hired: { bg: 'bg-emerald-50', text: 'text-emerald-700', dotColor: 'bg-emerald-600', defaultLabel: 'Hired' },
    rejected: { bg: 'bg-slate-100', text: 'text-slate-600', dotColor: 'bg-slate-400', defaultLabel: 'Rejected' },
  }

  const variantStyles: Record<BadgeVariant, { bg: string; text: string; dotColor: string }> = {
    primary: { bg: 'bg-primary-fixed', text: 'text-primary', dotColor: 'bg-primary' },
    secondary: { bg: 'bg-secondary-fixed', text: 'text-secondary', dotColor: 'bg-secondary' },
    tertiary: { bg: 'bg-tertiary-fixed', text: 'text-tertiary', dotColor: 'bg-tertiary' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-700', dotColor: 'bg-emerald-600' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-700', dotColor: 'bg-amber-600' },
    error: { bg: 'bg-error-container/40', text: 'text-error', dotColor: 'bg-error' },
    neutral: { bg: 'bg-surface-container', text: 'text-on-surface-variant', dotColor: 'bg-outline' },
  }

  const activeStyle = stage ? stageStyles[stage] : variantStyles[variant]
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-label-sm' : 'px-2.5 py-1 text-label-md'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${activeStyle.bg} ${activeStyle.text} ${sizeClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${activeStyle.dotColor}`} />}
      {children || (stage && stageStyles[stage].defaultLabel)}
    </span>
  )
}
