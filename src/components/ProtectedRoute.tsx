import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, authorized, loading } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center text-violet">Loading…</div>
  return session && authorized ? children : <Navigate to="/login" replace />
}
