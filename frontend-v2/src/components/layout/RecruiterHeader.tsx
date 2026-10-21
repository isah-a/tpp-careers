import { useState, useRef, useEffect } from 'react'
import { Bell, ChevronDown, Menu, LogOut, Settings as SettingsIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export interface RecruiterHeaderProps {
  onMobileMenuToggle: () => void
}

const routeTitles: Record<string, string> = {
  '/dashboard': 'Home',
  '/dashboard/jobs': 'Jobs',
  '/dashboard/vacancies': 'Jobs',
  '/dashboard/applicants': 'Applicants',
  '/dashboard/candidates': 'Applicants',
  '/dashboard/pipeline': 'Pipeline',
  '/dashboard/settings': 'Settings',
}

export function RecruiterHeader({ onMobileMenuToggle }: RecruiterHeaderProps) {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Resolve current page title
  const currentTitle =
    routeTitles[location.pathname] ||
    (location.pathname.startsWith('/dashboard/jobs') || location.pathname.startsWith('/dashboard/vacancies')
      ? 'Jobs'
      : location.pathname.startsWith('/dashboard/applicants') || location.pathname.startsWith('/dashboard/candidates')
      ? 'Applicants'
      : 'Home')

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Check if explicitly running in visual test fixture mode
  const isFixture = new URLSearchParams(location.search).get('fixture') === 'true'

  // User display name, email, and role: strictly derived from auth session unless in visual fixture
  const userEmail = session?.user?.email || (isFixture ? 'mohammed@onculture.io' : 'No active session')
  const userName =
    (session?.user?.user_metadata?.full_name as string) ||
    (session?.user?.email ? session.user.email.split('@')[0] : (isFixture ? 'Mohammed Abdulkareem' : 'Recruiter'))
  const userRole = isFixture ? 'Admin' : (session ? 'Recruiter' : 'Guest')

  // Notification count: sample badge '1' strictly in fixture mode; 0 in normal mode
  const notificationCount = isFixture ? 1 : 0

  const userInitials = (userName || 'R')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="fixed top-0 right-0 left-0 md:left-[280px] h-[72px] bg-white border-b border-gray-100 z-30 px-8 flex items-center justify-between">
      {/* Left: Mobile Menu + Screen Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-[20px] font-semibold text-gray-900 tracking-tight">
          {currentTitle}
        </h1>
      </div>

      {/* Right: Notifications + Recruiter Profile */}
      <div className="flex items-center">
        {/* Notifications Button */}
        <div className="relative">
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer relative"
            aria-label={notificationCount > 0 ? `Notifications (${notificationCount} new)` : 'Notifications'}
            title={notificationCount > 0 ? `${notificationCount} new notification` : 'No new notifications'}
          >
            <Bell size={20} strokeWidth={1.8} className="text-gray-600" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#5C00DD] text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {notificationCount}
              </span>
            )}
          </button>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-gray-200 mx-4" />

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(prev => !prev)}
            className="flex items-center gap-3 p-1 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group select-none text-left"
            aria-expanded={profileDropdownOpen}
            aria-haspopup="true"
          >
            {/* Avatar */}
            <div className="w-[38px] h-[38px] rounded-full overflow-hidden bg-purple-100 ring-1 ring-gray-200 shrink-0 flex items-center justify-center">
              {isFixture ? (
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80"
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-[#5C00DD]">{userInitials}</span>
              )}
            </div>

            {/* Recruiter Details */}
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-medium text-gray-900 leading-tight">
                {userName}
              </span>
              <span className="text-[12px] text-gray-500 leading-tight mt-0.5">
                {userRole}
              </span>
            </div>

            {/* Dropdown Chevron */}
            <ChevronDown
              size={16}
              className={`text-gray-400 group-hover:text-gray-600 transition-transform ${
                profileDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-modal border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-500">Signed in as</p>
                <p className="text-sm font-medium text-gray-900 truncate mt-0.5">{userEmail}</p>
              </div>

              <Link
                to="/dashboard/settings?tab=account"
                onClick={() => setProfileDropdownOpen(false)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <SettingsIcon size={16} className="text-gray-400" />
                <span>Account Settings</span>
              </Link>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false)
                  void signOut()
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
