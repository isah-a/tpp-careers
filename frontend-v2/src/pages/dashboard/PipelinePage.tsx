import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDown,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  CircleAlert,
  GitFork,
  GripVertical,
  Info,
  Loader2,
  Search,
  Star,
  User,
  X,
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
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

// Format date helper
function formatDate(dateString?: string): string {
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

// ----------------------------------------------------------------------
// Reusable Candidate Card Content Component
// ----------------------------------------------------------------------
interface CandidateCardContentProps {
  cand: PipelineCandidate
  isMoving: boolean
  isRating: boolean
  onRate: (id: string, stars: number) => void
  onMoveSelect: (cand: PipelineCandidate, toStage: ApplicationStage) => void
  isDragOverlay?: boolean
}

function CandidateCardContent({
  cand,
  isMoving,
  isRating,
  onRate,
  onMoveSelect,
  isDragOverlay = false,
}: CandidateCardContentProps) {
  return (
    <>
      {/* Card Header: Candidate Name, Drag Handle & Link to Profile */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className="text-gray-300 hover:text-gray-600 transition-colors shrink-0 cursor-grab active:cursor-grabbing p-0.5"
            title="Drag candidate to move stage"
            aria-hidden="true"
          >
            <GripVertical size={14} />
          </span>
          {isDragOverlay ? (
            <span className="font-bold text-sm text-gray-900 leading-snug line-clamp-1">
              {cand.full_name}
            </span>
          ) : (
            <Link
              to={`/dashboard/candidates/${cand.id}`}
              onPointerDown={e => e.stopPropagation()}
              className="font-bold text-sm text-gray-900 hover:text-[#5C00DD] transition-colors leading-snug line-clamp-1"
              title={`Open profile for ${cand.full_name}`}
            >
              {cand.full_name}
            </Link>
          )}
        </div>

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
          onPointerDown={e => e.stopPropagation()}
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
                disabled={isRating || isDragOverlay}
                onClick={() => void onRate(cand.id, starNum)}
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

      {/* Move Stage Selector (Accessible Dropdown Fallback) */}
      <div className="border-t border-gray-100 pt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-gray-500">
          Move to:
        </span>

        <div className="relative" onPointerDown={e => e.stopPropagation()}>
          <select
            disabled={isMoving || isDragOverlay}
            value={cand.stage}
            onChange={e => onMoveSelect(cand, e.target.value as ApplicationStage)}
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
    </>
  )
}

// ----------------------------------------------------------------------
// Draggable Candidate Card Component
// ----------------------------------------------------------------------
interface DraggableCandidateCardProps {
  cand: PipelineCandidate
  isMoving: boolean
  isRating: boolean
  onRate: (id: string, stars: number) => void
  onMoveSelect: (cand: PipelineCandidate, toStage: ApplicationStage) => void
}

function DraggableCandidateCard({
  cand,
  isMoving,
  isRating,
  onRate,
  onMoveSelect,
}: DraggableCandidateCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: cand.id,
    data: {
      candidate: cand,
      stage: cand.stage,
    },
    disabled: isMoving,
  })

  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-grabbed={isDragging}
      tabIndex={0}
      className={`rounded-xl border p-3.5 transition-all flex flex-col gap-2.5 select-none ${
        isDragging
          ? 'opacity-30 border-dashed border-[#5C00DD]/50 bg-gray-50/70 scale-[0.98]'
          : 'bg-white border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md cursor-grab active:cursor-grabbing hover:border-gray-200'
      }`}
    >
      <CandidateCardContent
        cand={cand}
        isMoving={isMoving}
        isRating={isRating}
        onRate={onRate}
        onMoveSelect={onMoveSelect}
      />
    </article>
  )
}

// ----------------------------------------------------------------------
// Droppable Stage Column Component
// ----------------------------------------------------------------------
interface DroppableStageColumnProps {
  column: StageColumnConfig
  candidates: PipelineCandidate[]
  loading: boolean
  isOver: boolean
  movingId: string | null
  ratingId: string | null
  activeCandidate: PipelineCandidate | null
  onRate: (id: string, stars: number) => void
  onMoveSelect: (cand: PipelineCandidate, toStage: ApplicationStage) => void
}

