import { NavLink } from 'react-router-dom'
import {
  Home,
  Briefcase,
  FileText,
  GitFork,
  Settings,
  LogOut
} from 'lucide-react'
import { Brand } from '../shared/Brand'
import { useAuth } from '../../context/AuthContext'

export interface RecruiterSidebarProps {
  onNavClick?: () => void
}

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: Home, end: true },
  { to: '/dashboard/jobs', label: 'Jobs', icon: Briefcase, end: false },
  { to: '/dashboard/applicants', label: 'Applicants', icon: FileText, end: false },
  { to: '/dashboard/pipeline', label: 'Pipeline', icon: GitFork, end: false },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings, end: false },
]

export function RecruiterSidebar({ onNavClick }: RecruiterSidebarProps) {
  const { signOut } = useAuth()

  return (
    <aside className="w-[280px] h-screen bg-white border-r border-gray-100 flex flex-col justify-between select-none">
      {/* Top Brand & Navigation */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="px-7 pt-8 pb-7">
          <Brand to="/dashboard" />
        </div>

        {/* Navigation List */}
        <nav className="px-4 flex flex-col gap-2" aria-label="Recruiter workspace navigation">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-[15px] transition-colors ${
                    isActive
                      ? 'bg-[#F3EBFD] text-[#5C00DD] font-semibold'
                      : 'text-[#4B5563] hover:text-gray-900 hover:bg-gray-50/80 font-medium'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={20}
                      className={isActive ? 'text-[#5C00DD]' : 'text-[#6B7280]'}
                      strokeWidth={isActive ? 2.2 : 1.9}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Divider line below settings */}
        <div className="mx-7 mt-8 border-t border-gray-100" />
      </div>

      {/* Footer / Sign Out */}
      <div className="p-4 mx-2 mb-2 border-t border-gray-100">
        <button
          onClick={() => void signOut()}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut size={18} className="text-gray-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
