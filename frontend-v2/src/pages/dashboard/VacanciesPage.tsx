import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Briefcase,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Copy,
  ExternalLink,
  Info,
  Loader2,
  Pencil,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Vacancy, VacancyStatus } from '../../types'

interface VacancyWithCount extends Vacancy {
  application_count?: number
}

// Sample mock data for development fixture mode (?fixture=true)
const FIGMA_VACANCIES_FIXTURE: VacancyWithCount[] = [
  {
    id: 'v-1',
    title: 'Senior Project Manager',
    slug: 'senior-project-manager',
    client_name: 'TPP Hire',
    department: 'Operations',
    location: 'Lagos, Nigeria',
    workplace_type: 'hybrid',
    employment_type: 'Full-time',
    status: 'active',
    description: 'Lead strategic operational initiatives across client engagements.',
    requirements: 'Minimum 5 years of project management experience.',
    created_at: '2024-02-01T10:00:00Z',
    updated_at: '2024-02-08T14:30:00Z',
    deadline: '2024-12-31',
    application_count: 10,
  },
  {
    id: 'v-2',
    title: 'Brand, Communications & Marketing Manager',
    slug: 'brand-communications-marketing-manager',
    client_name: 'TPP Hire',
    department: 'Marketing',
    location: 'Lagos, Nigeria',
    workplace_type: 'onsite',
    employment_type: 'Full-time',
    status: 'active',
    description: 'Architect brand messaging, PR campaigns, and omni-channel growth.',
    requirements: 'Minimum 5 years in brand leadership.',
    created_at: '2024-02-03T11:00:00Z',
    updated_at: '2024-02-09T16:00:00Z',
    deadline: '2024-12-31',
    application_count: 6,
  },
  {
    id: 'v-3',
    title: 'Lead Product Designer',
    slug: 'lead-product-designer',
    client_name: 'TPP Hire',
    department: 'Design',
    location: 'Remote',
    workplace_type: 'remote',
    employment_type: 'Full-time',
    status: 'draft',
    description: 'Design world-class UX/UI interfaces for next-gen products.',
    requirements: 'Deep Figma mastery and systems thinking.',
    created_at: '2024-02-05T09:00:00Z',
    updated_at: '2024-02-07T12:00:00Z',
    deadline: null,
    application_count: 0,
  },
  {
    id: 'v-4',
    title: 'Technical Recruiter',
    slug: 'technical-recruiter',
    client_name: 'TPP Hire',
    department: 'People',
    location: 'Lagos, Nigeria',
    workplace_type: 'hybrid',
    employment_type: 'Contract',
    status: 'closed',
    description: 'Source and hire top engineering talent across Africa.',
    requirements: '3+ years tech talent sourcing experience.',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-02-01T10:00:00Z',
    deadline: '2024-02-01',
    application_count: 24,
  },
]

const PAGE_SIZE = 8