function DroppableStageColumn({
  column,
  candidates,
  loading,
  isOver,
  movingId,
  ratingId,
  activeCandidate,
  onRate,
  onMoveSelect,
}: DroppableStageColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.stage,
    data: {
      stage: column.stage,
    },
  })

  const isDropTargetActive = isOver && activeCandidate && activeCandidate.stage !== column.stage

  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl flex flex-col p-3 transition-all min-h-[580px] ${
        isDropTargetActive
          ? column.isTerminal
            ? 'bg-[#FEF2F2] border-2 border-red-400 shadow-md ring-2 ring-red-400/30'
            : 'bg-[#F3EBFD]/30 border-2 border-[#5C00DD] shadow-md ring-2 ring-[#5C00DD]/30'
          : column.isTerminal
            ? 'bg-[#FEF2F2]/40 border border-red-200/60'
            : 'bg-[#F9FAFB] border border-gray-200/70'
      }`}
      aria-label={`${column.label} stage, ${candidates.length} candidates`}
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
          {candidates.length}
        </span>
      </div>

      {/* Candidate Cards Stream / Drop Zone */}
      <div className="mt-3 flex-1 flex flex-col gap-3">
        {loading ? (
          <div className="p-6 text-center text-gray-400">
            <Loader2 size={18} className="animate-spin mx-auto mb-2 text-[#5C00DD]" />
            <span className="text-xs">Loading...</span>
          </div>
        ) : candidates.length === 0 ? (
          isDropTargetActive ? (
            <div
              className={`rounded-xl border-2 border-dashed p-6 text-center text-xs font-semibold flex-1 flex flex-col items-center justify-center transition-all animate-pulse ${
                column.isTerminal
                  ? 'border-red-400 bg-red-100/50 text-red-700'
                  : 'border-[#5C00DD] bg-[#F3EBFD]/60 text-[#5C00DD]'
              }`}
            >
              <ArrowDown size={20} className="mb-1.5" />
              <p className="font-bold">Drop candidate here</p>
              <p className="text-[11px] opacity-80 mt-0.5">Move to {column.label}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200/80 bg-white/40 p-6 text-center text-xs text-gray-400 flex-1 flex flex-col items-center justify-center">
              <User size={20} className="text-gray-300 mb-1.5" />
              <p className="font-medium text-gray-500">No candidates</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Stage is currently empty.</p>
              {activeCandidate && activeCandidate.stage !== column.stage && (
                <p className="text-[10px] text-[#5C00DD] font-medium mt-2">
                  (Drag here to place candidate)
                </p>
              )}
            </div>
          )
        ) : (
          <>
            {candidates.map(cand => (
              <DraggableCandidateCard
                key={cand.id}
                cand={cand}
                isMoving={movingId === cand.id}
                isRating={ratingId === cand.id}
                onRate={onRate}
                onMoveSelect={onMoveSelect}
              />
            ))}

            {isDropTargetActive && (
              <div
                className={`rounded-lg border-2 border-dashed py-2.5 px-3 text-center text-[11px] font-semibold transition-all ${
                  column.isTerminal
                    ? 'border-red-400 bg-red-100/60 text-red-700'
                    : 'border-[#5C00DD] bg-[#F3EBFD]/60 text-[#5C00DD]'
                }`}
              >
                Drop to move candidate to {column.label}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

// ----------------------------------------------------------------------
// Main PipelinePage Component
// ----------------------------------------------------------------------
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

  // Drag-and-Drop state
  const [activeCandidate, setActiveCandidate] = useState<PipelineCandidate | null>(null)
  const [overStage, setOverStage] = useState<ApplicationStage | null>(null)

  // Rejection confirmation state to prevent accidental terminal outcomes
  const [pendingRejection, setPendingRejection] = useState<{
    candidate: PipelineCandidate
    toStage: 'rejected'
  } | null>(null)

  // Sensors: Require 5px pointer distance before dragging begins to preserve normal clicks on links/stars/dropdowns
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  )

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
    if (movingId !== null) return // Prevent concurrent duplicate moves

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
      const msg =
        err instanceof Error
          ? err.message
          : err && typeof err === 'object' && 'message' in err
            ? String((err as any).message)
            : 'Database RPC failed'
      console.error('[PipelinePage] Stage transition error:', msg)
      // PRESERVE STAGE AND DISPLAY CLEAR USER-FACING ERROR
      setActionError(`Could not move ${targetApp.full_name} from ${stageLabel(fromStage)} to ${stageLabel(toStage)}: ${msg}`)
    } finally {
      setMovingId(null)
    }
  }

  // Request move handler with rejection guard
  const requestMove = (candidate: PipelineCandidate, toStage: ApplicationStage) => {
    if (toStage === candidate.stage) return
    if (toStage === 'rejected') {
      setPendingRejection({ candidate, toStage: 'rejected' })
    } else {
      void handleMove(candidate.id, toStage)
    }
  }

  // Drag and Drop Event Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const cand = candidates.find(c => c.id === active.id)
    if (cand && movingId === null) {
      setActiveCandidate(cand)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setOverStage(null)
      return
    }

    const isDirectStage = STAGE_COLUMNS.some(s => s.stage === over.id)
    if (isDirectStage) {
      setOverStage(over.id as ApplicationStage)
    } else {
      const targetCand = candidates.find(c => c.id === over.id)
      setOverStage(targetCand?.stage || (over.data?.current?.stage as ApplicationStage) || null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCandidate(null)
    setOverStage(null)

    if (!over) return

    const cand = candidates.find(c => c.id === active.id)
    if (!cand) return

    // Resolve target stage whether dropped onto column container or another card in column
    let targetStage: ApplicationStage | null = null
    const isDirectStage = STAGE_COLUMNS.some(s => s.stage === over.id)

    if (isDirectStage) {
      targetStage = over.id as ApplicationStage
    } else {
      const targetCand = candidates.find(c => c.id === over.id)
      targetStage = targetCand?.stage || (over.data?.current?.stage as ApplicationStage) || null
    }

    if (!targetStage || targetStage === cand.stage) return

    // Route move request (with explicit rejection confirmation)
    requestMove(cand, targetStage)
  }

  const handleDragCancel = () => {
    setActiveCandidate(null)
    setOverStage(null)
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

  // Custom collision detection: checks pointer collisions, falls back to rectIntersection
  const customCollisionDetection: CollisionDetection = args => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }
    return rectIntersection(args)
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
              Displaying sample applicant records across the 6 pipeline stages for visual verification. Drag-and-drop transitions are active in fixture mode.
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
            Drag candidates between stage columns or use the dropdown selector to record transitions in Supabase.
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
        <span className="text-[#B91C1C]">Terminal Stage: Rejected (Requires confirmation)</span>
      </div>

      {/* 4. Six-Stage Kanban Board with Accessible Drag & Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={{
          announcements: {
            onDragStart({ active }) {
              const cand = candidates.find(c => c.id === active.id)
              return `Picked up candidate ${cand?.full_name || 'candidate'} in stage ${cand ? stageLabel(cand.stage) : ''}. Use arrow keys to navigate between columns and press space to drop.`
            },
            onDragOver({ active, over }) {
              const cand = candidates.find(c => c.id === active.id)
              let targetLabel = over?.id
              const foundCol = STAGE_COLUMNS.find(s => s.stage === over?.id)
              if (foundCol) targetLabel = foundCol.label
              return `Candidate ${cand?.full_name || 'candidate'} is over ${targetLabel || 'unknown'} column.`
            },
            onDragEnd({ active, over }) {
              const cand = candidates.find(c => c.id === active.id)
              let targetLabel = over?.id
              const foundCol = STAGE_COLUMNS.find(s => s.stage === over?.id)
              if (foundCol) targetLabel = foundCol.label
              return `Candidate ${cand?.full_name || 'candidate'} dropped into ${targetLabel || 'column'}.`
            },
            onDragCancel({ active }) {
              const cand = candidates.find(c => c.id === active.id)
              return `Movement cancelled. Candidate ${cand?.full_name || 'candidate'} returned to original position.`
            },
          },
        }}
      >
        <div className="overflow-x-auto pb-6">
          <div className="grid grid-flow-col auto-cols-[285px] gap-4 min-h-[580px]">
            {STAGE_COLUMNS.map(column => {
              const columnCandidates = filteredCandidates.filter(
                c => c.stage === column.stage
              )

              const isColumnOver = overStage === column.stage

              return (
                <DroppableStageColumn
                  key={column.stage}
                  column={column}
                  candidates={columnCandidates}
                  loading={loading}
                  isOver={isColumnOver}
                  movingId={movingId}
                  ratingId={ratingId}
                  activeCandidate={activeCandidate}
                  onRate={handleRate}
                  onMoveSelect={requestMove}
                />
              )
            })}
          </div>
        </div>

        {/* Lifted Drag Overlay Preview */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeCandidate ? (
            <div className="w-[285px] rotate-1 scale-105 shadow-2xl ring-2 ring-[#5C00DD] rounded-xl bg-white border border-[#5C00DD]/40 p-3.5 flex flex-col gap-2.5 cursor-grabbing pointer-events-none select-none">
              <CandidateCardContent
                cand={activeCandidate}
                isMoving={false}
                isRating={false}
                onRate={() => {}}
                onMoveSelect={() => {}}
                isDragOverlay={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 5. Accessible Rejection Confirmation Modal */}
      {pendingRejection && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in"
          onClick={() => !movingId && setPendingRejection(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 flex flex-col gap-4 animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 id="reject-dialog-title" className="text-base font-bold text-gray-900">
                  Confirm Candidate Rejection
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Are you sure you want to move <span className="font-semibold text-gray-800">{pendingRejection.candidate.full_name}</span> to the <strong className="text-red-600">Rejected</strong> stage?
                </p>
                {pendingRejection.candidate.vacancies?.title && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Role: {pendingRejection.candidate.vacancies.title}
                  </p>
                )}
                <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 mt-2 border border-amber-200/60">
                  Rejection is a terminal outcome and halts the candidate's active recruitment progression.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                autoFocus
                disabled={movingId !== null}
                onClick={() => setPendingRejection(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={movingId !== null}
                onClick={() => {
                  const { candidate, toStage } = pendingRejection
                  setPendingRejection(null)
                  void handleMove(candidate.id, toStage)
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {movingId === pendingRejection.candidate.id ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <span>Reject Candidate</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
