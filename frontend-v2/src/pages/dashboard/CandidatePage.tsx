import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Maximize2,
  Send,
  Star,
  Check,
  CircleAlert,
  Info,
  X,
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  ExternalLink,
  Plus,
  History,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ScheduleInterviewModal } from '../../components/dashboard/ScheduleInterviewModal'
import { CancelInterviewModal } from '../../components/dashboard/CancelInterviewModal'
import type { Application, ApplicationNote, ApplicationReview, ApplicationStage, ScreeningQuestion, Interview, InterviewHistory } from '../../types'

interface CandidateDetail extends Omit<Application, 'vacancies'> {
  vacancies?: {
    id: string
    title: string
    slug: string
    department?: string
    location?: string
    employment_type?: string
  }
}

// 6 Valid stages supported by public.application_stage enum
const STAGE_OPTIONS: { stage: ApplicationStage; label: string; dotClass: string }[] = [
  { stage: 'screening', label: 'Screening', dotClass: 'bg-[#5C00DD]' },
  { stage: 'review', label: 'Review', dotClass: 'bg-[#BE185D]' },
  { stage: 'interview', label: 'Interviewing', dotClass: 'bg-[#C2410C]' },
  { stage: 'offer', label: 'Offer', dotClass: 'bg-[#059669]' },
  { stage: 'hired', label: 'Hired', dotClass: 'bg-[#15803D]' },
  { stage: 'rejected', label: 'Rejected', dotClass: 'bg-[#DC2626]' },
]

// Visual Fixture matching Jobs-4.png and Jobs-5.png for design parity inspection in dev mode
const FIGMA_CANDIDATE_FIXTURE: CandidateDetail = {
  id: 'figma-1',
  vacancy_id: 'v-1',
  full_name: 'Philip Nwachukwu Matthew',
  email: 'Philip@abc.io',
  phone: '+234 801 234 5678',
  created_at: '2024-02-09T10:00:00Z',
  cv_path: 'mock/philip-cv.pdf',
  stage: 'interview',
  answers: {
    gender: 'Male',
    location: 'Lagos Nigeria',
    linkedin: 'linkedin.com/in/philip',
    experience_level: 'Senior - 6 Years',
    notice_period: '3 Month',
    expected_salary: '900,000',
  },
  vacancies: {
    id: 'v-1',
    title: 'Senior Project Manager',
    slug: 'senior-project-manager',
    department: 'Operations',
    location: 'Lagos Nigeria',
    employment_type: 'Full-time',
  },
}

const FIGMA_NOTES_FIXTURE: ApplicationNote[] = [
  {
    id: 'fn-1',
    application_id: 'figma-1',
    author_id: 'recruiter-1',
    body: 'Strong candidate with relevant experience in investment management. Showed good communication in the first interview. Recommended for technical round with the Head of Finance.',
    created_at: '2024-02-09T16:00:00Z',
    updated_at: '2024-02-09T16:00:00Z',
    recruiter: { user_id: 'recruiter-1', display_name: 'Oluwatimilehin Adegboyega' },
  },
  {
    id: 'fn-2',
    application_id: 'figma-1',
    author_id: 'recruiter-1',
    body: 'CV looks solid, CFA Level II in progress is a good signal. Salary expectation slightly above band but worth discussing.',
    created_at: '2024-02-09T16:00:00Z',
    updated_at: '2024-02-09T16:00:00Z',
    recruiter: { user_id: 'recruiter-1', display_name: 'Oluwatimilehin Adegboyega' },
  },
]

