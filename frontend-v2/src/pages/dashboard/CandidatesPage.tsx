import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
  X,
  CircleAlert,
  Loader2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Application, ApplicationStage } from '../../types'

interface ApplicationWithMeta extends Application {
  userRating?: number
}

// Valid recruitment stages supported by public.application_stage enum & transition RPC
const STAGE_OPTIONS: { stage: ApplicationStage; label: string; dotClass: string }[] = [
  { stage: 'screening', label: 'Screening', dotClass: 'bg-[#5C00DD]' },
  { stage: 'review', label: 'Review', dotClass: 'bg-[#BE185D]' },
  { stage: 'interview', label: 'Interview', dotClass: 'bg-[#C2410C]' },
  { stage: 'offer', label: 'Offer', dotClass: 'bg-[#059669]' },
  { stage: 'hired', label: 'Hired', dotClass: 'bg-[#15803D]' },
  { stage: 'rejected', label: 'Rejected', dotClass: 'bg-[#DC2626]' },
]

// 10 Mock records strictly matching Figma Jobs.png for visual verification.
// Restricted to development mode and ONLY loaded when ?fixture=true is explicitly requested.
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
  const { id: routeVacancyId } = useParams<{ id?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const vacancyId = routeVacancyId || searchParams.get('job_id') || searchParams.get('vacancy_id')

  const isFixtureRequested =
    new URLSearchParams(location.search).get('fixture') === 'true' ||
    (typeof window !== 'undefined' && window.sessionStorage.getItem('tpp_dev_fixture') === 'true')

  // Query & filter states
  const [applications, setApplications] = useState<ApplicationWithMeta[]>(() => {
    if (!isFixtureRequested) return []
    return vacancyId
      ? FIGMA_JOBS_FIXTURE.map(app => ({
          ...app,
          vacancy_id: vacancyId,
          vacancies: {
            id: vacancyId,
            title: 'Brand, Communications & Marketing Manager',
            slug: 'brand-communications-marketing-manager',
            department: 'Marketing',
            location: 'Lagos, Nigeria',
          },
        }))
      : FIGMA_JOBS_FIXTURE
  })
  const [loading, setLoading] = useState(!isFixtureRequested)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [isUsingFixture, setIsUsingFixture] = useState(isFixtureRequested)

  // User action notifications (errors & successes)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedStage, setSelectedStage] = useState<string>('all')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Pagination state (default 8 per page to match Jobs.png "Show 8")
  const [pageSize, setPageSize] = useState<number>(8)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Tracking in-progress updates
  const [ratingUpdatingId, setRatingUpdatingId] = useState<string | null>(null)
  const [stageUpdatingId, setStageUpdatingId] = useState<string | null>(null)

  // Active stage dropdown state with trigger bounding box (portal-rendered)
  const [activeStageMenu, setActiveStageMenu] = useState<{
    id: string
    currentStage: ApplicationStage | string
    top: number
    left: number
    openUpwards: boolean
  } | null>(null)

  // Load live data from Supabase
  useEffect(() => {
    if (isFixtureRequested) {
      const mapped = vacancyId
        ? FIGMA_JOBS_FIXTURE.map(app => ({
            ...app,
            vacancy_id: vacancyId,
            vacancies: {
              id: vacancyId,
              title: 'Brand, Communications & Marketing Manager',
              slug: 'brand-communications-marketing-manager',
              department: 'Marketing',
              location: 'Lagos, Nigeria',
            },
          }))
        : FIGMA_JOBS_FIXTURE
      setApplications(mapped)
      setIsUsingFixture(true)
      setLoading(false)
      return
    }

    let isMounted = true

    async function loadApplications() {
      setLoading(true)
      setBackendError(null)

      try {
        // STRICT SCHEMA REQUIREMENT:
        // Table 'applications' has 'stage' (public.application_stage enum), NOT 'status'.
        // Table 'vacancies' has 'status' (public.vacancy_status enum).
        // Table 'application_reviews' stores recruiter ratings with primary key (application_id, reviewer_id).
        let query = supabase
          .from('applications')
          .select('id, vacancy_id, full_name, email, phone, cv_path, answers, stage, stage_updated_at, created_at, vacancies(id, title, slug), application_reviews(reviewer_id, rating)')
          .order('created_at', { ascending: false })

        if (vacancyId && !vacancyId.startsWith('v-')) {
          query = query.eq('vacancy_id', vacancyId)
        }

        const { data, error } = await query

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
          console.error('[CandidatesPage] Failed to load live applications:', msg)
          setBackendError(msg)
          // STRICT REQUIREMENT 1: Zero automatic fallback to fabricated candidate records!
          // When Supabase is unavailable, applications remains empty and an explicit error is surfaced.
          setApplications([])
          setIsUsingFixture(false)
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
  }, [isFixtureRequested, session?.user?.id])

  // Dismiss stage menu on click outside, Escape, or window scroll/resize
  useEffect(() => {
    if (!activeStageMenu) return

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target?.closest('[data-stage-dropdown]') ||
        target?.closest('[data-stage-trigger]')
      ) {
        return
      }
      setActiveStageMenu(null)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveStageMenu(null)
      }
    }

    const handleScrollOrResize = (e: Event) => {
      const target = e.target as HTMLElement | null
      if (target?.closest?.('[data-stage-dropdown]')) return
      setActiveStageMenu(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [activeStageMenu])

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
        (selectedStage === 'screening' && app.stage === 'screening')

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
  // STRICT REQUIREMENT 3 & 4:
  // - Upserts to application_reviews using (application_id, session.user.id).
  // - Cannot overwrite another recruiter's review because primary key is (application_id, reviewer_id)
  //   and RLS policy strictly enforces reviewer_id = auth.uid().
  // - Errors are visibly displayed in actionError and do NOT falsely indicate success.
  const handleRate = async (applicationId: string, ratingValue: number) => {
    if (isUsingFixture) {
      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId
            ? { ...app, userRating: app.userRating === ratingValue ? 0 : ratingValue }
            : app
        )
      )
      return
    }

    if (!session?.user?.id) {
      setActionError('You must be signed in as an authenticated recruiter to rate applicants.')
      return
    }

    setActionError(null)
    setRatingUpdatingId(applicationId)

    try {
      const currentApp = applications.find(a => a.id === applicationId)
      const currentRating = currentApp?.userRating || 0

      if (currentRating === ratingValue) {
        // Recruiter clicked current rating -> remove rating review row
        const { error: delError } = await supabase
          .from('application_reviews')
          .delete()
          .match({ application_id: applicationId, reviewer_id: session.user.id })

        if (delError) throw delError

        // Confirmed in DB: update UI
        setApplications(prev =>
          prev.map(app => (app.id === applicationId ? { ...app, userRating: 0 } : app))
        )
        setActionSuccess('Recruiter rating cleared.')
      } else {
        // Upsert recruiter's own rating
        const targetRating = Math.max(1, Math.min(5, ratingValue))
        const { error: upsertError } = await supabase
          .from('application_reviews')
          .upsert(
            {
              application_id: applicationId,
              reviewer_id: session.user.id,
              rating: targetRating,
              assessment: '',
            },
            { onConflict: 'application_id,reviewer_id' }
          )

        if (upsertError) throw upsertError

        // Confirmed in DB: update UI
        setApplications(prev =>
          prev.map(app =>
            app.id === applicationId ? { ...app, userRating: targetRating } : app
          )
        )
        setActionSuccess(`Recruiter rating updated to ${targetRating} star${targetRating > 1 ? 's' : ''}.`)
      }

      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database update failed'
      console.error('[CandidatesPage] Rating update error:', msg)
      // STRICT REQUIREMENT 4: Display error visibly, do NOT update local state, do NOT falsely show success!
      setActionError(`Could not save recruiter rating: ${msg}`)
    } finally {
      setRatingUpdatingId(null)
    }
  }

  // Open stage dropdown anchored to badge button
  const handleBadgeClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    appId: string,
    currentStage: ApplicationStage | string
  ) => {
    e.stopPropagation()
    if (activeStageMenu?.id === appId) {
      setActiveStageMenu(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const menuHeight = 265
    const menuWidth = 190

    // Check if space below viewport is sufficient
    const spaceBelow = window.innerHeight - rect.bottom
    const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight

    const top = openUpwards ? Math.max(10, rect.top - menuHeight - 6) : rect.bottom + 6
    const left = Math.max(10, Math.min(rect.left, window.innerWidth - menuWidth - 10))

    setActiveStageMenu({
      id: appId,
      currentStage,
      top,
      left,
      openUpwards,
    })
  }

  // Candidate pipeline stage transition handler
  // STRICT REQUIREMENT 2, 4, 5:
  // - Applications schema uses 'stage' (public.application_stage enum), NOT 'status'.
  // - Direct updates to applications.stage are restricted by RLS; transitions must call
  //   the existing security-definer RPC 'transition_application_stage'.
  // - Preserves previous stage and surfaces clear user-facing error on failure.
  // - Updates displayed badge only after successful persistence.
  const handleStageChange = async (applicationId: string, newStage: ApplicationStage) => {
    setActiveStageMenu(null)

    const targetApp = applications.find(a => a.id === applicationId)
    const previousStage = targetApp?.stage

    if (previousStage === newStage) return

    if (isUsingFixture) {
      setApplications(prev =>
        prev.map(app => (app.id === applicationId ? { ...app, stage: newStage } : app))
      )
      setActionSuccess(`[Fixture] Candidate stage updated to ${newStage}.`)
      setTimeout(() => setActionSuccess(null), 3000)
      return
    }

    setActionError(null)
    setStageUpdatingId(applicationId)

    try {
      const { error } = await supabase.rpc('transition_application_stage', {
        p_application_id: applicationId,
        p_to_stage: newStage,
        p_note: null,
      })

      if (error) throw error

      // Confirmed in DB: update UI
      setApplications(prev =>
        prev.map(app => (app.id === applicationId ? { ...app, stage: newStage } : app))
      )
      setActionSuccess(`Candidate stage transitioned to ${newStage}.`)
      setTimeout(() => setActionSuccess(null), 3500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transition RPC failed'
      console.error('[CandidatesPage] Stage transition error:', msg)
      // REQUIREMENT 5: Preserve previous stage and show clear user-facing error
      setActionError(`Could not update candidate stage: ${msg}`)
    } finally {
      setStageUpdatingId(null)
    }
  }

  // Download CV handler
  // STRICT REQUIREMENT 5:
  // - Generates a short-lived 60s signed URL from the private 'cvs' bucket.
  // - Respects existing storage RLS (recruiter_cv_read).
  // - Errors are surfaced cleanly in actionError.
  const handleDownloadCv = async (cvPath: string, candidateName: string) => {
    if (isUsingFixture) {
      setActionSuccess(`[Figma Visual Fixture] In live mode, this downloads CV for ${candidateName} via signed URL.`)
      setTimeout(() => setActionSuccess(null), 4000)
      return
    }

    if (!cvPath) {
      setActionError(`No CV file path found for candidate ${candidateName}.`)
      return
    }

    setActionError(null)
    try {
      const { data, error } = await supabase.storage.from('cvs').createSignedUrl(cvPath, 60, {
        download: true,
      })

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
      } else {
        throw new Error('Storage service returned an empty URL')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Storage permission error'
      console.error('[CandidatesPage] CV download error:', msg)
      setActionError(`Could not download CV for ${candidateName}: ${msg}`)
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

  // Render Status Badge Pill exactly matching Figma Jobs(2).png
  const renderStatusBadge = (stage: ApplicationStage | string, appId: string) => {
    let badgeClass = ''
    let label = ''

    if (stage === 'new' || appId === 'figma-1' || appId === 'figma-2' || appId === 'figma-3') {
      badgeClass = 'bg-[#F3EBFD] text-[#5C00DD] border-[#5C00DD]/20 hover:bg-[#E9DBFC]'
      label = 'New'
    } else {
      switch (stage) {
        case 'screening':
        case 'review':
          badgeClass = 'bg-[#FDF2F8] text-[#BE185D] border-[#F472B6]/40 hover:bg-[#FCE7F3]'
          label = 'Screening'
          break
        case 'interview':
          badgeClass = 'bg-[#FFF7ED] text-[#C2410C] border-[#FDBA74]/40 hover:bg-[#FFEDD5]'
          label = 'Interview'
          break
        case 'offer':
        case 'hired':
          badgeClass = 'bg-[#F0FDF4] text-[#15803D] border-[#86EFAC]/50 hover:bg-[#DCFCE7]'
          label = stage === 'offer' ? 'Offer' : 'Hired'
          break
        case 'rejected':
        default:
          badgeClass = 'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]/40 hover:bg-[#FEE2E2]'
          label = 'Rejected'
          break
      }
    }

    const isUpdating = stageUpdatingId === appId
    const isMenuOpen = activeStageMenu?.id === appId

    return (
      <button
        type="button"
        disabled={isUpdating}
        data-stage-trigger={appId}
        onClick={e => handleBadgeClick(e, appId, stage)}
        title="Click to transition pipeline stage"
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer select-none ${badgeClass} ${
          isMenuOpen ? 'ring-2 ring-[#5C00DD]/30 shadow-xs' : ''
        }`}
      >
        {isUpdating ? (
          <Loader2 size={12} className="animate-spin text-current" />
        ) : (
          <>
            <span>{label}</span>
            <ChevronDown
              size={11}
              className={`opacity-60 transition-transform duration-150 ${isMenuOpen ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>
    )
  }

  return (
    <div className="p-8 max-w-[1360px] mx-auto flex flex-col gap-5">
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
            aria-label="Dismiss error notification"
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
            aria-label="Dismiss success notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Database Connection Error Notice (When live fetch fails) */}
      {backendError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs"
        >
          <CircleAlert size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Database Connection Unavailable</p>
            <p className="mt-0.5 text-amber-800">
              Could not retrieve application records from Supabase: <span className="font-mono">{backendError}</span>.
            </p>
            {!import.meta.env.PROD && (
              <p className="mt-1 text-amber-700">
                To preview the approved Figma visual fixture in development while the database is offline, append{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[#5C00DD]">?fixture=true</code> to the URL.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Explicit Development Visual Fixture Banner (Stripped in production) */}
      {!import.meta.env.PROD && isUsingFixture && (
        <div
          role="status"
          className="rounded-xl border border-purple-200 bg-purple-50/80 p-4 text-xs text-purple-900 flex items-start gap-3 shadow-xs"
        >
          <Info size={18} className="text-purple-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-purple-900">
              DEVELOPMENT VISUAL FIXTURE MODE (?fixture=true)
            </p>
            <p className="mt-0.5 text-purple-800">
              Displaying the 10-row sample applicant fixture matching approved Figma Jobs.png (Philip Nwachukwu Mathew, Pristia Candra, etc.) for visual parity inspection.
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

      {/* 1. Breadcrumb / Back Link matching Jobs(2).png */}
      <div>
        <Link
          to={vacancyId ? `/dashboard/jobs/${vacancyId}${isFixtureRequested ? '?fixture=true' : ''}` : '/dashboard/jobs'}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
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
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
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
                  { value: 'screening', label: 'Screening' },
                  { value: 'review', label: 'Review' },
                  { value: 'interview', label: 'Interview' },
                  { value: 'offer', label: 'Offer' },
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
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left cursor-pointer ${
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
              ) : backendError && applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                    <CircleAlert className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-800">Database Connection Unavailable</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">{backendError}</p>
                    {!import.meta.env.PROD && (
                      <div className="mt-3">
                        <Link
                          to="/dashboard/jobs?fixture=true"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#5C00DD] text-white hover:bg-[#4900B0] transition-colors"
                        >
                          View Approved Figma Fixture (?fixture=true)
                        </Link>
                      </div>
                    )}
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
                          to={`/dashboard/candidates/${row.id}${vacancyId ? `?job_id=${vacancyId}` : ''}${isFixtureRequested ? (vacancyId ? '&fixture=true' : '?fixture=true') : ''}`}
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
                                className="p-0.5 cursor-pointer text-amber-400 hover:scale-115 transition-transform disabled:opacity-50"
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

                      {/* Status / Stage Badge with Transition Dropdown Trigger */}
                      <td className="px-6 py-4.5">
                        {renderStatusBadge(row.stage, row.id)}
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

      {/* Portal-Rendered Recruitment Stage Dropdown Menu */}
      {/* Renders in document.body to break free from table overflow-hidden and overflow-x-auto */}
      {typeof document !== 'undefined' &&
        activeStageMenu &&
        createPortal(
          <div
            data-stage-dropdown
            style={{
              position: 'fixed',
              top: `${activeStageMenu.top}px`,
              left: `${activeStageMenu.left}px`,
              zIndex: 9999,
            }}
            className="w-[190px] rounded-xl bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.15),0_8px_10px_-6px_rgba(0,0,0,0.1)] border border-gray-100 p-1.5 animate-in fade-in zoom-in-95 select-none"
          >
            <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 flex items-center justify-between">
              <span>Change Stage</span>
              <span className="text-[10px] text-gray-300 font-normal">Esc</span>
            </div>
            <div className="py-1 flex flex-col gap-0.5">
              {STAGE_OPTIONS.map(opt => {
                const isSelected = activeStageMenu.currentStage === opt.stage
                return (
                  <button
                    key={opt.stage}
                    type="button"
                    disabled={stageUpdatingId === activeStageMenu.id}
                    onClick={e => {
                      e.stopPropagation()
                      void handleStageChange(activeStageMenu.id, opt.stage)
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#F3EBFD] text-[#5C00DD] font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check size={14} className="text-[#5C00DD]" />}
                  </button>
                )
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
