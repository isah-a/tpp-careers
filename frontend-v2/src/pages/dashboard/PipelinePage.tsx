import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  CircleAlert,
  GitFork,
  Info,
  Loader2,
  Search,
  Star,
  User,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { initials, stageLabel } from '../../lib/recruitment'
import type { Application, ApplicationStage } from '../../types'

interface PipelineCandidate extends Application {
  myRating: number
}

interface StageColumnConfig {
  stage: ApplicationStage
  label: string
  badgeBg: string
  badgeText: string
  dotColor: string
  borderColor: string
  isTerminal?: boolean
}

// 6 Stages defined by public.application_stage enum.
// Progression: Screening -> Review -> Interview -> Offer -> Hired.
// Rejected is a separate terminal outcome.
const STAGE_COLUMNS: StageColumnConfig[] = [
  {
    stage: 'screening',
    label: 'Screening',
    badgeBg: 'bg-[#F3EBFD]',
    badgeText: 'text-[#5C00DD]',
    dotColor: 'bg-[#5C00DD]',
    borderColor: 'border-[#5C00DD]/20',
  },
  {
    stage: 'review',
    label: 'Review',
    badgeBg: 'bg-[#FDF2F8]',
    badgeText: 'text-[#BE185D]',
    dotColor: 'bg-[#BE185D]',
    borderColor: 'border-[#F472B6]/30',
  },
  {
    stage: 'interview',
    label: 'Interview',
    badgeBg: 'bg-[#FFF7ED]',
    badgeText: 'text-[#C2410C]',
    dotColor: 'bg-[#C2410C]',
    borderColor: 'border-[#FDBA74]/30',
  },
  {
    stage: 'offer',
    label: 'Offer',
    badgeBg: 'bg-[#ECFDF5]',
    badgeText: 'text-[#059669]',
    dotColor: 'bg-[#059669]',
    borderColor: 'border-[#6EE7B7]/40',
  },
  {
    stage: 'hired',
    label: 'Hired',
    badgeBg: 'bg-[#F0FDF4]',
    badgeText: 'text-[#15803D]',
    dotColor: 'bg-[#15803D]',
    borderColor: 'border-[#86EFAC]/40',
  },
  {
    stage: 'rejected',
    label: 'Rejected',
    badgeBg: 'bg-[#FEF2F2]',
    badgeText: 'text-[#B91C1C]',
    dotColor: 'bg-[#DC2626]',
    borderColor: 'border-[#FCA5A5]/40',
    isTerminal: true,
  },
]

