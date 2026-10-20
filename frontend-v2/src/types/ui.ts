export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface MetricCardProps {
  label: string
  value: string | number
  trend?: string
  trendType?: 'positive' | 'negative' | 'neutral'
  icon?: string // Material Symbol name
  description?: string
  accentColor?: 'primary' | 'secondary' | 'tertiary'
}

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  badgeText?: string
  badgeVariant?: 'primary' | 'secondary'
  children: React.ReactNode
  footerActions?: React.ReactNode
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl'
}

export interface ToastMessage {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
}
