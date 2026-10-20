import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { RecruiterSidebar } from './RecruiterSidebar'
import { RecruiterHeader } from './RecruiterHeader'

export function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans">
      {/* Desktop Fixed Sidebar (280px) */}
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-[280px] md:flex-col">
        <RecruiterSidebar />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-[280px] bg-white shadow-2xl flex flex-col z-50">
            <RecruiterSidebar onNavClick={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Top Header */}
      <RecruiterHeader onMobileMenuToggle={() => setMobileMenuOpen(prev => !prev)} />

      {/* Main Page Content */}
      <main className="md:pl-[280px] pt-[72px] min-h-screen bg-[#F9FAFB]">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