// Visual Fixture data only loaded when explicitly requested in dev mode (?fixture=true)
const FIGMA_PIPELINE_FIXTURE: PipelineCandidate[] = [
  {
    id: 'figma-1',
    vacancy_id: 'v-1',
    full_name: 'Philip Nwachukwu Mathew',
    email: 'Philip@abc.io',
    phone: '+234 801 234 5678',
    created_at: '2024-02-09T10:00:00Z',
    cv_path: 'mock/philip-cv.pdf',
    stage: 'interview',
    answers: {},
    myRating: 4,
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
    myRating: 0,
    vacancies: { id: 'v-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
  },
  {
    id: 'figma-3',
    vacancy_id: 'v-2',
    full_name: 'Amara Okafor',
    email: 'amara@example.com',
    phone: '+234 803 456 7890',
    created_at: '2024-02-10T09:00:00Z',
    cv_path: 'mock/amara-cv.pdf',
    stage: 'review',
    answers: {},
    myRating: 5,
    vacancies: { id: 'v-2', title: 'Lead Product Designer', slug: 'lead-product-designer', department: 'Design', location: 'Lagos, Nigeria' },
  },
  {
    id: 'figma-4',
    vacancy_id: 'v-2',
    full_name: 'Tunde Bakare',
    email: 'tunde@bakare.me',
    phone: '+234 804 567 8901',
    created_at: '2024-02-11T14:00:00Z',
    cv_path: 'mock/tunde-cv.pdf',
    stage: 'offer',
    answers: {},
    myRating: 4,
    vacancies: { id: 'v-2', title: 'Lead Product Designer', slug: 'lead-product-designer', department: 'Design', location: 'Lagos, Nigeria' },
  },
  {
    id: 'figma-5',
    vacancy_id: 'v-1',
    full_name: 'Emeka Nwosu',
    email: 'emeka@nwosu.io',
    phone: '+234 805 678 9012',
    created_at: '2024-02-08T16:00:00Z',
    cv_path: 'mock/emeka-cv.pdf',
    stage: 'hired',
    answers: {},
    myRating: 5,
    vacancies: { id: 'v-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
  },
  {
    id: 'figma-6',
    vacancy_id: 'v-1',
    full_name: 'Kemi Adebayo',
    email: 'kemi@adebayo.org',
    phone: '+234 806 789 0123',
    created_at: '2024-02-07T12:00:00Z',
    cv_path: 'mock/kemi-cv.pdf',
    stage: 'rejected',
    answers: {},
    myRating: 2,
    vacancies: { id: 'v-1', title: 'Senior Project Manager', slug: 'senior-project-manager', department: 'Operations', location: 'Lagos, Nigeria' },
  },
]

export function PipelinePage() {
  const { session } = useAuth()
  const [searchParams] = useSearchParams()

  const isFixtureRequested =
    !import.meta.env.PROD && searchParams.get('fixture') === 'true'

  // Query & state
  const [candidates, setCandidates] = useState<PipelineCandidate[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedVacancy, setSelectedVacancy] = useState<string>('all')

  // Notification banners
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Tracking in-progress updates
  const [movingId, setMovingId] = useState<string | null>(null)
  const [ratingId, setRatingId] = useState<string | null>(null)

  // Load live pipeline candidates from Supabase
  useEffect(() => {
    if (isFixtureRequested) {
      setCandidates(FIGMA_PIPELINE_FIXTURE)
      setLoading(false)
      return
    }

    let isMounted = true

    async function loadPipeline() {
      setLoading(true)
      setBackendError(null)

      try {
        const { data, error } = await supabase
          .from('applications')
          .select('id, vacancy_id, full_name, email, phone, stage, stage_updated_at, created_at, vacancies(id, title, slug, department, location), application_reviews(reviewer_id, rating)')
          .order('stage_updated_at', { ascending: false })

        if (error) throw new Error(error.message)

        if (isMounted) {
          const mapped: PipelineCandidate[] = (data || []).map((app: any) => {
            const myReview = app.application_reviews?.find(
              (r: any) => r.reviewer_id === session?.user?.id
            )
            return {
              ...app,
              myRating: myReview ? myReview.rating : 0,
            }
          })

          setCandidates(mapped)
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Database error'
          console.error('[PipelinePage] Failed to load pipeline candidates:', msg)
          setBackendError(msg)
          // STRICT RULE: Never automatically fabricate candidates upon DB error!
          setCandidates([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadPipeline()

    return () => {
      isMounted = false
    }
  }, [isFixtureRequested, session?.user?.id])

  // Unique vacancies for filter dropdown
  const vacanciesList = useMemo(() => {
    const map = new Map<string, string>()
    candidates.forEach(c => {
      if (c.vacancies?.id && c.vacancies?.title) {
        map.set(c.vacancies.id, c.vacancies.title)
      }
    })
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }))
  }, [candidates])

  // Filter candidates based on search & vacancy filter
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        c.full_name.toLowerCase().includes(q) ||
        (c.vacancies?.title && c.vacancies.title.toLowerCase().includes(q)) ||
        c.email.toLowerCase().includes(q)

      const matchesVacancy =
        selectedVacancy === 'all' || c.vacancy_id === selectedVacancy

      return matchesSearch && matchesVacancy
    })
  }, [candidates, searchQuery, selectedVacancy])

  // Move candidate to a new stage using the transition_application_stage RPC
  const handleMove = async (applicationId: string, toStage: ApplicationStage) => {
    const targetApp = candidates.find(c => c.id === applicationId)
    if (!targetApp || targetApp.stage === toStage) return

    const fromStage = targetApp.stage

    if (isFixtureRequested) {
      setCandidates(prev =>
        prev.map(c => (c.id === applicationId ? { ...c, stage: toStage } : c))
      )
      setActionSuccess(`[Fixture] Moved ${targetApp.full_name} to ${stageLabel(toStage)}.`)
      setTimeout(() => setActionSuccess(null), 3000)
      return
    }

    setActionError(null)
    setMovingId(applicationId)

    try {
      const { error } = await supabase.rpc('transition_application_stage', {
        p_application_id: applicationId,
        p_to_stage: toStage,
        p_note: null,
      })

      if (error) throw error

      // Confirmed in DB: update UI
      setCandidates(prev =>
        prev.map(c =>
          c.id === applicationId
            ? { ...c, stage: toStage, stage_updated_at: new Date().toISOString() }
            : c
        )
      )
      setActionSuccess(`Moved ${targetApp.full_name} to ${stageLabel(toStage)}.`)
      setTimeout(() => setActionSuccess(null), 3500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database RPC failed'
      console.error('[PipelinePage] Stage transition error:', msg)
      // PRESERVE STAGE AND DISPLAY CLEAR USER-FACING ERROR
      setActionError(`Could not move ${targetApp.full_name} from ${stageLabel(fromStage)} to ${stageLabel(toStage)}: ${msg}`)
    } finally {
      setMovingId(null)
    }
  }

  // Recruiter rating handler
  const handleRate = async (applicationId: string, starValue: number) => {
    const targetApp = candidates.find(c => c.id === applicationId)
    if (!targetApp) return

    if (isFixtureRequested) {
      setCandidates(prev =>
        prev.map(c =>
          c.id === applicationId
            ? { ...c, myRating: c.myRating === starValue ? 0 : starValue }
            : c
        )
      )
      return
    }

    if (!session?.user?.id) {
      setActionError('You must be signed in as an authenticated recruiter to submit ratings.')
      return
    }

    setActionError(null)
    setRatingId(applicationId)

    try {
      if (targetApp.myRating === starValue) {
        // Clear rating
        const { error } = await supabase
          .from('application_reviews')
          .delete()
          .match({ application_id: applicationId, reviewer_id: session.user.id })

        if (error) throw error

        setCandidates(prev =>
          prev.map(c => (c.id === applicationId ? { ...c, myRating: 0 } : c))
        )
        setActionSuccess('Rating cleared.')
      } else {
        // Upsert rating
        const { error } = await supabase
          .from('application_reviews')
          .upsert(
            {
              application_id: applicationId,
              reviewer_id: session.user.id,
              rating: starValue,
              assessment: '',
            },
            { onConflict: 'application_id,reviewer_id' }
          )

        if (error) throw error

        setCandidates(prev =>
          prev.map(c => (c.id === applicationId ? { ...c, myRating: starValue } : c))
        )
        setActionSuccess(`Saved rating for ${targetApp.full_name}.`)
      }

      setTimeout(() => setActionSuccess(null), 2500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database error'
      console.error('[PipelinePage] Rating error:', msg)
      setActionError(`Could not save rating: ${msg}`)
    } finally {
      setRatingId(null)
    }
  }

  // Format date helper
  const formatDate = (dateString?: string): string => {
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
    <div className="p-8 max-w-[1600px] mx-auto flex flex-col gap-6">
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

      {/* Database Error Banner (When live fetch fails) */}
      {backendError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs"
        >
          <CircleAlert size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Database Connection Unavailable</p>
            <p className="mt-0.5 text-amber-800">
              Could not retrieve candidate pipeline from Supabase: <span className="font-mono">{backendError}</span>.
            </p>
            {!import.meta.env.PROD && (
              <p className="mt-1 text-amber-700">
                To preview the candidate pipeline board in development with sample data, append{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[#5C00DD]">?fixture=true</code> to the URL.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Development Fixture Banner */}
      {!import.meta.env.PROD && isFixtureRequested && (
        <div
          role="status"
          className="rounded-xl border border-purple-200 bg-purple-50/80 p-4 text-xs text-purple-900 flex items-start gap-3 shadow-xs"
        >
          <Info size={18} className="text-purple-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-purple-900">
              DEVELOPMENT FIXTURE MODE (?fixture=true)
            </p>
            <p className="mt-0.5 text-purple-800">
              Displaying sample applicant records across the 6 pipeline stages for visual verification.
            </p>
          </div>
          <Link
            to="/dashboard/pipeline"
            className="text-xs font-semibold text-[#5C00DD] underline hover:text-[#4900B0] self-center"
          >
            Switch to Live DB
          </Link>
        </div>
      )}

      {/* 1. Header & Title Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5C00DD] uppercase tracking-wider mb-1">
            <GitFork size={14} />
            <span>Recruitment Pipeline</span>
          </div>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">
            Candidate Pipeline
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Visual applicant progression across active hiring stages. Every stage transition is recorded.
          </p>
        </div>

        {/* Total Summary */}
        <div className="flex items-center gap-3 text-xs text-gray-600 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-xs">
          <span className="font-semibold text-gray-900">{candidates.length}</span> Total Applicants
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-emerald-700">{candidates.filter(c => c.stage === 'hired').length}</span> Hired
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-red-700">{candidates.filter(c => c.stage === 'rejected').length}</span> Rejected
        </div>
      </header>

      {/* 2. Controls & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="flex-1 relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search candidate, role, or email..."
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

        {/* Vacancy Filter Dropdown */}
        <div className="w-full sm:w-auto">
          <label htmlFor="vacancyFilter" className="sr-only">
            Filter by Vacancy
          </label>
          <select
            id="vacancyFilter"
            value={selectedVacancy}
            onChange={e => setSelectedVacancy(e.target.value)}
            className="w-full sm:w-auto bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5C00DD] shadow-xs cursor-pointer"
          >
            <option value="all">All Vacancies</option>
            {vacanciesList.map(v => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Stage Progression Legend */}
      <div className="hidden lg:flex items-center gap-2 text-[11px] font-semibold text-gray-400 px-1">
        <span>Progression Path:</span>
        <span className="text-[#5C00DD]">Screening</span>
        <span>→</span>
        <span className="text-[#BE185D]">Review</span>
        <span>→</span>
        <span className="text-[#C2410C]">Interview</span>
        <span>→</span>
        <span className="text-[#059669]">Offer</span>
        <span>→</span>
        <span className="text-[#15803D]">Hired</span>
        <span className="text-gray-300 mx-1">|</span>
        <span className="text-[#B91C1C]">Terminal Stage: Rejected</span>
      </div>

      {/* 4. Six-Stage Kanban Board */}
      <div className="overflow-x-auto pb-6">
        <div className="grid grid-flow-col auto-cols-[285px] gap-4 min-h-[580px]">
          {STAGE_COLUMNS.map(column => {
            const columnCandidates = filteredCandidates.filter(
              c => c.stage === column.stage
            )

            return (
              <section
                key={column.stage}
                className={`rounded-2xl flex flex-col p-3 transition-colors ${
                  column.isTerminal
                    ? 'bg-[#FEF2F2]/40 border border-red-200/60'
                    : 'bg-[#F9FAFB] border border-gray-200/70'
                }`}
                aria-label={`${column.label} stage, ${columnCandidates.length} candidates`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 px-1 border-b border-gray-200/50">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`} />
                    <h2 className="text-xs font-bold text-gray-800">
                      {column.label}
                    </h2>
                    {column.isTerminal && (
                      <span className="text-[10px] uppercase font-bold text-red-600 bg-red-100/80 px-1.5 py-0.2 rounded">
                        Terminal
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${column.badgeBg} ${column.badgeText} shadow-xs border ${column.borderColor}`}
                  >
                    {columnCandidates.length}
                  </span>
                </div>

                {/* Candidate Cards Stream */}
                <div className="mt-3 flex-1 flex flex-col gap-3">
                  {loading ? (
                    <div className="p-6 text-center text-gray-400">
                      <Loader2 size={18} className="animate-spin mx-auto mb-2 text-[#5C00DD]" />
                      <span className="text-xs">Loading...</span>
                    </div>
                  ) : columnCandidates.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200/80 bg-white/40 p-6 text-center text-xs text-gray-400 flex-1 flex flex-col items-center justify-center">
                      <User size={20} className="text-gray-300 mb-1.5" />
                      <p className="font-medium text-gray-500">No candidates</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Stage is currently empty.</p>
                    </div>
                  ) : (
                    columnCandidates.map(cand => {
                      const isMoving = movingId === cand.id
                      const isRating = ratingId === cand.id

                      return (
                        <article
                          key={cand.id}
                          className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-3.5 hover:shadow-md transition-all flex flex-col gap-2.5 select-none"
                        >
                          {/* Card Header: Candidate Name & Link to Profile */}
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to={`/dashboard/candidates/${cand.id}`}
                              className="font-bold text-sm text-gray-900 hover:text-[#5C00DD] transition-colors leading-snug line-clamp-1"
                              title={`Open profile for ${cand.full_name}`}
                            >
                              {cand.full_name}
                            </Link>

                            <span className="w-6 h-6 rounded-full bg-[#F3EBFD] text-[#5C00DD] font-semibold text-[10px] flex items-center justify-center shrink-0 border border-[#5C00DD]/20">
                              {initials(cand.full_name)}
                            </span>
                          </div>

                          {/* Associated Vacancy */}
                          {cand.vacancies?.title && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Briefcase size={12} className="text-gray-400 shrink-0" />
                              <span className="truncate" title={cand.vacancies.title}>
                                {cand.vacancies.title}
                              </span>
                            </div>
                          )}

                          {/* Applied Date */}
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                            <Calendar size={11} className="shrink-0" />
                            <span>Applied: {formatDate(cand.created_at)}</span>
                          </div>

                          {/* Recruiter-Specific Rating */}
                          <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
                            <span className="text-[11px] text-gray-400 font-medium">Rating</span>
                            <div
                              className="inline-flex items-center gap-0.5"
                              title={
                                cand.myRating > 0
                                  ? `Your rating: ${cand.myRating} / 5 stars`
                                  : 'Click star to rate candidate'
                              }
                            >
                              {[1, 2, 3, 4, 5].map(starNum => {
                                const isFilled = starNum <= cand.myRating
                                return (
                                  <button
                                    key={starNum}
                                    type="button"
                                    disabled={isRating}
                                    onClick={() => void handleRate(cand.id, starNum)}
                                    className="p-0.5 cursor-pointer text-amber-400 hover:scale-115 transition-transform disabled:opacity-50"
                                    aria-label={`Rate ${cand.full_name} ${starNum} stars`}
                                  >
                                    <Star
                                      size={14}
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
                          </div>

                          {/* Move Stage Selector */}
                          <div className="border-t border-gray-100 pt-2 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-gray-500">
                              Move to:
                            </span>

                            <div className="relative">
                              <select
                                disabled={isMoving}
                                value={cand.stage}
                                onChange={e =>
                                  void handleMove(cand.id, e.target.value as ApplicationStage)
                                }
                                aria-label={`Move ${cand.full_name} to another stage`}
                                className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#5C00DD] cursor-pointer disabled:opacity-50 transition-colors"
                              >
                                {STAGE_COLUMNS.map(s => (
                                  <option key={s.stage} value={s.stage}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>

                              {isMoving && (
                                <div className="absolute inset-0 bg-white/70 rounded-lg flex items-center justify-center">
                                  <Loader2 size={12} className="animate-spin text-[#5C00DD]" />
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      )
                    })
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
