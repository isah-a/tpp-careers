import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  User,
  Mail,
  Lock,
  Key,
  Building,
  Check,
  CircleAlert,
  Loader2,
  Copy,
  LogOut,
  Shield,
  Eye,
  EyeOff,
  Server,
  Info,
  Calendar,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Recruiter } from '../../types'

export function SettingsPage() {
  const { session, signOut } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  // Tab: 'account' | 'workspace'
  const activeTab = (searchParams.get('tab') as 'account' | 'workspace') || 'account'

  // Profile state
  const [fullName, setFullName] = useState<string>('')
  const [profileSaving, setProfileSaving] = useState<boolean>(false)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<boolean>(false)

  // Password state
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmPassword, setConfirmPassword] = useState<string>('')
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false)
  const [passwordSaving, setPasswordSaving] = useState<boolean>(false)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Workspace & Recruiter directory state
  const [recruiterRecord, setRecruiterRecord] = useState<Recruiter | null>(null)
  const [loadingRecruiter, setLoadingRecruiter] = useState<boolean>(true)

  // Initialize profile values from current session
  useEffect(() => {
    if (session?.user) {
      const existingName =
        (session.user.user_metadata?.full_name as string) ||
        (session.user.email ? session.user.email.split('@')[0] : '')
      setFullName(existingName)
    }
  }, [session])

  // Load recruiter directory record from public.recruiters
  useEffect(() => {
    if (!session?.user?.id) return

    let isMounted = true

    async function loadRecruiterRecord() {
      setLoadingRecruiter(true)
      try {
        const { data, error } = await supabase
          .from('recruiters')
          .select('user_id, display_name, created_at')
          .eq('user_id', session!.user.id)
          .single()

        if (!error && data && isMounted) {
          setRecruiterRecord(data as Recruiter)
        }
      } catch (err) {
        console.warn('[SettingsPage] Error querying recruiters directory:', err)
      } finally {
        if (isMounted) setLoadingRecruiter(false)
      }
    }

    void loadRecruiterRecord()

    return () => {
      isMounted = false
    }
  }, [session?.user?.id])

  // Save profile display name
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    setProfileSuccess(null)

    const trimmed = fullName.trim()
    if (!trimmed || trimmed.length < 2) {
      setProfileError('Display name must be at least 2 characters long.')
      return
    }

    setProfileSaving(true)

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: trimmed },
      })

      if (error) throw error

      if (data?.user) {
        setProfileSuccess('Profile display name updated successfully.')
        setTimeout(() => setProfileSuccess(null), 4000)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile'
      console.error('[SettingsPage] Update user error:', msg)
      setProfileError(msg)
    } finally {
      setProfileSaving(false)
    }
  }

  // Update password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!newPassword) {
      setPasswordError('Please enter a new password.')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please verify both fields.')
      return
    }

    setPasswordSaving(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setPasswordSuccess('Password updated successfully. Your new password is now active.')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(null), 5000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password'
      console.error('[SettingsPage] Password update error:', msg)
      setPasswordError(msg)
    } finally {
      setPasswordSaving(false)
    }
  }

  // Copy User ID
  const handleCopyUserId = () => {
    if (!session?.user?.id) return
    navigator.clipboard.writeText(session.user.id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const userEmail = session?.user?.email || '—'
  const userInitials = (fullName || 'R')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const formattedSignInTime = session?.user?.last_sign_in_at
    ? new Date(session.user.last_sign_in_at).toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Active session'

  const formattedAuthorizedDate = recruiterRecord?.created_at
    ? new Date(recruiterRecord.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Verified'

  return (
    <div className="p-8 lg:p-9 max-w-[1080px] mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <div>
        <h1 className="text-[24px] font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your recruiter profile, security credentials, and verified workspace authorization.
        </p>
      </div>

      {/* 2. Settings Tab Navigation */}
      <div className="border-b border-gray-200 flex items-center gap-8 text-sm font-semibold select-none">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'account' })}
          className={`pb-3.5 relative transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'account'
              ? 'text-[#5C00DD] font-bold'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <User size={16} />
          <span>My Account & Security</span>
          {activeTab === 'account' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5C00DD] rounded-t-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'workspace' })}
          className={`pb-3.5 relative transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'workspace'
              ? 'text-[#5C00DD] font-bold'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Building size={16} />
          <span>Recruiter Workspace</span>
          {activeTab === 'workspace' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5C00DD] rounded-t-full" />
          )}
        </button>
      </div>

      {/* 3. TAB 1: MY ACCOUNT & SECURITY */}
      {activeTab === 'account' && (
        <div className="flex flex-col gap-6">
          {/* Card 1: Profile Information */}
          <section className="bg-white rounded-2xl border border-gray-100 p-7 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-[#F3EBFD] text-[#5C00DD] flex items-center justify-center">
                <User size={18} />
              </div>
              <h2 className="text-base font-bold text-gray-900">Profile Information</h2>
            </div>

            {profileSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <CircleAlert size={16} className="text-red-600 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="mt-6 space-y-5 max-w-xl">
              {/* Avatar and Info Row */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#F3EBFD] text-[#5C00DD] font-bold text-lg flex items-center justify-center border-2 border-white ring-2 ring-purple-100 select-none shrink-0 shadow-xs">
                  {userInitials}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{fullName || 'Recruiter'}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{userEmail}</div>
                </div>
              </div>

              {/* Display Name Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Mariam Abdulkareem"
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] placeholder:text-gray-400 transition-all shadow-2xs"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Visible across the recruiter dashboard and application reviews.
                </p>
              </div>

              {/* Email Address (Read-only Auth identity) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Account Email
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="email"
                      value={userEmail}
                      disabled
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-600 cursor-not-allowed select-all"
                    />
                    <Mail size={16} className="absolute right-3.5 top-3 text-gray-400" />
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shrink-0">
                    Verified
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Your primary authentication identity managed by Supabase GoTrue.
                </p>
              </div>

              {/* User UUID */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  User ID
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={session?.user?.id || '—'}
                    disabled
                    className="flex-1 px-4 py-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUserId}
                    className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Copy User UUID"
                  >
                    {copiedId ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedId ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#5C00DD] hover:bg-[#4A00B4] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {profileSaving && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </section>

          {/* Card 2: Security & Password */}
          <section className="bg-white rounded-2xl border border-gray-100 p-7 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-[#F3EBFD] text-[#5C00DD] flex items-center justify-center">
                <Key size={18} />
              </div>
              <h2 className="text-base font-bold text-gray-900">Change Password</h2>
            </div>

            {passwordSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
                <CircleAlert size={16} className="text-red-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 characters)"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] placeholder:text-gray-400 transition-all shadow-2xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(prev => !prev)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] placeholder:text-gray-400 transition-all shadow-2xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving || !newPassword || !confirmPassword}
                  className="px-5 py-2.5 rounded-xl bg-[#5C00DD] hover:bg-[#4A00B4] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {passwordSaving && <Loader2 size={14} className="animate-spin" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </section>

          {/* Card 3: Session Management */}
          <section className="bg-white rounded-2xl border border-gray-100 p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Shield size={16} className="text-[#5C00DD]" />
                <span>Active Session</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Last authenticated: <span className="font-medium text-gray-700">{formattedSignInTime}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
            >
              <LogOut size={15} />
              <span>Sign Out of Workspace</span>
            </button>
          </section>
        </div>
      )}

      {/* 4. TAB 2: RECRUITER WORKSPACE (VERIFIED READ-ONLY BACKEND STATE) */}
      {activeTab === 'workspace' && (
        <div className="flex flex-col gap-6">
          {/* Card 1: Recruiter Directory Authorization */}
          <section className="bg-white rounded-2xl border border-gray-100 p-7 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-[#F3EBFD] text-[#5C00DD] flex items-center justify-center">
                <Shield size={18} />
              </div>
              <h2 className="text-base font-bold text-gray-900">Recruiter Directory Record</h2>
            </div>

            {loadingRecruiter ? (
              <div className="py-8 text-center text-gray-400">
                <Loader2 size={24} className="animate-spin text-[#5C00DD] mx-auto mb-2" />
                <p className="text-xs font-medium">Loading recruiter directory status...</p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                    <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider block">
                      Directory Signature
                    </span>
                    <span className="text-sm font-bold text-gray-900 mt-1 block">
                      {recruiterRecord?.display_name || 'HR Recruiter'}
                    </span>
                    <span className="text-[11px] text-gray-500 mt-0.5 block">
                      Assigned signature used in application reviews and stage transitions.
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
                    <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider block">
                      Authorization Role
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-gray-900">Authorized Recruiter</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                        Active
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 mt-0.5 block">
                      Verified member of <code className="text-[11px]">public.recruiters</code> via RLS check.
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider block">
                      Authorized Since
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 mt-0.5">
                      <Calendar size={13} className="text-[#5C00DD]" />
                      <span>{formattedAuthorizedDate}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    RLS Policy: <code className="text-gray-600">is_recruiter() = true</code>
                  </span>
                </div>

                {/* Directory Notice */}
                <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-3">
                  <Info size={17} className="text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-900">Directory Permissions Notice:</span>{' '}
                    <span>
                      Recruiter directory records (<code className="text-amber-800 font-semibold">public.recruiters</code>)
                      are read-only for workspace users to maintain audit integrity. Directory assignments and new recruiter
                      authorizations are managed via PostgreSQL security roles.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Card 2: Backend Architecture & Connection Context */}
          <section className="bg-white rounded-2xl border border-gray-100 p-7 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-[#F3EBFD] text-[#5C00DD] flex items-center justify-center">
                <Server size={18} />
              </div>
              <h2 className="text-base font-bold text-gray-900">Backend Infrastructure Context</h2>
            </div>

            <div className="mt-5 space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Recruitment Platform</span>
                <span className="font-semibold text-gray-900">OnCulture Hires (frontend-v2)</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Client Organization</span>
                <span className="font-semibold text-gray-900">TPP Careers</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Backend Endpoint</span>
                <span className="font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                  {import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500 font-medium">Private Storage Bucket</span>
                <span className="font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                  cvs (Signed URLs)
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500 font-medium">Security & Rate Limiting</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                  Cloudflare Turnstile Active
                </span>
              </div>
            </div>

            {/* Scope Notice matching constraint 6 */}
            <div className="mt-5 rounded-xl bg-[#F5F7FD] border border-[#E8EDF7] p-4 text-xs text-gray-700 flex items-start gap-3">
              <Info size={17} className="text-[#5C00DD] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-900">Architecture Scope:</span>{' '}
                <span>
                  Organization email templates, billing tiers, and team member invitations are managed through
                  the Supabase project administrative dashboard. These capabilities are intentionally not fabricated
                  as frontend mock controls.
                </span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
