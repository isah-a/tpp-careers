import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Application, ApplicationStage } from '../../types'

interface ApplicationWithMeta extends Application {
  userRating?: number
}

// 10 Mock records strictly matching Figma Jobs.png for visual verification
const FIGMA_JOBS_FIXTURE: ApplicationWithMeta[] = [
  {
    id: 'figma-1',
    vacancy_id: 'v-1',
    full_name: 'Philip Nwachukwu Mathew',
    email: 'Philip@abc.io',
    phone: '+234 801 234 5678',
    created_at: '2024-02-09T10:00:00Z',
    cv_path: 'mock/philip-cv.pdf',
    stage: 'screening',
    answers: {},
    userRating: 0,
    vacancies: { id: 'v-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
  },
  {
    id: 'figma-2',
    vacancy_id: 'v-1',
    full_name: 'Pristia Candra',
    email: 'lincoln@unpixel.com',
    phone: '+234 802 345 6789',
    created_at: '2024-02-09T11:00:00Z',
    cv_path: 'mock/pristia-cv.pdf',
    stage: 'screening',
    answers: {},
    userRating: 0,
    vacancies: { id: 'v-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
  },
  {
    id: 'figma-3',
    vacancy_id: 'v-1',
    full_name: 'Pristia Candra',
    email: 'lincoln@unpixel.com',
    phone: '+234 802 345 6789',
    created_at: '2024-02-09T12:00:00Z',
    cv_path: 'mock/pristia-cv.pdf',
    stage: 'screening',
    answers: {},
    userRating: 0,
    vacancies: { id: 'v-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
  },
  {
    id: 'figma-4',
    vacancy_id: 'v-1',
    full_name: 'Pristia Candra',
    email: 'lincoln@unpixel.com',
    phone: '+234 802 345 6789',
    created_at: '2024-02-09T13:00:00Z',
    cv_path: 'mock/pristia-cv.pdf',
    stage: 'interview',
    answers: {},
    userRating: 5,
    vacancies: { id: 'v-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
  },
  {
    id: 'figma-5',
    vacancy_id: 'v-1',
    full_name: 'Pristia Candra',
    email: 'lincoln@unpixel.com',
    phone: '+234 802 345 6789',
    created_at: '2024-02-09T14:00:00Z',
    cv_path: 'mock/pristia-cv.pdf',
    stage: 'review',
    answers: {},
    userRating: 5,
    vacancies: { id: 'v-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
  },
  {
    id: 'figma-6',
    vacancy_id: 'v-1',
    full_name: 'Pristia Candra',
    email: 'lincoln@unpixel.com',
    phone: '+234 802 345 6789',
    created_at: '2024-02-09T15:00:00Z',
    cv_path: 'mock/pristia-cv.pdf',
    stage: 'review',
    answers: {},
    userRating: 3,
    vacancies: { id: 'v-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
  },
  {
    id: 'figma-7',
    vacancy_id: 'v-1',
    full_name: 'Pristia Candra',
    email: 'lincoln@unpixel.com',
    phone: '+234 802 345 6789',
    created_at: '2024-02-12T09:00:00Z',
    cv_path: 'mock/pristia-cv.pdf',
    stage: 'hired',
    answers: {},
    userRating: 3,
    vacancies: { id: 'v-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
  },
  {
    id: 'figma-8',
    vacancy_id: 'v-1',
    full_name: 'Pristia Candra',
    email: 'lincoln@unpixel.com',
    phone: '+234 802 345 6789',
    created_at: '2024-02-12T10:00:00Z',
    cv_path: 'mock/pristia-cv.pdf',
    stage: 'rejected',
    answers: {},
    userRating: 0,
    vacancies: { id: 'v-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
  },
  {
    id: 'figma-9',
    vacancy_id: 'v-1',
    full_name: 'Pristia Candra',
    email: 'lincoln@unpixel.com',
    phone: '+234 802 345 6789',
    created_at: '2024-02-12T11:00:00Z',
    cv_path: 'mock/pristia-cv.pdf',
    stage: 'rejected',
    answers: {},
    userRating: 0,
    vacancies: { id: 'v-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
  },
  {
    id: 'figma-10',
    vacancy_id: 'v-1',
    full_name: 'Pristia Candra',
    email: 'lincoln@unpixel.com',
    phone: '+234 802 345 6789',
    created_at: '2024-02-12T12:00:00Z',
    cv_path: 'mock/pristia-cv.pdf',
    stage: 'rejected',
    answers: {},
    userRating: 0,
    vacancies: { id: 'v-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
  },
]

export function CandidatesPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const isFixtureMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(location.search).get('fixture') === 'true'

  // Query & filter states
  const [applications, setApplications] = useState<ApplicationWithMeta[]>(
    isFixtureMode ? FIGMA_JOBS_FIXTURE : []
  )
  const [loading, setLoading] = useState(!isFixtureMode)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [isUsingFixture, setIsUsingFixture] = useState(isFixtureMode)

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedStage, setSelectedStage] = useState<string>('all')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Pagination state (default 8 per page to match Jobs.png "Show 8")
  const [pageSize, setPageSize] = useState<number>(8)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Recruiter rating saving feedback
  const [ratingUpdatingId, setRatingUpdatingId] = useState<string | null>(null)

  // Load live data from Supabase
  useEffect(() => {
    if (isFixtureMode) {
      setApplications(FIGMA_JOBS_FIXTURE)
      setIsUsingFixture(true)
      setLoading(false)
      return
    }

    let isMounted = true

    async function loadApplications() {
      setLoading(true)
      setBackendError(null)

      try {
        const { data, error } = await supabase
          .from('applications')
          .select('*, vacancies(id, title, slug), application_reviews(reviewer_id, rating)')
          .order('created_at', { ascending: false })

        if (error) throw new Error(error.message)

        if (isMounted) {
          const mapped: ApplicationWithMeta[] = (data || []).map((app: any) => {
            const myReview = app.application_reviews?.find(
              (r: any) => r.reviewer_id === session?.user?.id
            )
            return {
              ...app,
              userRating: myReview ? myReview.rating : 0,
            }
          })

          setApplications(mapped)
          setIsUsingFixture(false)
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Database error'
          console.warn('[CandidatesPage] Falling back to visual fixture:', msg)
          setBackendError(msg)
          setApplications(FIGMA_JOBS_FIXTURE)
          setIsUsingFixture(true)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadApplications()

    return () => {
      isMounted = false
    }
  }, [isFixtureMode, session?.user?.id])

  // Filter application rows
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        app.full_name.toLowerCase().includes(q) ||
        app.email.toLowerCase().includes(q) ||
        (app.vacancies?.title && app.vacancies.title.toLowerCase().includes(q))

      const matchesStage =
        selectedStage === 'all' ||
        app.stage === selectedStage ||
        (selectedStage === 'new' && app.stage === 'screening')

      return matchesSearch && matchesStage
    })
  }, [applications, searchQuery, selectedStage])

  // Paginated items
  const totalEntries = filteredApplications.length
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize))
  const paginatedApplications = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredApplications.slice(start, start + pageSize)
  }, [filteredApplications, currentPage, pageSize])

  // Selection handlers
  const allCurrentPageSelected =
    paginatedApplications.length > 0 &&
    paginatedApplications.every(app => selectedIds.has(app.id))

  const handleToggleSelectAll = () => {
    if (allCurrentPageSelected) {
      setSelectedIds(new Set())
    } else {
      const next = new Set(selectedIds)
      paginatedApplications.forEach(app => next.add(app.id))
      setSelectedIds(next)
    }
  }

  const handleToggleSelectRow = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  // Recruiter-specific 5-star rating handler
  const handleRate = async (applicationId: string, ratingValue: number) => {
    if (isUsingFixture || !session?.user?.id) {
      // Optimistic update in visual fixture
      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId
            ? { ...app, userRating: app.userRating === ratingValue ? 0 : ratingValue }
            : app
        )
      )
      return
    }

    setRatingUpdatingId(applicationId)
    const newRating = ratingValue

    try {
      const { error } = await supabase.from('application_reviews').upsert(
        {
          application_id: applicationId,
          reviewer_id: session.user.id,
          rating: newRating,
          assessment: '',
        },
        { onConflict: 'application_id,reviewer_id' }
      )

      if (error) throw error

      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId ? { ...app, userRating: newRating } : app
        )
      )
    } catch (err) {
      console.error('Failed to update recruiter rating:', err)
    } finally {
      setRatingUpdatingId(null)
    }
  }

  // Download CV handler
  const handleDownloadCv = async (cvPath: string, candidateName: string) => {
    if (isUsingFixture) {
      alert(`[Figma Visual Fixture] In live mode, this downloads CV for ${candidateName} from Supabase storage.`)
      return
    }

    try {
      const { data, error } = await supabase.storage.from('cvs').createSignedUrl(cvPath, 60, {
        download: true,
      })

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      console.error('Failed to download CV from storage:', err)
      alert('Could not download CV file. Ensure Supabase storage bucket "cvs" is accessible.')
    }
  }

  // Format date to match Figma Jobs.png (e.g. '09 Feb 24')
  const formatAppliedDate = (dateString: string) => {
    try {
      const d = new Date(dateString)
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      }).format(d)
    } catch {
      return '09 Feb 24'
    }
  }

  // Render Status Badge Pill exactly matching Figma Jobs.png
  const renderStatusBadge = (stage: ApplicationStage | string) => {
    switch (stage) {
      case 'new':
      case 'screening':
        return (
          <span className="inline-flex items-center px-3 py-0.5 rounded-md text-xs font-medium bg-[#F3EBFD] text-[#5C00DD] border border-[#5C00DD]/20">
            New
          </span>
        )
      case 'interview':
        return (
          <span className="inline-flex items-center px-3 py-0.5 rounded-md text-xs font-medium bg-[#FFF7ED] text-[#C2410C] border border-[#FDBA74]/40">
            Interview
          </span>
        )
      case 'review':
        return (
          <span className="inline-flex items-center px-3 py-0.5 rounded-md text-xs font-medium bg-[#FDF2F8] text-[#BE185D] border border-[#F472B6]/40">
            Screening
          </span>
        )
      case 'hired':
      case 'offer':
        return (
          <span className="inline-flex items-center px-3 py-0.5 rounded-md text-xs font-medium bg-[#F0FDF4] text-[#15803D] border border-[#86EFAC]/50">
            Hired
          </span>
        )
      case 'rejected':
      default:
        return (
          <span className="inline-flex items-center px-3 py-0.5 rounded-md text-xs font-medium bg-[#FEF2F2] text-[#B91C1C] border border-[#FCA5A5]/40">
            Rejected
          </span>
        )
    }
  }

  return (
    <div className="p-8 max-w-[1360px] mx-auto flex flex-col gap-5">
      {/* Development Fixture Banner (Stripped in production) */}
      {!import.meta.env.PROD && isUsingFixture && (
        <div
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs"
        >
          <Info size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800">
              DEVELOPMENT VISUAL FIXTURE MODE — Isolated from production data
            </p>
            <p className="mt-0.5 text-amber-700">
              {backendError
                ? `Local Supabase returned: "${backendError}". Rendering Figma Jobs.png 10-row applicant fixture.`
                : 'Displaying approved Figma Jobs.png visual fixture (Philip Nwachukwu Mathew, Pristia Candra, etc.) for design verification (?fixture=true).'}
            </p>
          </div>
        </div>
      )}

      {/* 1. Breadcrumb / Back Link */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>
      </div>

      {/* 2. Page Title */}
      <div className="-mt-1">
        <h1 className="text-[24px] font-bold text-gray-900 tracking-tight">
          Applicants
        </h1>
      </div>

      {/* 3. Search and Filters Toolbar */}
      <div className="flex items-center gap-4 mt-1">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search"
            className="block w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] focus:border-transparent shadow-xs transition-colors placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterMenuOpen(prev => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 shadow-xs transition-colors cursor-pointer"
          >
            <SlidersHorizontal size={16} className="text-gray-500" />
            <span>Filters</span>
            {selectedStage !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-[#5C00DD]" />
            )}
          </button>

          {/* Filters Dropdown Panel */}
          {filterMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-modal border border-gray-100 p-2 z-30 animate-in fade-in">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                Filter by Stage
              </div>
              <div className="py-1">
                {[
                  { value: 'all', label: 'All Stages' },
                  { value: 'screening', label: 'Screening / New' },
                  { value: 'review', label: 'Review' },
                  { value: 'interview', label: 'Interview' },
                  { value: 'hired', label: 'Hired' },
                  { value: 'rejected', label: 'Rejected' },
                ].map(item => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setSelectedStage(item.value)
                      setFilterMenuOpen(false)
                      setCurrentPage(1)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                      selectedStage === item.value
                        ? 'bg-[#F3EBFD] text-[#5C00DD] font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{item.label}</span>
                    {selectedStage === item.value && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Table Container */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden mt-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            {/* Table Header */}
            <thead className="bg-[#F9FAFB]/70 border-b border-gray-100 text-[13px] font-semibold text-gray-700 select-none">
              <tr>
                <th className="w-12 px-6 py-4">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all applicants on page"
                    className="rounded border-gray-300 text-[#5C00DD] focus:ring-[#5C00DD] cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4">
                  <div className="inline-flex items-center gap-1.5 cursor-pointer">
                    <span>Applicant Name</span>
                    <ChevronDown size={14} className="text-gray-400" />
                  </div>
                </th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Applied on</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Resume</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                    <div className="w-7 h-7 rounded-full border-2 border-[#5C00DD] border-t-transparent animate-spin mx-auto mb-2" />
                    <p className="text-sm font-medium">Loading applicant roster...</p>
                  </td>
                </tr>
              ) : paginatedApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                    <p className="text-sm font-medium text-gray-600">No applicants found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search query or stage filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedApplications.map(row => {
                  const isChecked = selectedIds.has(row.id)
                  const currentRating = row.userRating || 0

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50/50 transition-colors ${
                        isChecked ? 'bg-[#F3EBFD]/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-6 py-4.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectRow(row.id)}
                          aria-label={`Select ${row.full_name}`}
                          className="rounded border-gray-300 text-[#5C00DD] focus:ring-[#5C00DD] cursor-pointer"
                        />
                      </td>

                      {/* Applicant Name */}
                      <td className="px-6 py-4.5 font-medium text-gray-900">
                        <Link
                          to={`/dashboard/candidates/${row.id}`}
                          className="hover:text-[#5C00DD] transition-colors"
                        >
                          {row.full_name}
                        </Link>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4.5 text-gray-600 font-normal">
                        {row.email}
                      </td>

                      {/* Applied On */}
                      <td className="px-6 py-4.5 text-gray-600 font-normal">
                        {formatAppliedDate(row.created_at)}
                      </td>

                      {/* Recruiter-Specific 5-Star Rating */}
                      <td className="px-6 py-4.5">
                        <div
                          className="inline-flex items-center gap-1"
                          title={`Your recruiter rating: ${currentRating} of 5 stars`}
                        >
                          {[1, 2, 3, 4, 5].map(starNum => {
                            const isFilled = starNum <= currentRating
                            return (
                              <button
                                key={starNum}
                                type="button"
                                onClick={() => void handleRate(row.id, starNum)}
                                disabled={ratingUpdatingId === row.id}
                                className="p-0.5 cursor-pointer text-amber-400 hover:scale-115 transition-transform"
                                aria-label={`Rate ${starNum} stars`}
                              >
                                <Star
                                  size={16}
                                  strokeWidth={1.5}
                                  className={
                                    isFilled
                                      ? 'fill-[#F59E0B] text-[#F59E0B]'
                                      : 'fill-[#E5E7EB] text-[#E5E7EB]'
                                  }
                                />
                              </button>
                            )
                          })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4.5">
                        {renderStatusBadge(row.stage)}
                      </td>

                      {/* Resume Download Action */}
                      <td className="px-6 py-4.5">
                        <button
                          type="button"
                          onClick={() => void handleDownloadCv(row.cv_path, row.full_name)}
                          className="text-[#5C00DD] font-medium hover:underline cursor-pointer transition-colors"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Bar matching Figma Jobs.png */}
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 bg-white">
          {/* Left: Pagination Controls */}
          <div className="flex items-center gap-1.5">
            {/* Prev button */}
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page number buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(0, 5)
              .map(page => (
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

            {totalPages > 5 && (
              <>
                <span className="px-1 text-xs text-gray-400">...</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-900 font-bold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}

            {/* Next button */}
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

          {/* Right: Entries Counter & Page Size Selector */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              Showing {totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, totalEntries)} of {totalEntries} entries
            </span>

            {/* Page size dropdown */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="pageSizeSelect" className="sr-only">
                Entries per page
              </label>
              <select
                id="pageSizeSelect"
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#5C00DD] cursor-pointer"
              >
                <option value={8}>Show 8</option>
                <option value={10}>Show 10</option>
                <option value={20}>Show 20</option>
                <option value={50}>Show 50</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
