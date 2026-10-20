import { Link } from 'react-router-dom'

export interface BrandProps {
  to?: string
  className?: string
  mode?: 'public' | 'workspace'
}

export function Brand({ to = '/dashboard', className = '', mode = 'workspace' }: BrandProps) {
  return (
    <Link to={to} className={`inline-flex items-center gap-0.5 select-none ${className}`} aria-label="OnCulture">
      {/* OnCulture SVG Logo */}
      <svg
        className="h-7 w-auto"
        viewBox="0 0 125 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* 'O' with center dot */}
        <circle cx="16" cy="16" r="11" stroke="#5C00DD" strokeWidth="4.5" />
        <circle cx="16" cy="16" r="3.2" fill="#5C00DD" />
        
        {/* 'nCulture' text */}
        <text
          x="32"
          y="23.5"
          fill="#5C00DD"
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
          fontSize="22"
          fontWeight="700"
          letterSpacing="-0.03em"
        >
          nCulture
        </text>
      </svg>
    </Link>
  )
}
