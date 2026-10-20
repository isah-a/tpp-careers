import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Brand } from '../../components/shared/Brand'
import { useAuth } from '../../context/AuthContext'
import { isConfigured, supabase } from '../../lib/supabase'
import { AlertCircle, Lock, Mail, ArrowRight } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { session, authorized } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Redirect to dashboard if already authenticated
  if (session && authorized) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
      } else {
        navigate('/dashboard')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      if (msg.includes('Failed to fetch') || msg.includes('ECONNREFUSED')) {
        setError('Cannot connect to local Supabase at http://127.0.0.1:54321. Ensure local Supabase is running.')
      } else {
        setError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Brand to="/" />
        <h1 className="mt-6 text-center text-[24px] font-bold tracking-tight text-gray-900">
          Recruiter Workspace
        </h1>
        <p className="mt-2 text-center text-sm text-gray-500">
          Sign in to manage talent pipelines, vacancies, and applications.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-2xl border border-gray-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Work Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Work Email
              </label>
              <div className="mt-1 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="recruiter@onculture.io"
                  className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] focus:border-transparent transition-colors placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] focus:border-transparent transition-colors placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 p-3.5 border border-red-200 text-xs text-red-700 flex items-start gap-2.5"
              >
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Configuration Notice */}
            {!isConfigured && (
              <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-800">
                Supabase configuration missing in .env.local.
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={busy || !isConfigured}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-xs text-sm font-medium text-white bg-[#5C00DD] hover:bg-[#4A00B4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5C00DD] disabled:opacity-50 transition-colors cursor-pointer"
              >
                <span>{busy ? 'Signing in...' : 'Sign In'}</span>
                {!busy && <ArrowRight size={16} />}
              </button>
            </div>
          </form>

          {/* Footer Navigation */}
          <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Authorized personnel only</span>
            <Link to="/" className="text-[#5C00DD] font-medium hover:underline">
              Public Careers Portal →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
