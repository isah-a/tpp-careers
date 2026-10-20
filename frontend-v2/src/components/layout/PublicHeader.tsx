import { Link } from 'react-router-dom'
import { Brand } from '../shared/Brand'
import { Lock } from 'lucide-react'

export interface PublicHeaderProps {
  vacanciesCount?: number
}

export function PublicHeader({ vacanciesCount }: PublicHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="h-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-4">
          <Brand to="/" />
          {typeof vacanciesCount === 'number' && vacanciesCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F3EBFD] text-[#5C00DD]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5C00DD]" />
              {vacanciesCount} Open Position{vacanciesCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {/* Right: Recruiter Portal Link */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-gray-100 text-xs font-medium text-gray-700 transition-colors"
          >
            <Lock size={12} className="text-gray-400" />
            <span>Recruiter Sign In</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
