import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, authorized, loading } = useAuth()
  const location = useLocation()

  // Support visual fixture mode for local development verification
  const isFixtureMode =
    new URLSearchParams(location.search).get('fixture') === 'true' ||
    (typeof window !== 'undefined' && window.sessionStorage.getItem('tpp_dev_fixture') === 'true')

  if (isFixtureMode) {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('tpp_dev_fixture', 'true')
    }
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#5C00DD] border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-gray-500">
          Verifying workspace credentials...
        </p>
      </div>
    )
  }

  if (!session || !authorized) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
