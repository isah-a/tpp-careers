import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Briefcase,
  Users,
  Archive,
  Calendar,
  Plus,
  UserCheck,
  FileText,
  Info,
  X,
  Clock,
  Video,
  Phone,
  MapPin,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { applicationsToCsv } from '../../lib/csv'
import { ScheduleInterviewModal } from '../../components/dashboard/ScheduleInterviewModal'
import { CancelInterviewModal } from '../../components/dashboard/CancelInterviewModal'
import type { Application, Interview } from '../../types'

interface DashboardStats {
  activeJobs: number | null
  totalApplicants: number | null
  closeJobs: number | null
  scheduledInterviews: number | null
  interviewStageCount: number | null
}

type UpcomingInterviewItem = Interview

// Visual test fixture matching Figma Home.png layout values
const FIGMA_FIXTURE_STATS: DashboardStats = {
  activeJobs: 72,
  totalApplicants: 72,
  closeJobs: 72,
  scheduledInterviews: 72,
  interviewStageCount: 72,
}

export function DashboardPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  // Detect visual fixture mode via URL param
  const isFixtureMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('fixture') === 'true'

  const [stats, setStats] = useState<DashboardStats>(
    isFixtureMode ? FIGMA_FIXTURE_STATS : {
      activeJobs: null,
      totalApplicants: null,
      closeJobs: null,
      scheduledInterviews: null,
      interviewStageCount: null,
    }
  )

  const [loading, setLoading] = useState(!isFixtureMode)
  const [isUsingFixture, setIsUsingFixture] = useState(isFixtureMode)
  const [backendError, setBackendError] = useState<string | null>(null)

  // Interactive dialogs & feedback states
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [selectedInterviewForReschedule, setSelectedInterviewForReschedule] = useState<Interview | null>(null)
  const [selectedInterviewForCancel, setSelectedInterviewForCancel] = useState<Interview | null>(null)
  const [upcomingInterviews, setUpcomingInterviews] = useState<UpcomingInterviewItem[]>([])
  const [reportExporting, setReportExporting] = useState(false)
  const [reportToast, setReportToast] = useState<{ message: string; isError?: boolean } | null>(null)

  // Recruiter display name: real session metadata in normal mode; 'Mariam' only in visual fixture
  const recruiterFirstName = isFixtureMode
    ? 'Mariam'
    : (session?.user?.user_metadata?.full_name as string)?.split(' ')[0] ||
      session?.user?.email?.split('@')[0] ||
      'Recruiter'

  // Date format: 'Tue, 09 Feb 24' in visual fixture; real formatted current date in normal mode
  const displayDate = isFixtureMode
    ? 'Tue, 09 Feb 24'
    : new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      }).format(new Date())

  useEffect(() => {
    // If explicitly running in visual fixture mode, skip database queries
    if (isFixtureMode) {
      setStats(FIGMA_FIXTURE_STATS)
      setIsUsingFixture(true)
      setLoading(false)
      return
    }

    let isMounted = true

    async function loadRealDashboardData() {
      setLoading(true)
      setBackendError(null)

      try {
        const [vacanciesRes, applicationsRes, interviewsCountRes, upcomingRes] = await Promise.all([
          supabase
            .from('vacancies')
            .select('id, status')
            .order('created_at', { ascending: false }),
          supabase
            .from('applications')
            .select('id, stage')
            .order('created_at', { ascending: false }),
          supabase
            .from('interviews')
            .select('*', { count: 'exact', head: true })
            .in('status', ['scheduled', 'rescheduled'])
            .gte('scheduled_at', new Date().toISOString()),
          supabase
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
              created_by,
              updated_by,
              created_at,
              updated_at,
              application:applications(id, full_name, email, vacancies(title))
            `)
            .in('status', ['scheduled', 'rescheduled'])
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at', { ascending: true })
            .limit(5),
        ])

        if (vacanciesRes.error || applicationsRes.error) {
          const err = vacanciesRes.error?.message || applicationsRes.error?.message || 'Database unavailable'
          throw new Error(err)
        }

        const vacancies = (vacanciesRes.data || []) as unknown as Array<{ id: string; status: string }>
        const applications = (applicationsRes.data || []) as unknown as Array<{ id: string; stage: string }>

        const activeCount = vacancies.filter(v => v.status === 'active').length
        const closedCount = vacancies.filter(v => v.status === 'closed').length
        const totalApps = applications.length
        const interviewCount = applications.filter(a => a.stage === 'interview').length

        // Derive scheduled interviews count: use interviews table count if available, otherwise 0
        const scheduledCount = !interviewsCountRes.error ? (interviewsCountRes.count ?? 0) : null

        if (isMounted) {
          setStats({
            activeJobs: activeCount,
            totalApplicants: totalApps,
            closeJobs: closedCount,
            scheduledInterviews: scheduledCount,
            interviewStageCount: interviewCount,
          })
          if (!upcomingRes.error && upcomingRes.data) {
            setUpcomingInterviews(upcomingRes.data as unknown as UpcomingInterviewItem[])
          }
          setIsUsingFixture(false)
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.warn('[DashboardPage] Supabase unavailable, falling back to visual fixture:', err)
          setBackendError(err instanceof Error ? err.message : 'Database connection unavailable')
          setStats(FIGMA_FIXTURE_STATS)
          setIsUsingFixture(true)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadRealDashboardData()

    return () => {
      isMounted = false
    }
  }, [isFixtureMode])

  // End-to-end Generate Report handler: pulls live candidate records and generates CSV
  const handleGenerateReport = async () => {
    setReportExporting(true)
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const rows = (data || []) as unknown as Application[]
      const csvString = applicationsToCsv(rows, [])
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `onculture_candidate_report_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setReportToast({ message: `Pipeline report exported successfully (${rows.length} candidates)` })
      setTimeout(() => setReportToast(null), 4000)
    } catch (err: unknown) {
      console.error('[DashboardPage] CSV export failed:', err)
      setReportToast({
        message: 'CSV export failed. Ensure local Supabase backend is reachable.',
        isError: true,
      })
      setTimeout(() => setReportToast(null), 5000)
    } finally {
      setReportExporting(false)
    }
  }

  return (
    <div className="p-8 lg:p-9 max-w-[1320px] mx-auto flex flex-col gap-6">
      {/* Development-Only Visual Fixture Banner (Guaranteed NEVER to render in production) */}
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
                ? `Local Supabase returned: "${backendError}". Rendering Figma visual fixture values (72).`
                : 'Displaying approved Figma Home frame visual fixtures for design verification (?fixture=true).'}
            </p>
          </div>
        </div>
      )}

      {/* 1. Welcome Greeting Card (Calibrated to Figma Home.png height and padding) */}
      <section className="bg-white rounded-2xl border border-gray-100 px-8 py-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label="Waving hand">
            👋
          </span>
          <p className="text-[16px] sm:text-[17px]">
            <span className="font-bold text-[#5C00DD]">Hello {recruiterFirstName},</span>{' '}
            <span className="text-gray-700 font-normal">Welcome back to OnCulture</span>
          </p>
        </div>
        <div className="text-[15px] text-gray-500 font-normal sm:text-right">
          {displayDate}
        </div>
      </section>

      {/* 2. Four Summary Metric Cards (Calibrated dimensions, 56px icon container, 32px font) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" aria-label="Recruitment metrics">
        {/* Card 1: Active Jobs */}
        <div className="bg-[#F5F7FD] border border-[#E8EDF7] rounded-2xl p-6 min-h-[120px] flex items-center gap-5 transition-all hover:border-[#5C00DD]/20">
          <div className="w-14 h-14 rounded-2xl bg-[#EAE4FC] flex items-center justify-center shrink-0">
            <Briefcase size={26} className="text-[#5C00DD]" strokeWidth={2} />
          </div>
          <div>
            <div className="text-[32px] font-bold text-gray-900 leading-none tracking-tight">
              {loading ? '—' : stats.activeJobs ?? '—'}
            </div>
            <div className="text-[14px] font-medium text-gray-500 mt-2">Active Jobs</div>
          </div>
        </div>

        {/* Card 2: Total Applicants */}
        <div className="bg-[#F5F7FD] border border-[#E8EDF7] rounded-2xl p-6 min-h-[120px] flex items-center gap-5 transition-all hover:border-[#5C00DD]/20">
          <div className="w-14 h-14 rounded-2xl bg-[#EAE4FC] flex items-center justify-center shrink-0">
            <Users size={26} className="text-[#5C00DD]" strokeWidth={2} />
          </div>
          <div>
            <div className="text-[32px] font-bold text-gray-900 leading-none tracking-tight">
              {loading ? '—' : stats.totalApplicants ?? '—'}
            </div>
            <div className="text-[14px] font-medium text-gray-500 mt-2">Total Applicants</div>
          </div>
        </div>

        {/* Card 3: Close Jobs */}
        <div className="bg-[#F5F7FD] border border-[#E8EDF7] rounded-2xl p-6 min-h-[120px] flex items-center gap-5 transition-all hover:border-[#5C00DD]/20">
          <div className="w-14 h-14 rounded-2xl bg-[#EAE4FC] flex items-center justify-center shrink-0">
            <Archive size={26} className="text-[#5C00DD]" strokeWidth={2} />
          </div>
          <div>
            <div className="text-[32px] font-bold text-gray-900 leading-none tracking-tight">
              {loading ? '—' : stats.closeJobs ?? '—'}
            </div>
            <div className="text-[14px] font-medium text-gray-500 mt-2">Close Jobs</div>
          </div>
        </div>

        {/* Card 4: Scheduled Interviews */}
        <div className="bg-[#F5F7FD] border border-[#E8EDF7] rounded-2xl p-6 min-h-[120px] flex items-center gap-5 transition-all hover:border-[#5C00DD]/20">
          <div className="w-14 h-14 rounded-2xl bg-[#EAE4FC] flex items-center justify-center shrink-0">
            <Calendar size={26} className="text-[#5C00DD]" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="text-[32px] font-bold text-gray-900 leading-none tracking-tight flex items-baseline gap-2">
              <span>{loading ? '—' : isUsingFixture ? stats.scheduledInterviews : (stats.scheduledInterviews ?? 0)}</span>
              {!isUsingFixture && stats.scheduledInterviews === null && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">
                  Unavailable
                </span>
              )}
            </div>
            <div className="text-[14px] font-medium text-gray-500 mt-2">
              Scheduled Interviews
            </div>
            {!isUsingFixture && stats.interviewStageCount !== null && (
              <div className="text-[11px] text-gray-400 mt-1 truncate" title={`${stats.interviewStageCount} candidates in interview stage`}>
                {stats.interviewStageCount} in interview stage
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Actions Card (Calibrated padding, button dimensions and icon spacing) */}
      <section className="bg-white rounded-2xl border border-gray-100 p-8 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <h2 className="text-[18px] font-bold text-gray-900 mb-6 tracking-tight">Actions</h2>

        <div className="flex flex-wrap items-center gap-4">
          {/* Action 1: Create New Job */}
          <Link
            to="/dashboard/jobs/new"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#5C00DD] hover:bg-[#4A00B4] text-white text-[14px] font-medium transition-colors shadow-xs active:scale-[0.99]"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Create New Job</span>
          </Link>

          {/* Action 2: Review Applications */}
          <Link
            to="/dashboard/applicants"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-white border border-[#D1D5DB] hover:bg-gray-50 hover:border-gray-400 text-gray-700 text-[14px] font-medium transition-colors shadow-xs active:scale-[0.99]"
          >
            <UserCheck size={18} className="text-gray-500" strokeWidth={1.8} />
            <span>Review Applications</span>
          </Link>

          {/* Action 3: Schedule Interview */}
          <button
            type="button"
            onClick={() => setScheduleModalOpen(true)}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-white border border-[#D1D5DB] hover:bg-gray-50 hover:border-gray-400 text-gray-700 text-[14px] font-medium transition-colors cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <Calendar size={18} className="text-gray-500" strokeWidth={1.8} />
            <span>Schedule Interview</span>
          </button>

          {/* Action 4: Generate Report */}
          <button
            type="button"
            onClick={() => void handleGenerateReport()}
            disabled={reportExporting}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-white border border-[#D1D5DB] hover:bg-gray-50 hover:border-gray-400 text-gray-700 text-[14px] font-medium transition-colors cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50"
          >
            <FileText size={18} className="text-gray-500" strokeWidth={1.8} />
            <span>{reportExporting ? 'Generating Report...' : 'Generate Report'}</span>
          </button>
        </div>

        {/* Report Feedback Toast */}
        {reportToast && (
          <div
            className={`mt-4 p-3 rounded-lg border text-xs flex items-center justify-between animate-in fade-in ${
              reportToast.isError
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span>{reportToast.message}</span>
            <button
              onClick={() => setReportToast(null)}
              className={reportToast.isError ? 'text-red-600 hover:text-red-900' : 'text-emerald-600 hover:text-emerald-900'}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </section>

      {/* 4. Upcoming Interviews List (When scheduled interviews exist) */}
      {!isUsingFixture && upcomingInterviews.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 p-8 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EAE4FC] flex items-center justify-center text-[#5C00DD]">
                <Calendar size={18} />
              </div>
              <h2 className="text-[18px] font-bold text-gray-900 tracking-tight">
                Upcoming Scheduled Interviews
              </h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EAE4FC] text-[#5C00DD]">
              {upcomingInterviews.length} upcoming
            </span>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {upcomingInterviews.map(interview => {
              const candidate = interview.application
              const candidateName = candidate?.full_name || 'Candidate'
              const roleTitle = candidate?.vacancies?.title || 'Open Role'
              const interviewDate = new Date(interview.scheduled_at)
              const formattedDate = interviewDate.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
              })
              const formattedTime = interviewDate.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div
                  key={interview.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5C00DD] flex flex-col items-center justify-center shrink-0 border border-purple-100 text-[11px] font-bold leading-tight">
                      <span>{formattedDate.split(' ')[0]}</span>
                      <span className="text-gray-900 font-extrabold">{formattedDate.split(' ')[1]}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/dashboard/candidates/${interview.application_id}`}
                          className="font-bold text-sm text-gray-900 hover:text-[#5C00DD] transition-colors truncate"
                        >
                          {candidateName}
                        </Link>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-600 truncate">{roleTitle}</span>
                        {interview.status === 'rescheduled' && (
                          <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Rescheduled
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                          <Clock size={13} className="text-gray-400" />
                          <span>{formattedTime} ({interview.duration_minutes}m)</span>
                        </span>

                        <span className="inline-flex items-center gap-1">
                          {interview.format === 'online' ? (
                            <>
                              <Video size={13} className="text-[#5C00DD]" />
                              <span className="font-medium text-gray-700">Online</span>
                            </>
                          ) : interview.format === 'phone' ? (
                            <>
                              <Phone size={13} className="text-blue-600" />
                              <span className="font-medium text-gray-700">Phone</span>
                            </>
                          ) : (
                            <>
                              <MapPin size={13} className="text-emerald-600" />
                              <span className="font-medium text-gray-700">In-person</span>
                            </>
                          )}
                        </span>

                        {interview.location_or_link && (
                          <span className="truncate max-w-[220px] text-gray-600">
                            {interview.format === 'online' && interview.location_or_link.startsWith('http') ? (
                              <a
                                href={interview.location_or_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#5C00DD] hover:underline inline-flex items-center gap-1"
                              >
                                <span>Join link</span>
                                <ExternalLink size={11} />
                              </a>
                            ) : (
                              interview.location_or_link
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setSelectedInterviewForReschedule(interview)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-white hover:border-gray-300 transition-colors shadow-2xs cursor-pointer"
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedInterviewForCancel(interview)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <Link
                      to={`/dashboard/candidates/${interview.application_id}`}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      title="View candidate dossier"
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={scheduleModalOpen || Boolean(selectedInterviewForReschedule)}
        onClose={() => {
          setScheduleModalOpen(false)
          setSelectedInterviewForReschedule(null)
        }}
        existingInterview={selectedInterviewForReschedule}
        onSuccess={() => {
          void (async () => {
            // Trigger refresh
            const query = new URLSearchParams(window.location.search)
            if (query.get('fixture') !== 'true') {
              window.location.reload()
            }
          })()
        }}
      />

      {/* Cancel Interview Modal */}
      {selectedInterviewForCancel && (
        <CancelInterviewModal
          isOpen={Boolean(selectedInterviewForCancel)}
          onClose={() => setSelectedInterviewForCancel(null)}
          interview={selectedInterviewForCancel}
          candidateName={selectedInterviewForCancel.application?.full_name || selectedInterviewForCancel.applications?.full_name}
          onSuccess={() => {
            void (async () => {
              const query = new URLSearchParams(window.location.search)
              if (query.get('fixture') !== 'true') {
                window.location.reload()
              }
            })()
          }}
        />
      )}
    </div>
  )
}