export function CandidatePage() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const isFixtureRequested =
    searchParams.get('fixture') === 'true' ||
    Boolean(applicationId?.startsWith('figma-')) ||
    (typeof window !== 'undefined' && window.sessionStorage.getItem('tpp_dev_fixture') === 'true')

  // State
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null)
  const [reviews, setReviews] = useState<ApplicationReview[]>([])
  const [notes, setNotes] = useState<ApplicationNote[]>([])
  const [screeningQuestions, setScreeningQuestions] = useState<ScreeningQuestion[]>([])
  const [siblingIds, setSiblingIds] = useState<string[]>([])

  // Recruiter rating state
  const [myRating, setMyRating] = useState<number>(0)
  const [ratingUpdating, setRatingUpdating] = useState<boolean>(false)

  // Stage state
  const [stageUpdating, setStageUpdating] = useState<boolean>(false)
  const [stageMenuOpen, setStageMenuOpen] = useState<boolean>(false)

  // CV signed URL
  const [cvSignedUrl, setCvSignedUrl] = useState<string | null>(null)
  const [cvLoading, setCvLoading] = useState<boolean>(false)

  // Tab navigation: 'profile' | 'qa' | 'notes' | 'interviews'
  const [activeTab, setActiveTab] = useState<'profile' | 'qa' | 'notes' | 'interviews'>('profile')

  // Interview scheduling state
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loadingInterviews, setLoadingInterviews] = useState<boolean>(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false)
  const [selectedInterviewForReschedule, setSelectedInterviewForReschedule] = useState<Interview | null>(null)
  const [selectedInterviewForCancel, setSelectedInterviewForCancel] = useState<Interview | null>(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

  // Note composition state
  const [newNoteBody, setNewNoteBody] = useState<string>('')
  const [submittingNote, setSubmittingNote] = useState<boolean>(false)

  // Loading & notification states
  const [loading, setLoading] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const loadCandidateInterviews = useCallback(async (appId: string) => {
    setLoadingInterviews(true)
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          id,
          application_id,
          scheduled_at,
          duration_minutes,
          timezone,
          format,
          location_or_link,
          notes,
          status,
          cancellation_reason,
          created_by,
          updated_by,
          created_at,
          updated_at,
          interview_history (
            id,
            interview_id,
            action,
            scheduled_at,
            duration_minutes,
            timezone,
            format,
            location_or_link,
            notes,
            status,
            cancellation_reason,
            changed_by,
            changed_at,
            recruiter:recruiters!changed_by (
              display_name
            )
          )
        `)
        .eq('application_id', appId)
        .order('scheduled_at', { ascending: false })

      if (!error && data) {
        setInterviews(data as unknown as Interview[])
      }
    } catch (err) {
      console.warn('[CandidatePage] Load candidate interviews error:', err)
    } finally {
      setLoadingInterviews(false)
    }
  }, [])

  // Load candidate details, sibling IDs, reviews, notes, and screening questions
  useEffect(() => {
    if (!applicationId) return

    if (isFixtureRequested && applicationId.startsWith('figma-')) {
      setCandidate(FIGMA_CANDIDATE_FIXTURE)
      setNotes(FIGMA_NOTES_FIXTURE)
      setMyRating(4)
      setSiblingIds(['figma-1', 'figma-2', 'figma-3'])
      setLoading(false)
      return
    }

    let isMounted = true

    async function loadCandidate() {
      setLoading(true)
      setLoadError(null)
      setActionError(null)

      try {
        // Query candidate record with joined vacancy
        const { data: appData, error: appError } = await supabase
          .from('applications')
          .select('id, vacancy_id, full_name, email, phone, cv_path, answers, stage, stage_updated_at, created_at, vacancies(id, title, slug, department, location, employment_type)')
          .eq('id', applicationId)
          .single()

        if (appError) throw new Error(appError.message)
        if (!appData) throw new Error('Candidate not found')

        if (!isMounted) return

        const typedCandidate = appData as unknown as CandidateDetail
        setCandidate(typedCandidate)

        // Query interviews
        if (applicationId) {
          void loadCandidateInterviews(applicationId)
        }

        // Query reviews for this application
        const { data: revData } = await supabase
          .from('application_reviews')
          .select('application_id, reviewer_id, rating, assessment, created_at, updated_at, recruiter:recruiters!reviewer_id(user_id, display_name)')
          .eq('application_id', applicationId)

        if (isMounted && revData) {
          setReviews(revData as unknown as ApplicationReview[])
          const mine = revData.find((r: any) => r.reviewer_id === session?.user?.id)
          setMyRating(mine ? mine.rating : 0)
        }

        // Query notes for this application (ordered chronologically)
        const { data: notesData } = await supabase
          .from('application_notes')
          .select('id, application_id, author_id, body, created_at, updated_at, recruiter:recruiters!author_id(user_id, display_name)')
          .eq('application_id', applicationId)
          .order('created_at', { ascending: false })

        if (isMounted && notesData) {
          setNotes(notesData as unknown as ApplicationNote[])
        }

        // Query screening questions for the vacancy
        if (typedCandidate.vacancy_id) {
          const { data: qData } = await supabase
            .from('screening_questions')
            .select('id, vacancy_id, label, type, required, options, sort_order')
            .eq('vacancy_id', typedCandidate.vacancy_id)
            .order('sort_order', { ascending: true })

          if (isMounted && qData) {
            setScreeningQuestions(qData as ScreeningQuestion[])
          }
        }

        // Query sibling application IDs for Prev / Next navigation
        const { data: siblings } = await supabase
          .from('applications')
          .select('id')
          .order('created_at', { ascending: false })

        if (isMounted && siblings) {
          setSiblingIds(siblings.map(s => s.id))
        }

        // Generate signed URL for CV preview
        if (typedCandidate.cv_path) {
          setCvLoading(true)
          const { data: storageData, error: storageErr } = await supabase.storage
            .from('cvs')
            .createSignedUrl(typedCandidate.cv_path, 3600)

          if (isMounted) {
            setCvLoading(false)
            if (!storageErr && storageData?.signedUrl) {
              setCvSignedUrl(storageData.signedUrl)
            }
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to load candidate record'
          console.error('[CandidatePage] Load error:', msg)
          setLoadError(msg)
          setCandidate(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadCandidate()

    return () => {
      isMounted = false
    }
  }, [applicationId, session?.user?.id, isFixtureRequested])

  // Prev / Next Candidate IDs
  const currentIndex = siblingIds.indexOf(applicationId || '')
  const prevCandidateId = currentIndex > 0 ? siblingIds[currentIndex - 1] : null
  const nextCandidateId =
    currentIndex >= 0 && currentIndex < siblingIds.length - 1
      ? siblingIds[currentIndex + 1]
      : null

  // Recruiter rating handler
  const handleRate = async (starValue: number) => {
    if (!candidate) return

    if (isFixtureRequested) {
      setMyRating(prev => (prev === starValue ? 0 : starValue))
      setActionSuccess('Recruiter rating updated.')
      setTimeout(() => setActionSuccess(null), 3000)
      return
    }

    if (!session?.user?.id) {
      setActionError('You must be signed in as an authenticated recruiter to rate applicants.')
      return
    }

    setActionError(null)
    setRatingUpdating(true)

    try {
      if (myRating === starValue) {
        // Clear rating
        const { error } = await supabase
          .from('application_reviews')
          .delete()
          .match({ application_id: candidate.id, reviewer_id: session.user.id })

        if (error) throw error

        setMyRating(0)
        setActionSuccess('Recruiter rating cleared.')
      } else {
        // Upsert rating
        const { error } = await supabase
          .from('application_reviews')
          .upsert(
            {
              application_id: candidate.id,
              reviewer_id: session.user.id,
              rating: starValue,
              assessment: '',
            },
            { onConflict: 'application_id,reviewer_id' }
          )

        if (error) throw error

        setMyRating(starValue)
        setActionSuccess(`Recruiter rating updated to ${starValue} star${starValue > 1 ? 's' : ''}.`)
      }

      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database error'
      console.error('[CandidatePage] Rating error:', msg)
      setActionError(`Could not save rating: ${msg}`)
    } finally {
      setRatingUpdating(false)
    }
  }

  // Candidate stage transition handler
  const handleStageChange = async (newStage: ApplicationStage) => {
    if (!candidate || candidate.stage === newStage) {
      setStageMenuOpen(false)
      return
    }

    setStageMenuOpen(false)

    if (isFixtureRequested) {
      setCandidate(prev => (prev ? { ...prev, stage: newStage } : null))
      setActionSuccess(`[Fixture] Stage transitioned to ${newStage}.`)
      setTimeout(() => setActionSuccess(null), 3000)
      return
    }

    setActionError(null)
    setStageUpdating(true)

    try {
      const { error } = await supabase.rpc('transition_application_stage', {
        p_application_id: candidate.id,
        p_to_stage: newStage,
        p_note: null,
      })

      if (error) throw error

      setCandidate(prev => (prev ? { ...prev, stage: newStage } : null))
      setActionSuccess(`Candidate transitioned to ${newStage}.`)
      setTimeout(() => setActionSuccess(null), 3500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transition RPC failed'
      console.error('[CandidatePage] Stage change error:', msg)
      setActionError(`Could not update candidate stage: ${msg}`)
    } finally {
      setStageUpdating(false)
    }
  }

  // Add note handler
  const handleAddNote = async () => {
    if (!candidate || !newNoteBody.trim()) return

    if (isFixtureRequested) {
      const newFixtureNote: ApplicationNote = {
        id: `fn-${Date.now()}`,
        application_id: candidate.id,
        author_id: session?.user?.id || 'mock-recruiter',
        body: newNoteBody.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        recruiter: {
          user_id: session?.user?.id || 'mock-recruiter',
          display_name: 'You (Recruiter)',
        },
      }
      setNotes(prev => [newFixtureNote, ...prev])
      setNewNoteBody('')
      setActionSuccess('Note added successfully.')
      setTimeout(() => setActionSuccess(null), 3000)
      return
    }

    if (!session?.user?.id) {
      setActionError('You must be signed in as a recruiter to post internal notes.')
      return
    }

    setActionError(null)
    setSubmittingNote(true)

    try {
      const { data, error } = await supabase
        .from('application_notes')
        .insert({
          application_id: candidate.id,
          author_id: session.user.id,
          body: newNoteBody.trim(),
        })
        .select('id, application_id, author_id, body, created_at, updated_at, recruiter:recruiters!author_id(user_id, display_name)')
        .single()

      if (error) throw error

      if (data) {
        setNotes(prev => [data as unknown as ApplicationNote, ...prev])
      }
      setNewNoteBody('')
      setActionSuccess('Internal note added.')
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database error'
      console.error('[CandidatePage] Add note error:', msg)
      setActionError(`Could not save internal note: ${msg}`)
    } finally {
      setSubmittingNote(false)
    }
  }

  // CV Download action
  const handleDownloadCv = async () => {
    if (!candidate?.cv_path) return

    if (isFixtureRequested) {
      setActionSuccess('[Fixture] CV download requested.')
      setTimeout(() => setActionSuccess(null), 3000)
      return
    }

    try {
      const { data, error } = await supabase.storage.from('cvs').createSignedUrl(candidate.cv_path, 60, {
        download: true,
      })

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Storage permission error'
      console.error('[CandidatePage] CV download error:', msg)
      setActionError(`Could not download CV: ${msg}`)
    }
  }

  // CV Fullscreen action
  const handleFullScreenCv = () => {
    if (cvSignedUrl) {
      window.open(cvSignedUrl, '_blank', 'noopener,noreferrer')
    } else {
      void handleDownloadCv()
    }
  }

  // Format date helper
  const formatAppliedDate = (dateString?: string) => {
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

  // Format note timestamp helper
  const formatNoteTime = (dateString?: string) => {
    if (!dateString) return ''
    try {
      const d = new Date(dateString)
      const dayPart = new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      }).format(d)
      const timePart = new Intl.DateTimeFormat('en-GB', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d)
      return `${dayPart} · ${timePart}`
    } catch {
      return dateString
    }
  }

  // Active / Upcoming interview helper
  const activeInterview = useMemo(() => {
    return interviews.find(
      i => (i.status === 'scheduled' || i.status === 'rescheduled') && new Date(i.scheduled_at).getTime() >= Date.now() - 3600000
    )
  }, [interviews])

  const upcomingInterviews = useMemo(() => {
    return interviews.filter(i => i.status === 'scheduled' || i.status === 'rescheduled')
  }, [interviews])

  const pastOrCancelledInterviews = useMemo(() => {
    return interviews.filter(i => i.status === 'completed' || i.status === 'cancelled')
  }, [interviews])

  // Active stage details
  const activeStageConfig =
    STAGE_OPTIONS.find(s => s.stage === candidate?.stage) || STAGE_OPTIONS[0]

  const isDocx = candidate?.cv_path?.toLowerCase().endsWith('.docx') || candidate?.cv_path?.toLowerCase().endsWith('.doc')

  // Loading state
  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500">
        <div className="w-8 h-8 rounded-full border-2 border-[#5C00DD] border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Loading candidate profile...</p>
      </div>
    )
  }

  // Error / Not Found state
  if (!candidate || loadError) {
    return (
      <div className="p-8 max-w-[1360px] mx-auto">
        <Link
          to="/dashboard/applicants"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          <span>Back to applicants</span>
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-8 text-center max-w-xl mx-auto shadow-xs">
          <CircleAlert size={28} className="text-red-600 mx-auto mb-2" />
          <h2 className="text-base font-bold text-red-900">Candidate Not Found</h2>
          <p className="text-xs text-red-700 mt-1">{loadError || 'The requested application record does not exist or has been removed.'}</p>
          <div className="mt-4">
            <Link
              to="/dashboard/applicants"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#5C00DD] text-white text-xs font-semibold rounded-xl hover:bg-[#4900B0] transition-colors"
            >
              Return to Applicants
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1360px] mx-auto flex flex-col gap-6">
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

      {/* 1. Back button and Breadcrumb navigation matching workflow */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={
            searchParams.get('job_id') || candidate.vacancy_id || candidate.vacancies?.id
              ? `/dashboard/jobs/${searchParams.get('job_id') || candidate.vacancy_id || candidate.vacancies?.id}/applicants${isFixtureRequested ? '?fixture=true' : ''}`
              : `/dashboard/applicants${isFixtureRequested ? '?fixture=true' : ''}`
          }
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to applicants</span>
        </Link>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-gray-500">
          <Link to={`/dashboard/jobs${isFixtureRequested ? '?fixture=true' : ''}`} className="hover:text-gray-900 transition-colors">
            Jobs
          </Link>
          {(searchParams.get('job_id') || candidate.vacancy_id || candidate.vacancies?.id) && (
            <>
              <span className="text-gray-400">›</span>
              <Link
                to={`/dashboard/jobs/${searchParams.get('job_id') || candidate.vacancy_id || candidate.vacancies?.id}${isFixtureRequested ? '?fixture=true' : ''}`}
                className="hover:text-gray-900 transition-colors max-w-[200px] truncate"
              >
                {candidate.vacancies?.title || 'Job Details'}
              </Link>
            </>
          )}
          <span className="text-gray-400">›</span>
          <Link
            to={
              searchParams.get('job_id') || candidate.vacancy_id || candidate.vacancies?.id
                ? `/dashboard/jobs/${searchParams.get('job_id') || candidate.vacancy_id || candidate.vacancies?.id}/applicants${isFixtureRequested ? '?fixture=true' : ''}`
                : `/dashboard/applicants${isFixtureRequested ? '?fixture=true' : ''}`
            }
            className="hover:text-gray-900 transition-colors"
          >
            Applicants
          </Link>
          <span className="text-gray-400">›</span>
          <span className="text-[#5C00DD] font-semibold">{candidate.full_name}</span>
        </nav>
      </div>

      {/* 2. Top Candidate Header Card matching Jobs-4.png */}
      <header className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">
              {candidate.full_name}
            </h1>
          </div>

          {/* Previous / Next Candidate Navigation Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!prevCandidateId}
              onClick={() => prevCandidateId && navigate(`/dashboard/candidates/${prevCandidateId}`)}
              title={prevCandidateId ? 'Previous applicant' : 'No previous applicant'}
              className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Previous applicant"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              disabled={!nextCandidateId}
              onClick={() => nextCandidateId && navigate(`/dashboard/candidates/${nextCandidateId}`)}
              title={nextCandidateId ? 'Next applicant' : 'No next applicant'}
              className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Next applicant"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Status Selector & 5-Star Rating Row */}
        <div className="flex flex-wrap items-center gap-6 mt-4">
          {/* Status Dropdown */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-gray-500">Status</span>
            <div className="relative">
              <button
                type="button"
                disabled={stageUpdating}
                onClick={() => setStageMenuOpen(prev => !prev)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-800 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {stageUpdating ? (
                  <Loader2 size={13} className="animate-spin text-[#5C00DD]" />
                ) : (
                  <>
                    <span className={`w-2 h-2 rounded-full ${activeStageConfig.dotClass}`} />
                    <span>{activeStageConfig.label}</span>
                    <ChevronDown size={14} className="text-gray-400 ml-1" />
                  </>
                )}
              </button>

              {stageMenuOpen && (
                <div className="absolute left-0 mt-1 w-44 rounded-xl bg-white shadow-xl border border-gray-100 p-1.5 z-40 animate-in fade-in select-none">
                  <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                    Candidate Stage
                  </div>
                  <div className="py-1 flex flex-col gap-0.5">
                    {STAGE_OPTIONS.map(opt => {
                      const isSelected = candidate.stage === opt.stage
                      return (
                        <button
                          key={opt.stage}
                          type="button"
                          onClick={() => void handleStageChange(opt.stage)}
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
                </div>
              )}
            </div>
          </div>

          {/* Recruiter-Specific 5-Star Rating */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-gray-500">Rating</span>
            <div className="inline-flex items-center gap-1" title={`Your rating: ${myRating} of 5 stars`}>
              {[1, 2, 3, 4, 5].map(starNum => {
                const isFilled = starNum <= myRating
                return (
                  <button
                    key={starNum}
                    type="button"
                    disabled={ratingUpdating}
                    onClick={() => void handleRate(starNum)}
                    className="p-0.5 cursor-pointer text-amber-400 hover:scale-115 transition-transform disabled:opacity-50"
                    aria-label={`Rate ${starNum} stars`}
                  >
                    <Star
                      size={20}
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

          {/* Interview Action & Indicator */}
          <div className="ml-auto flex items-center gap-2.5">
            {activeInterview && (
              <button
                type="button"
                onClick={() => setActiveTab('interviews')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-[#F3EBFD] text-xs font-semibold text-[#5C00DD] hover:bg-[#EAE4FC] transition-colors cursor-pointer"
                title="View scheduled interview appointment"
              >
                <Calendar size={13} />
                <span>
                  Interview: {new Date(activeInterview.scheduled_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}{' '}
                  · {new Date(activeInterview.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedInterviewForReschedule(null)
                setScheduleModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#5C00DD] hover:bg-[#4A00B4] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Calendar size={14} />
              <span>Schedule Interview</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Tabbed Content Card matching Jobs-4.png and Jobs-5.png */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
        {/* Tab Headers */}
        <div className="border-b border-gray-100 px-6 pt-2 flex items-center gap-8 text-sm font-semibold select-none">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-3.5 relative transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'text-[#5C00DD] font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>Profile</span>
            {activeTab === 'profile' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5C00DD] rounded-t-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qa')}
            className={`pb-3.5 relative transition-colors cursor-pointer ${
              activeTab === 'qa'
                ? 'text-[#5C00DD] font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>Q&A</span>
            {activeTab === 'qa' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5C00DD] rounded-t-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`pb-3.5 relative transition-colors cursor-pointer ${
              activeTab === 'notes'
                ? 'text-[#5C00DD] font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>Notes</span>
            {notes.length > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                {notes.length}
              </span>
            )}
            {activeTab === 'notes' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5C00DD] rounded-t-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('interviews')}
            className={`pb-3.5 relative transition-colors cursor-pointer ${
              activeTab === 'interviews'
                ? 'text-[#5C00DD] font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>Interviews</span>
              {interviews.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#EAE4FC] text-[#5C00DD] font-semibold">
                  {interviews.length}
                </span>
              )}
            </div>
            {activeTab === 'interviews' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5C00DD] rounded-t-full" />
            )}
          </button>
        </div>

        {/* Tab 1: Profile View (Matching Jobs-4.png) */}
        {activeTab === 'profile' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Candidate & Application Information Cards */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Candidate Information Card */}
              <div className="rounded-xl border border-gray-100 p-5 bg-white shadow-xs">
                <h2 className="text-sm font-bold text-gray-900 pb-3 border-b border-gray-100">
                  Candidate Information
                </h2>
                <div className="space-y-4 pt-4 text-xs">
                  <div>
                    <span className="font-medium text-gray-400 block uppercase tracking-wider text-[11px]">
                      Email
                    </span>
                    <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                      {candidate.email}
                    </span>
                  </div>

                  <div>
                    <span className="font-medium text-gray-400 block uppercase tracking-wider text-[11px]">
                      Phone
                    </span>
                    <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                      {candidate.phone || '—'}
                    </span>
                  </div>

                  {/* Only display fields if available in answers or schema, never fabricate */}
                  {candidate.answers?.gender && (
                    <div>
                      <span className="font-medium text-gray-400 block uppercase tracking-wider text-[11px]">
                        Gender
                      </span>
                      <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                        {candidate.answers.gender}
                      </span>
                    </div>
                  )}

                  {(candidate.answers?.location || candidate.vacancies?.location) && (
                    <div>
                      <span className="font-medium text-gray-400 block uppercase tracking-wider text-[11px]">
                        Location
                      </span>
                      <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                        {candidate.answers?.location || candidate.vacancies?.location}
                      </span>
                    </div>
                  )}

                  {candidate.answers?.linkedin && (
                    <div>
                      <span className="font-medium text-gray-400 block uppercase tracking-wider text-[11px]">
                        Linkedin
                      </span>
                      <a
                        href={
                          candidate.answers.linkedin.startsWith('http')
                            ? candidate.answers.linkedin
                            : `https://${candidate.answers.linkedin}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#5C00DD] hover:underline text-sm mt-0.5 block truncate"
                      >
                        {candidate.answers.linkedin}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Application Information Card */}
              <div className="rounded-xl border border-gray-100 p-5 bg-white shadow-xs">
                <h2 className="text-sm font-bold text-gray-900 pb-3 border-b border-gray-100">
                  Application Information
                </h2>
                <div className="space-y-4 pt-4 text-xs">
                  <div>
                    <span className="font-medium text-gray-400 block uppercase tracking-wider text-[11px]">
                      Applied on
                    </span>
                    <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                      {formatAppliedDate(candidate.created_at)}
                    </span>
                  </div>

                  {candidate.vacancies?.title && (
                    <div>
                      <span className="font-medium text-gray-400 block uppercase tracking-wider text-[11px]">
                        Requisition / Role
                      </span>
                      <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                        {candidate.vacancies.title}
                      </span>
                    </div>
                  )}

                  {candidate.answers?.experience_level && (
                    <div>
                      <span className="font-medium text-gray-400 block uppercase tracking-wider text-[11px]">
                        Experience Level
                      </span>
                      <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                        {candidate.answers.experience_level}
                      </span>
                    </div>
                  )}

                  {candidate.vacancies?.department && (
                    <div>
                      <span className="font-medium text-gray-400 block uppercase tracking-wider text-[11px]">
                        Department
                      </span>
                      <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                        {candidate.vacancies.department}
                      </span>
                    </div>
                  )}

                  {candidate.answers?.notice_period && (
                    <div>
                      <span className="font-medium text-gray-400 block uppercase tracking-wider text-[11px]">
                        Notice Period
                      </span>
                      <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                        {candidate.answers.notice_period}
                      </span>
                    </div>
                  )}

                  {candidate.answers?.expected_salary && (
                    <div>
                      <span className="font-medium text-gray-400 block uppercase tracking-wider text-[11px]">
                        Expected Salary
                      </span>
                      <span className="font-semibold text-gray-900 text-sm mt-0.5 block">
                        {candidate.answers.expected_salary}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Resume Preview Card */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="rounded-xl border border-gray-100 p-5 bg-white shadow-xs flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-4 pb-3 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-900">Resume Preview</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFullScreenCv}
                      disabled={!candidate.cv_path}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Maximize2 size={13} />
                      <span>Full Screen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownloadCv()}
                      disabled={!candidate.cv_path}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                {/* Resume Document Viewer */}
                <div className="mt-4 flex-1 flex flex-col">
                  {cvLoading ? (
                    <div className="flex-1 min-h-[500px] flex items-center justify-center text-gray-400">
                      <Loader2 size={24} className="animate-spin text-[#5C00DD]" />
                    </div>
                  ) : !candidate.cv_path ? (
                    <div className="flex-1 min-h-[500px] rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                      <FileText size={36} className="text-gray-300 mb-2" />
                      <p className="text-sm font-semibold text-gray-600">No CV Attached</p>
                      <p className="text-xs text-gray-400 mt-1">This candidate submitted an application without a resume file.</p>
                    </div>
                  ) : isDocx ? (
                    /* DOCX fallback notice matching instruction 7 */
                    <div className="flex-1 min-h-[500px] rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
                      <FileText size={48} className="text-[#5C00DD] mb-3" />
                      <p className="text-sm font-bold text-gray-800">Microsoft Word Document (.docx)</p>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm">
                        Direct in-browser preview is unsupported for Word documents. Download the file to view the candidate's complete resume.
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleDownloadCv()}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#5C00DD] text-white text-xs font-semibold rounded-xl hover:bg-[#4900B0] transition-colors cursor-pointer shadow-xs"
                      >
                        <Download size={14} />
                        <span>Download Resume (.docx)</span>
                      </button>
                    </div>
                  ) : cvSignedUrl ? (
                    /* PDF Document Viewer */
                    <div className="flex-1 min-h-[620px] rounded-xl overflow-hidden border border-gray-200 bg-[#323639] shadow-inner">
                      <iframe
                        src={cvSignedUrl}
                        title="Candidate Resume Preview"
                        className="w-full h-full min-h-[620px] border-0"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 min-h-[500px] rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
                      <CircleAlert size={32} className="text-amber-500 mb-2" />
                      <p className="text-sm font-semibold text-gray-800">Preview Unavailable</p>
                      <p className="text-xs text-gray-500 mt-1">Could not generate a signed preview URL from private storage.</p>
                      <button
                        type="button"
                        onClick={() => void handleDownloadCv()}
                        className="mt-3 text-xs font-semibold text-[#5C00DD] hover:underline"
                      >
                        Try Direct Download
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Q&A View */}
        {activeTab === 'qa' && (
          <div className="p-8 max-w-4xl">
            <h2 className="text-base font-bold text-gray-900 mb-1">Screening Questions & Responses</h2>
            <p className="text-xs text-gray-500 mb-6">
              Responses submitted by candidate during the vacancy application process.
            </p>

            {screeningQuestions.length === 0 && Object.keys(candidate.answers || {}).length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-8 text-center text-gray-400">
                <p className="text-sm font-medium text-gray-600">No screening responses recorded</p>
                <p className="text-xs text-gray-400 mt-1">This vacancy did not have custom screening questions.</p>
              </div>
            ) : (
              <div className="space-y-5 divide-y divide-gray-100">
                {screeningQuestions.map((q, idx) => {
                  const answerVal = candidate.answers?.[q.id || String(q.sort_order)]
                  return (
                    <div key={q.id || idx} className="pt-4 first:pt-0">
                      <div className="flex items-start justify-between gap-4">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Question {idx + 1}
                        </span>
                        {q.required && (
                          <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{q.label}</p>
                      <div className="mt-2 p-3.5 rounded-xl bg-gray-50/80 border border-gray-100 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {answerVal !== undefined && answerVal !== '' ? answerVal : <span className="text-gray-400 italic">No answer provided</span>}
                      </div>
                    </div>
                  )
                })}

                {/* Render any additional answers not mapped directly to a question object */}
                {Object.entries(candidate.answers || {})
                  .filter(([key]) => !screeningQuestions.some(q => q.id === key || String(q.sort_order) === key))
                  .map(([key, value]) => (
                    <div key={key} className="pt-4">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <div className="mt-1.5 p-3.5 rounded-xl bg-gray-50/80 border border-gray-100 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {value}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Notes View (Matching Jobs-5.png) */}
        {activeTab === 'notes' && (
          <div className="p-8 max-w-4xl flex flex-col gap-6">
            {/* Note Input Box matching Jobs-5.png */}
            <div className="rounded-2xl border border-gray-200 bg-[#F9FAFB]/70 p-4 relative focus-within:ring-2 focus-within:ring-[#5C00DD] focus-within:border-transparent transition-all shadow-xs">
              <textarea
                value={newNoteBody}
                onChange={e => setNewNoteBody(e.target.value)}
                placeholder="Add a note about this candidate"
                rows={3}
                className="w-full bg-transparent border-0 resize-none text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none pr-10"
              />
              <button
                type="button"
                disabled={submittingNote || !newNoteBody.trim()}
                onClick={() => void handleAddNote()}
                title="Send internal note"
                className="absolute bottom-3.5 right-3.5 p-2 rounded-lg text-[#5C00DD] hover:bg-[#F3EBFD] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                aria-label="Submit note"
              >
                {submittingNote ? (
                  <Loader2 size={18} className="animate-spin text-[#5C00DD]" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>

            {/* Notes Roster List matching Jobs-5.png */}
            <div className="space-y-6 pt-2">
              {notes.length === 0 ? (
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-8 text-center text-gray-400">
                  <p className="text-sm font-medium text-gray-600">No internal notes yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Add private assessments or interview feedback visible only to authorized recruitment users.
                  </p>
                </div>
              ) : (
                notes.map(note => {
                  const author = note.recruiter?.display_name || 'Recruiter'
                  const authorInitials = author
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <article key={note.id} className="flex items-start gap-3 border-b border-gray-100 pb-5 last:border-0">
                      {/* Avatar initials */}
                      <div className="w-8 h-8 rounded-full bg-[#F3EBFD] text-[#5C00DD] font-semibold text-xs flex items-center justify-center shrink-0 border border-[#5C00DD]/20 select-none">
                        {authorInitials}
                      </div>

                      {/* Note Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-gray-900">{author}</span>
                          <span className="text-gray-400">·</span>
                          <time className="text-gray-500">{formatNoteTime(note.created_at)}</time>
                        </div>
                        <p className="mt-1.5 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {note.body}
                        </p>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Interviews View */}
        {activeTab === 'interviews' && (
          <div className="p-8 max-w-4xl flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">Candidate Interview Appointments</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Internal interview schedule, location details, and tamper-proof audit trail.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedInterviewForReschedule(null)
                  setScheduleModalOpen(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#5C00DD] hover:bg-[#4A00B4] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Schedule Interview</span>
              </button>
            </div>

            {/* Scope & Integration Disclaimer */}
            <div className="rounded-xl bg-[#F5F7FD] border border-[#E8EDF7] p-4 text-xs text-gray-700 flex items-start gap-3">
              <Info size={18} className="text-[#5C00DD] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-900">Internal Appointment Tracking:</span>{' '}
                <span>
                  This interview schedule is maintained internally within the OnCulture recruitment system.
                  External calendar synchronization (Google Calendar / Outlook) and candidate invitation emails
                  are separate external services that are not automatically dispatched.
                </span>
              </div>
            </div>

            {loadingInterviews ? (
              <div className="p-12 text-center text-gray-400">
                <Loader2 size={24} className="animate-spin text-[#5C00DD] mx-auto mb-2" />
                <p className="text-xs font-medium">Loading interview appointments...</p>
              </div>
            ) : interviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-[#EAE4FC] text-[#5C00DD] flex items-center justify-center mb-3">
                  <Calendar size={24} />
                </div>
                <h3 className="text-sm font-bold text-gray-900">No interviews scheduled yet</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  Schedule an initial screening or technical round with {candidate.full_name} to track interview progress.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInterviewForReschedule(null)
                    setScheduleModalOpen(true)
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#5C00DD] hover:bg-[#4A00B4] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>Schedule First Interview</span>
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active & Upcoming Interviews */}
                {upcomingInterviews.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Active & Upcoming Appointments ({upcomingInterviews.length})
                    </h3>

                    {upcomingInterviews.map(interview => {
                      const dt = new Date(interview.scheduled_at)
                      const isExpanded = expandedHistoryId === interview.id
                      const history = interview.interview_history || []

                      return (
                        <div
                          key={interview.id}
                          className="rounded-2xl border border-purple-100 bg-white p-5 shadow-xs flex flex-col gap-4 transition-all hover:border-[#5C00DD]/30"
                        >
                          {/* Top Row: Date, Status, Duration */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#EAE4FC] text-[#5C00DD] flex items-center justify-center shrink-0">
                                <Calendar size={20} />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-gray-900">
                                  {dt.toLocaleDateString('en-GB', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                  <span className="font-semibold text-gray-700">
                                    {dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span>·</span>
                                  <span>{interview.duration_minutes} minutes</span>
                                  <span>·</span>
                                  <span className="text-gray-400">{interview.timezone}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              <span
                                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                  interview.status === 'rescheduled'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {interview.status}
                              </span>
                            </div>
                          </div>

                          {/* Middle Row: Format & Meeting Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="rounded-xl bg-gray-50/80 border border-gray-100 p-3.5">
                              <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400 block mb-1">
                                Format & Coordinates
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                {interview.format === 'online' ? (
                                  <>
                                    <Video size={15} className="text-[#5C00DD] shrink-0" />
                                    <span className="font-medium text-gray-800">Online Video Call</span>
                                  </>
                                ) : interview.format === 'phone' ? (
                                  <>
                                    <Phone size={15} className="text-blue-600 shrink-0" />
                                    <span className="font-medium text-gray-800">Phone Call</span>
                                  </>
                                ) : (
                                  <>
                                    <MapPin size={15} className="text-emerald-600 shrink-0" />
                                    <span className="font-medium text-gray-800">In-Person Meeting</span>
                                  </>
                                )}
                              </div>
                              <div className="mt-2 text-gray-700 truncate">
                                {interview.format === 'online' && interview.location_or_link.startsWith('http') ? (
                                  <a
                                    href={interview.location_or_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#5C00DD] hover:underline inline-flex items-center gap-1 font-medium"
                                  >
                                    <span>{interview.location_or_link}</span>
                                    <ExternalLink size={12} />
                                  </a>
                                ) : (
                                  <span className="font-mono text-gray-900 bg-white px-2 py-1 rounded border border-gray-200 block truncate">
                                    {interview.location_or_link}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Internal Notes */}
                            <div className="rounded-xl bg-gray-50/80 border border-gray-100 p-3.5">
                              <span className="font-semibold uppercase tracking-wider text-[10px] text-gray-400 block mb-1">
                                Interview Notes
                              </span>
                              <p className="text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">
                                {interview.notes || (
                                  <span className="text-gray-400 italic">No notes provided.</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Bottom Row: Actions & Audit History Toggle */}
                          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInterviewForReschedule(interview)
                                  setScheduleModalOpen(true)
                                }}
                                className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors cursor-pointer"
                              >
                                Reschedule
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedInterviewForCancel(interview)}
                                className="px-3.5 py-1.5 rounded-lg border border-red-200 bg-white text-xs font-semibold text-red-600 hover:bg-red-50 shadow-2xs transition-colors cursor-pointer"
                              >
                                Cancel Interview
                              </button>
                            </div>

                            {history.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedHistoryId(isExpanded ? null : interview.id)
                                }
                                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                              >
                                <History size={13} />
                                <span>
                                  {isExpanded ? 'Hide' : 'View'} Audit Trail ({history.length})
                                </span>
                                <ChevronDown
                                  size={13}
                                  className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                />
                              </button>
                            )}
                          </div>

                          {/* Collapsible Tamper-Proof Audit History */}
                          {isExpanded && history.length > 0 && (
                            <div className="mt-2 pt-3 border-t border-gray-100 bg-[#F9FAFB] rounded-xl p-4">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                                <History size={13} className="text-[#5C00DD]" />
                                <span>Immutable Audit History</span>
                              </div>
                              <div className="space-y-3">
                                {history.map((item: InterviewHistory) => {
                                  const author = item.recruiter?.display_name || 'Recruiter'
                                  const changeTime = new Date(item.changed_at).toLocaleString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })

                                  return (
                                    <div
                                      key={item.id}
                                      className="text-xs text-gray-700 flex items-start gap-2.5 pb-2 border-b border-gray-200/60 last:border-0 last:pb-0"
                                    >
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-0.5 ${
                                          item.action === 'created'
                                            ? 'bg-blue-100 text-blue-800'
                                            : item.action === 'rescheduled'
                                            ? 'bg-amber-100 text-amber-800'
                                            : item.action === 'cancelled'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}
                                      >
                                        {item.action}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-semibold text-gray-900">{author}</span>
                                          <span className="text-gray-400">·</span>
                                          <time className="text-gray-500 text-[11px]">{changeTime}</time>
                                        </div>
                                        {item.cancellation_reason && (
                                          <p className="mt-0.5 text-red-700 italic">
                                            Reason: &quot;{item.cancellation_reason}&quot;
                                          </p>
                                        )}
                                        {item.notes && item.action !== 'cancelled' && (
                                          <p className="mt-0.5 text-gray-600 truncate">
                                            Notes: {item.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Past & Cancelled Interviews */}
                {pastOrCancelledInterviews.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Past & Cancelled Appointments ({pastOrCancelledInterviews.length})
                    </h3>

                    {pastOrCancelledInterviews.map(interview => {
                      const dt = new Date(interview.scheduled_at)
                      const isExpanded = expandedHistoryId === interview.id
                      const history = interview.interview_history || []

                      return (
                        <div
                          key={interview.id}
                          className="rounded-2xl border border-gray-200 bg-gray-50/60 p-5 shadow-xs flex flex-col gap-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gray-200/80 text-gray-500 flex items-center justify-center shrink-0">
                                <Calendar size={18} />
                              </div>
                              <div>
                                <span className="text-sm font-bold text-gray-700 line-through">
                                  {dt.toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}{' '}
                                  at {dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <div className="text-xs text-gray-400">
                                  {interview.format} · {interview.duration_minutes}m · {interview.timezone}
                                </div>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                interview.status === 'cancelled'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-gray-100 text-gray-700 border-gray-300'
                              }`}
                            >
                              {interview.status}
                            </span>
                          </div>

                          {interview.cancellation_reason && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-800">
                              <span className="font-semibold text-red-900">Cancellation Reason: </span>
                              <span>{interview.cancellation_reason}</span>
                            </div>
                          )}

                          {history.length > 0 && (
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedHistoryId(isExpanded ? null : interview.id)
                                }
                                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                              >
                                <History size={12} />
                                <span>
                                  {isExpanded ? 'Hide' : 'View'} Audit Trail ({history.length})
                                </span>
                                <ChevronDown
                                  size={12}
                                  className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                />
                              </button>
                            </div>
                          )}

                          {isExpanded && history.length > 0 && (
                            <div className="mt-1 pt-2 border-t border-gray-200 text-xs space-y-2">
                              {history.map((item: InterviewHistory) => (
                                <div key={item.id} className="text-[11px] text-gray-600 flex items-center justify-between">
                                  <span>
                                    <strong className="text-gray-800">{item.action}</strong> by{' '}
                                    {item.recruiter?.display_name || 'Recruiter'}
                                  </span>
                                  <time className="text-gray-400">
                                    {new Date(item.changed_at).toLocaleString('en-GB')}
                                  </time>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false)
          setSelectedInterviewForReschedule(null)
        }}
        candidateId={candidate.id}
        candidateName={candidate.full_name}
        candidateRole={candidate.vacancies?.title}
        existingInterview={selectedInterviewForReschedule}
        onSuccess={async () => {
          await loadCandidateInterviews(candidate.id)
          // Re-fetch application to keep stage badge in sync if stage advance was toggled
          const { data: appData } = await supabase
            .from('applications')
            .select('stage, stage_updated_at')
            .eq('id', candidate.id)
            .single()

          if (appData) {
            setCandidate(prev => (prev ? { ...prev, stage: appData.stage } : null))
          }

          setActionSuccess(
            selectedInterviewForReschedule
              ? 'Interview appointment rescheduled successfully.'
              : 'Interview appointment scheduled successfully.'
          )
          setTimeout(() => setActionSuccess(null), 4000)
        }}
      />

      {/* Cancel Interview Modal */}
      {selectedInterviewForCancel && (
        <CancelInterviewModal
          isOpen={Boolean(selectedInterviewForCancel)}
          onClose={() => setSelectedInterviewForCancel(null)}
          interview={selectedInterviewForCancel}
          candidateName={candidate.full_name}
          onSuccess={async () => {
            await loadCandidateInterviews(candidate.id)
            setActionSuccess('Interview appointment cancelled.')
            setTimeout(() => setActionSuccess(null), 4000)
          }}
        />
      )}
    </div>
  )
}