export function VacanciesPage() {
  const [searchParams] = useSearchParams()

  const isFixtureRequested =
    !import.meta.env.PROD && searchParams.get('fixture') === 'true'

  // State
  const [jobs, setJobs] = useState<VacancyWithCount[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [backendError, setBackendError] = useState<string | null>(null)

  // Filters & search
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | VacancyStatus>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Feedback notifications
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)

  // Load live vacancies from Supabase
  useEffect(() => {
    if (isFixtureRequested) {
      setJobs(FIGMA_VACANCIES_FIXTURE)
      setLoading(false)
      return
    }

    let isMounted = true

    async function loadVacancies() {
      setLoading(true)
      setBackendError(null)

      try {
        const { data, error } = await supabase
          .from('vacancies')
          .select('*, applications(count)')
          .order('updated_at', { ascending: false })

        if (error) throw new Error(error.message)

        if (isMounted) {
          const mapped: VacancyWithCount[] = (data || []).map((v: any) => ({
            ...v,
            application_count: v.applications?.[0]?.count || 0,
          }))

          setJobs(mapped)
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Database error'
          console.error('[VacanciesPage] Failed to load vacancies:', msg)
          setBackendError(msg)
          setJobs([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadVacancies()

    return () => {
      isMounted = false
    }
  }, [isFixtureRequested])

  // Filtered vacancies
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        (job.department && job.department.toLowerCase().includes(q)) ||
        job.location.toLowerCase().includes(q) ||
        (job.client_name && job.client_name.toLowerCase().includes(q))

      const matchesStatus =
        statusFilter === 'all' || job.status === statusFilter

      const matchesType =
        typeFilter === 'all' || job.employment_type === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  }, [jobs, searchQuery, statusFilter, typeFilter])

  // Pagination
  const totalEntries = filteredJobs.length
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE))
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredJobs.slice(start, start + PAGE_SIZE)
  }, [filteredJobs, currentPage])

  // Summary counts
  const totalApplicants = useMemo(() => {
    return jobs.reduce((sum, j) => sum + (j.application_count || 0), 0)
  }, [jobs])
  const activeCount = jobs.filter(j => j.status === 'active').length
  const draftCount = jobs.filter(j => j.status === 'draft').length
  const closedCount = jobs.filter(j => j.status === 'closed').length

  // Quick status toggle action (Active <-> Closed)
  const handleToggleStatus = async (job: VacancyWithCount) => {
    const nextStatus: VacancyStatus = job.status === 'active' ? 'closed' : 'active'

    if (isFixtureRequested) {
      setJobs(prev =>
        prev.map(j => (j.id === job.id ? { ...j, status: nextStatus } : j))
      )
      setActionSuccess(`[Fixture] Updated "${job.title}" status to ${nextStatus}.`)
      setTimeout(() => setActionSuccess(null), 3000)
      return
    }

    setActionError(null)
    setStatusUpdatingId(job.id)

    try {
      const { error } = await supabase
        .from('vacancies')
        .update({ status: nextStatus })
        .eq('id', job.id)

      if (error) throw error

      setJobs(prev =>
        prev.map(j => (j.id === job.id ? { ...j, status: nextStatus } : j))
      )
      setActionSuccess(`Job "${job.title}" marked as ${nextStatus}.`)
      setTimeout(() => setActionSuccess(null), 3500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database update failed'
      console.error('[VacanciesPage] Status toggle error:', msg)
      setActionError(`Could not update job status: ${msg}`)
    } finally {
      setStatusUpdatingId(null)
    }
  }

  // Copy public link
  const handleCopyLink = async (slug: string, title: string) => {
    const url = `${window.location.origin}/jobs/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      setActionSuccess(`Public link copied for "${title}".`)
      setTimeout(() => setActionSuccess(null), 3000)
    } catch {
      setActionError('Could not copy link to clipboard.')
    }
  }

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    try {
      const d = new Date(dateString)
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      }).format(d)
    } catch {
      return dateString
    }
  }

  return (
    <div className="p-8 max-w-[1440px] mx-auto flex flex-col gap-6">
      {/* Action Error Banner */}
      {actionError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-3 shadow-xs animate-in fade-in"
        >
          <CircleAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-900">Action Failed</p>
            <p className="mt-0.5 text-red-700">{actionError}</p>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Action Success Banner */}
      {actionSuccess && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-500 hover:text-emerald-700 p-0.5 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Backend Error Banner */}
      {backendError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs"
        >
          <CircleAlert size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Database Connection Unavailable</p>
            <p className="mt-0.5 text-amber-800">
              Could not retrieve job requisitions from Supabase: <span className="font-mono">{backendError}</span>.
            </p>
            {!import.meta.env.PROD && (
              <p className="mt-1 text-amber-700">
                To preview sample job requisitions in development mode, append{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[#5C00DD]">?fixture=true</code> to the URL.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Fixture Mode Banner */}
      {!import.meta.env.PROD && isFixtureRequested && (
        <div
          role="status"
          className="rounded-xl border border-purple-200 bg-purple-50/80 p-4 text-xs text-purple-900 flex items-start gap-3 shadow-xs"
        >
          <Info size={18} className="text-purple-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-purple-900">DEVELOPMENT FIXTURE MODE (?fixture=true)</p>
            <p className="mt-0.5 text-purple-800">
              Displaying sample vacancy records for layout and navigation verification.
            </p>
          </div>
          <Link
            to="/dashboard/jobs"
            className="text-xs font-semibold text-[#5C00DD] underline hover:text-[#4900B0] self-center"
          >
            Switch to Live DB
          </Link>
        </div>
      )}

      {/* 1. Header with Prominent "+ Create New Job" Button */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5C00DD] uppercase tracking-wider mb-1">
            <Briefcase size={14} />
            <span>Talent Infrastructure</span>
          </div>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">
            Jobs & Vacancy Management
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Create, publish, and monitor active client requisitions across hiring pipelines.
          </p>
        </div>

        {/* PROMINENT "+ Create New Job" BUTTON */}
        <Link
          to="/dashboard/jobs/new"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5C00DD] hover:bg-[#4A00B4] text-white text-sm font-semibold transition-colors shadow-xs self-start sm:self-auto cursor-pointer active:scale-[0.99]"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>+ Create New Job</span>
        </Link>
      </header>

      {/* 2. Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Total Requisitions
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-1.5">{jobs.length}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
            Active in Market
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-1.5">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">
            Drafts
          </span>
          <p className="text-2xl font-bold text-amber-700 mt-1.5">{draftCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#5C00DD]">
            Total Applicants
          </span>
          <p className="text-2xl font-bold text-[#5C00DD] mt-1.5">{totalApplicants}</p>
        </div>
      </div>

      {/* 3. Table Container & Filter Toolbar */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search by role title, department, or location..."
              className="block w-full pl-10 pr-4 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] focus:border-transparent shadow-xs transition-colors placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value as any)
                setCurrentPage(1)
              }}
              className="w-full md:w-auto bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5C00DD] shadow-xs cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Employment Type Filter */}
          <div className="w-full md:w-auto">
            <select
              value={typeFilter}
              onChange={e => {
                setTypeFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full md:w-auto bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5C00DD] shadow-xs cursor-pointer"
            >
              <option value="all">All Employment Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB]/70 border-b border-gray-100 text-[12px] font-semibold text-gray-700 select-none">
              <tr>
                <th className="px-6 py-4">Role / Requisition</th>
                <th className="px-6 py-4">Department & Location</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Applicants</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                    <Loader2 size={24} className="animate-spin text-[#5C00DD] mx-auto mb-2" />
                    <p className="text-sm font-medium">Loading requisitions...</p>
                  </td>
                </tr>
              ) : paginatedJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                    <Briefcase size={28} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-800">No requisitions found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                        ? 'Try clearing your search or filter parameters.'
                        : 'Get started by creating your first job requisition.'}
                    </p>
                    <div className="mt-4">
                      <Link
                        to="/dashboard/jobs/new"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5C00DD] text-white text-xs font-semibold hover:bg-[#4A00B4] transition-colors"
                      >
                        <Plus size={16} />
                        <span>Create New Job</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedJobs.map(job => {
                  const isUpdating = statusUpdatingId === job.id

                  return (
                    <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Role & Client Name */}
                      <td className="px-6 py-4">
                        <Link
                          to={`/dashboard/jobs/${job.id}`}
                          className="font-bold text-sm text-gray-900 hover:text-[#5C00DD] transition-colors leading-snug block"
                        >
                          {job.title}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {job.client_name} · <span className="capitalize">{job.employment_type}</span>
                        </p>
                      </td>

                      {/* Department & Location */}
                      <td className="px-6 py-4 text-xs text-gray-600">
                        <p className="font-medium text-gray-800">{job.department || 'General'}</p>
                        <p className="text-gray-400 mt-0.5">
                          {job.location} {job.workplace_type ? `(${job.workplace_type})` : ''}
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        {job.status === 'active' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#86EFAC]/50">
                            Active
                          </span>
                        ) : job.status === 'draft' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]/60">
                            Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]/50">
                            Closed
                          </span>
                        )}
                      </td>

                      {/* Applicant Count */}
                      <td className="px-6 py-4 text-center">
                        <Link
                          to={`/dashboard/applicants?q=${encodeURIComponent(job.title)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-[#5C00DD] bg-[#F3EBFD] hover:bg-[#EAE4FC] transition-colors"
                          title="View applicants for this job"
                        >
                          <Users size={13} />
                          <span>{job.application_count || 0}</span>
                        </Link>
                      </td>

                      {/* Last Updated */}
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {formatDate(job.updated_at || job.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Public Link (Only for published active jobs) */}
                          {job.status === 'active' && (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleCopyLink(job.slug, job.title)}
                                className="p-1.5 text-gray-400 hover:text-[#5C00DD] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Copy public link"
                                aria-label="Copy public link"
                              >
                                <Copy size={15} />
                              </button>
                              <a
                                href={`/jobs/${job.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-[#5C00DD] hover:bg-gray-100 rounded-lg transition-colors"
                                title="View live public listing"
                                aria-label="View live public listing"
                              >
                                <ExternalLink size={15} />
                              </a>
                            </>
                          )}

                          {/* Edit Requisition */}
                          <Link
                            to={`/dashboard/jobs/${job.id}`}
                            className="p-1.5 text-gray-500 hover:text-[#5C00DD] hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit requisition"
                            aria-label="Edit requisition"
                          >
                            <Pencil size={15} />
                          </Link>

                          {/* Quick Toggle Status */}
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => void handleToggleStatus(job)}
                            className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title={job.status === 'active' ? 'Close requisition' : 'Publish requisition'}
                          >
                            {isUpdating ? (
                              <Loader2 size={13} className="animate-spin text-[#5C00DD]" />
                            ) : job.status === 'active' ? (
                              'Close'
                            ) : (
                              'Publish'
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Pagination Bar */}
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  currentPage === page
                    ? 'bg-gray-100 text-gray-900 font-bold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="text-xs text-gray-500">
            Showing {totalEntries === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to{' '}
            {Math.min(currentPage * PAGE_SIZE, totalEntries)} of {totalEntries} requisitions
          </div>
        </div>
      </section>
    </div>
  )
}
