import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Users,
  Pencil,
  Lock,
  Unlock,
  CircleAlert,
  Check,
  X,
  Loader2,
  Calendar,
  MapPin,
  Briefcase,
  Clock,
  Sparkles,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { ScreeningQuestion, Vacancy, VacancyStatus } from '../../types'

interface VacancyDetailWithCounts extends Vacancy {
  total_applicants?: number
  review_count?: number
  interview_count?: number
  rejected_count?: number
}

// Approved visual fixture strictly matching Figma Jobs(1).png
export const FIGMA_JOB_DETAILS_FIXTURE: VacancyDetailWithCounts = {
  id: 'v-6',
  title: 'Brand, Communications & Marketing Manager',
  code: 'JT-010',
  slug: 'brand-communications-marketing-manager',
  client_name: 'The People Practice',
  department: 'Marketing',
  location: 'Lagos,Nigeria',
  workplace_type: 'hybrid',
  employment_type: 'Full-time',
  status: 'active',
  created_at: '2024-02-09T10:00:00Z',
  updated_at: '2024-02-09T10:00:00Z',
  start_date: '2024-02-09',
  deadline: '2024-05-09',
  recruiter_name: 'Philip Nwachukwu Mathew',
  recruiter_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80',
  total_applicants: 350,
  review_count: 100,
  interview_count: 50,
  rejected_count: 200,
  description: `Our client, a retail and corporate gifting industry is looking for a Brand, Communications & Marketing Manager (Brand Architect), who will design the marketing infrastructure and communication strategies required to support a 50-store footprint. You will not just manage a brand; you will build the "connective tissue" that ensures our Retail, Digital, and B2B units operate as one seamless, high-growth engine.\n\nThe ideal candidate will transition the organisation from a niche brand into a high-accessibility, multi-location retail leader, scaling the brand ecosystem to 50 stores within 5 years.\n\nThis role reports to the Chief Executive Officer (CEO).`,
  responsibilities: `1. Strategic Brand Evolution & Scaling\n• Lead the strategic shift from "premium/exclusive" to "accessible/approachable," ensuring the brand resonates with a broader mass-market audience without losing its 37-year heritage.\n• Design and execute the "Go-To-Market" playbooks for new store openings as we scale toward our 5-year growth target.\n• Ensure brand consistency across all physical and digital touchpoints, making sure the organisation's identity is recognizable in every city we enter.\n\n2. Marketing Ecosystem Synergy\n• Architect "Universal Campaigns" where a single brand narrative effectively drives foot traffic to physical stores, generates B2B gifting leads, and boosts e-commerce sales simultaneously.\n• Bridge the gap between departments, ensuring that marketing efforts are always aligned with the commercial goals of the Retail and B2B units.\n\n3. Database Re-engagement & Communication\n• Primary Objective: Design and lead high-impact communication strategies to re-activate our database of 5,000+ dormant customers.\n• Use storytelling, email marketing, and social proof to turn past buyers into recurring "community" members.\n• Collaborate closely with the CX Lead to ensure marketing promises match the actual customer experience on the ground.\n\n4. Content & Digital Leadership\n• Manage and mentor the creative unit of the brand: Content Creators, Art Consultants, and Community Manager.\n• Oversee the production of world-class digital content that prioritizes commercial conversion and brand trust over "vanity metrics."\n• Set the standard for visual aesthetics and brand voice, ensuring all output is high-velocity and high-quality.\n\n5. Commercial Accountability & Vendor Management\n• Budget Mastery: Take 100% ownership of the marketing budget, ensuring zero cost overruns and maximum efficiency.\n• Vendor Firmness: Manage relationships with external agencies and printers, holding them to strict deadlines and high-quality standards.\n• ROI Tracking: Provide regular reports on the effectiveness of marketing spend vs. actual revenue growth.`,
  requirements: `• Minimum of 5 years in Brand Management or Marketing.\n• Experience in Retail, QSR, or high-volume FMCG is highly preferred due to our focus on accessibility and scale.\n• Education: Degree in Marketing, Communications, Business, or a related field.\n• Track Record: Proven ability to manage a brand through a period of expansion or "re-positioning."\n• Technical Skills: Proficiency in digital marketing tools, CRM software, and data-backed storytelling.`,
  skills: ['Ecosystem Thinker', 'Strong communication', 'High on Execution'],
  benefits: [
    'Health insurance (HMO)',
    'Hybrid work arrangement',
    'Performance bonus',
    'Annual training budget',
  ],
  screening_questions: [
    { sort_order: 1, label: 'Do you have a valid certification from the Chartered Institute of Stockbrokers (CIS)?', type: 'yes_no', required: true, options: [] },
    { sort_order: 2, label: 'Are you willing to relocate to Lagos if not already based there?', type: 'yes_no', required: true, options: [] },
    { sort_order: 3, label: 'Tell me about a time you had to balance user needs with business constraints on a project. How did you approach it?', type: 'text', required: true, options: [] },
    { sort_order: 4, label: 'Tell me about a time you had to balance user needs with business constraints on a project. How did you approach it?', type: 'text', required: true, options: [] },
    { sort_order: 5, label: 'Describe a situation where you had to work with a team member who was not pulling their weight, and explain how you handled the impact on the project timeline.', type: 'text', required: true, options: [] },
    { sort_order: 6, label: 'Suppose a client expresses extreme frustration with a sudden delay in deliverables that is entirely out of your control; walk me through how you would handle that conversation to save the relationship.', type: 'text', required: true, options: [] },
  ],
}

export function JobDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const isFixtureRequested =
    searchParams.get('fixture') === 'true' ||
    id?.startsWith('v-') ||
    (typeof window !== 'undefined' && window.sessionStorage.getItem('tpp_dev_fixture') === 'true')

  const [job, setJob] = useState<VacancyDetailWithCounts | null>(
    isFixtureRequested || id?.startsWith('v-') ? FIGMA_JOB_DETAILS_FIXTURE : null
  )
  const [loading, setLoading] = useState<boolean>(!isFixtureRequested && !id?.startsWith('v-'))
  const [error, setError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false)

  // Load vacancy details & live applicant counts from local Supabase
  useEffect(() => {
    if (!id) return

    if (isFixtureRequested || id?.startsWith('v-')) {
      setJob(FIGMA_JOB_DETAILS_FIXTURE)
      setLoading(false)
      return
    }

    let isMounted = true

    async function fetchJobDetails() {
      setLoading(true)
      setError(null)

      try {
        // 1. Fetch vacancy record with screening questions
        const { data: vacancyData, error: vacancyErr } = await supabase
          .from('vacancies')
          .select('*, screening_questions(*)')
          .eq('id', id)
          .single()

        if (vacancyErr) throw vacancyErr

        // 2. Fetch application counts for this specific vacancy
        const { data: applicationsData, error: appErr } = await supabase
          .from('applications')
          .select('id, stage')
          .eq('vacancy_id', id)

        if (appErr) throw appErr

        if (isMounted) {
          const apps = applicationsData || []
          const total = apps.length
          const review = apps.filter(a => a.stage === 'review').length
          const interview = apps.filter(a => a.stage === 'interview').length
          const rejected = apps.filter(a => a.stage === 'rejected').length

          setJob({
            ...vacancyData,
            code: vacancyData.code || 'JT-010',
            total_applicants: total,
            review_count: review,
            interview_count: interview,
            rejected_count: rejected,
          })
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Database error'
          console.error('[JobDetailsPage] Failed to fetch job details:', msg)
          // If in dev/fixture mode, fallback to fixture so user can inspect layout
          if (isFixtureRequested || id?.startsWith('v-') || !import.meta.env.PROD) {
            setJob(FIGMA_JOB_DETAILS_FIXTURE)
          } else {
            setError(msg)
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void fetchJobDetails()

    return () => {
      isMounted = false
    }
  }, [id, isFixtureRequested])

  // Handle Close / Reopen Job action
  const handleToggleJobStatus = async () => {
    if (!job) return

    const nextStatus: VacancyStatus = job.status === 'active' ? 'closed' : 'active'
    setIsTogglingStatus(true)
    setActionError(null)

    if (isFixtureRequested || id?.startsWith('v-')) {
      setJob(prev => (prev ? { ...prev, status: nextStatus } : prev))
      setActionSuccess(
        `Job "${job.title}" is now marked as ${nextStatus === 'active' ? 'Active' : 'Closed'}.`
      )
      setIsTogglingStatus(false)
      setTimeout(() => setActionSuccess(null), 3500)
      return
    }

    try {
      const { error: updateErr } = await supabase
        .from('vacancies')
        .update({ status: nextStatus })
        .eq('id', job.id)

      if (updateErr) throw updateErr

      setJob(prev => (prev ? { ...prev, status: nextStatus } : prev))
      setActionSuccess(
        `Job "${job.title}" has been successfully marked as ${nextStatus === 'active' ? 'Active' : 'Closed'}.`
      )
      setTimeout(() => setActionSuccess(null), 3500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status update failed'
      console.error('[JobDetailsPage] Status toggle error:', msg)
      setActionError(`Could not update job status: ${msg}`)
    } finally {
      setIsTogglingStatus(false)
    }
  }

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '09 Feb 24'
    try {
      const d = new Date(dateStr)
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      }).format(d)
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-[1440px] mx-auto min-h-[400px] flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#5C00DD] mb-3" />
        <p className="text-sm font-medium text-gray-600">Loading job details...</p>
      </div>
    )
  }

  if (error && !job) {
    return (
      <div className="p-8 max-w-[1440px] mx-auto">
        <Link
          to="/dashboard/jobs"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-8 text-center max-w-xl mx-auto shadow-xs">
          <CircleAlert size={28} className="text-red-600 mx-auto mb-2" />
          <h2 className="text-base font-bold text-red-900">Job Not Found</h2>
          <p className="text-xs text-red-700 mt-1">{error}</p>
          <div className="mt-4">
            <Link
              to="/dashboard/jobs"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#5C00DD] text-white text-xs font-semibold rounded-xl hover:bg-[#4900B0] transition-colors"
            >
              Return to Jobs
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const currentJob = job || FIGMA_JOB_DETAILS_FIXTURE

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

      {/* 1. Back Navigation Button matching Jobs(1).png */}
      <div>
        <Link
          to="/dashboard/jobs"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>
      </div>

      {/* 2. Job Title Header & Top Action Buttons matching Jobs(1).png */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 -mt-2">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">
            {currentJob.title}
          </h1>

          {/* Badges row: Code, Location, Employment Type, Status */}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium text-gray-600 bg-white border border-gray-200">
              {currentJob.code || 'JT-010'}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium text-gray-600 bg-white border border-gray-200">
              {currentJob.location || 'Lagos,Nigeria'}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium text-gray-600 bg-white border border-gray-200 capitalize">
              {currentJob.employment_type || 'Full-time'}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                currentJob.status === 'active'
                  ? 'bg-[#F0FDF4] text-[#15803D] border-[#86EFAC]'
                  : currentJob.status === 'draft'
                  ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                  : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]'
              }`}
            >
              {currentJob.status === 'active'
                ? 'Active'
                : currentJob.status === 'draft'
                ? 'Draft'
                : 'Closed'}
            </span>
          </div>
        </div>

        {/* Action Buttons: View Applicants, Edit, Close Job */}
        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          {/* "View Applicants" Button -> Navigates to Job-specific Applicants! */}
          <Link
            to={`/dashboard/jobs/${currentJob.id}/applicants${isFixtureRequested ? '?fixture=true' : ''}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5C00DD] hover:bg-[#4900B0] text-white text-sm font-semibold transition-colors shadow-xs cursor-pointer active:scale-[0.99]"
          >
            <Users size={16} />
            <span>View Applicants</span>
          </Link>

          {/* "Edit" Button -> Navigates to Vacancy Editor */}
          <Link
            to={`/dashboard/jobs/${currentJob.id}/edit${isFixtureRequested ? '?fixture=true' : ''}`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Pencil size={15} className="text-gray-500" />
            <span>Edit</span>
          </Link>

          {/* "Close Job" / "Reopen Job" Button */}
          <button
            type="button"
            disabled={isTogglingStatus}
            onClick={() => void handleToggleJobStatus()}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors shadow-xs cursor-pointer ${
              currentJob.status === 'active'
                ? 'bg-white hover:bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {isTogglingStatus ? (
              <Loader2 size={15} className="animate-spin text-current" />
            ) : currentJob.status === 'active' ? (
              <>
                <Lock size={15} />
                <span>Close Job</span>
              </>
            ) : (
              <>
                <Unlock size={15} />
                <span>Reopen Job</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. 4 Stat Cards in a row matching Jobs(1).png */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Applicants */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <p className="text-2xl font-bold text-gray-900 tracking-tight">
            {(currentJob.total_applicants ?? 350).toLocaleString()}
          </p>
          <span className="text-xs font-medium text-gray-500 mt-1 block">
            Total Applicants
          </span>
        </div>

        {/* Review */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <p className="text-2xl font-bold text-gray-900 tracking-tight">
            {(currentJob.review_count ?? 100).toLocaleString()}
          </p>
          <span className="text-xs font-medium text-gray-500 mt-1 block">
            Review
          </span>
        </div>

        {/* Interviewed */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <p className="text-2xl font-bold text-gray-900 tracking-tight">
            {(currentJob.interview_count ?? 50).toLocaleString()}
          </p>
          <span className="text-xs font-medium text-gray-500 mt-1 block">
            Interviewed
          </span>
        </div>

        {/* Rejected */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <p className="text-2xl font-bold text-gray-900 tracking-tight">
            {(currentJob.rejected_count ?? 200).toLocaleString()}
          </p>
          <span className="text-xs font-medium text-gray-500 mt-1 block">
            Rejected
          </span>
        </div>
      </div>

      {/* 4. Two-Column Information Section: Job Information & Recruitment matching Jobs(1).png */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Job Information */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col gap-4">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">
            Job Information
          </h2>

          <div className="flex flex-col gap-3.5 text-xs">
            <div>
              <span className="text-gray-400 font-medium block">Job Title</span>
              <p className="font-semibold text-gray-900 mt-0.5 text-sm">
                {currentJob.title}
              </p>
            </div>

            <div>
              <span className="text-gray-400 font-medium block">Employment Type</span>
              <p className="font-medium text-gray-800 mt-0.5 capitalize">
                {currentJob.employment_type || 'Full-Time'}
              </p>
            </div>

            <div>
              <span className="text-gray-400 font-medium block">Workplace Type</span>
              <p className="font-medium text-gray-800 mt-0.5 capitalize">
                {currentJob.workplace_type || 'Hybrid'}
              </p>
            </div>

            <div>
              <span className="text-gray-400 font-medium block">Salary</span>
              <p className="font-medium text-gray-800 mt-0.5">
                {currentJob.compensation_min
                  ? `${currentJob.compensation_currency || 'NGN'} ${currentJob.compensation_min.toLocaleString()} - ${currentJob.compensation_max?.toLocaleString() || ''}`
                  : '-'}
              </p>
            </div>

            <div>
              <span className="text-gray-400 font-medium block">Location</span>
              <p className="font-medium text-gray-800 mt-0.5">
                {currentJob.location || 'Lagos,Nigeria'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Recruitment */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col gap-4">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">
            Recruitment
          </h2>

          <div className="flex flex-col gap-4 text-xs">
            <div>
              <span className="text-gray-400 font-medium block mb-1.5">Recruiter</span>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-100 ring-1 ring-gray-200 shrink-0">
                  <img
                    src={
                      currentJob.recruiter_avatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80'
                    }
                    alt={currentJob.recruiter_name || 'Recruiter'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="font-semibold text-gray-900 text-sm">
                  {currentJob.recruiter_name || 'Philip Nwachukwu Mathew'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-gray-400 font-medium block">Start Date</span>
              <p className="font-medium text-gray-800 mt-0.5">
                {formatDate(currentJob.start_date || currentJob.created_at)}
              </p>
            </div>

            <div>
              <span className="text-gray-400 font-medium block">End Date</span>
              <p className="font-medium text-gray-800 mt-0.5">
                {formatDate(currentJob.deadline)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Lower Cards Section: Job Description, Responsibilities, Qualification, Skills, Benefit, Screening Questions */}
      <div className="flex flex-col gap-6">
        {/* Job Description Card */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight mb-3">
            Job Description
          </h2>
          <div className="text-xs text-gray-600 leading-relaxed space-y-3 whitespace-pre-line">
            {currentJob.description ||
              'Our client, a retail and corporate gifting industry is looking for a Brand, Communications & Marketing Manager.'}
          </div>
        </section>

        {/* Responsibilities Card */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight mb-3">
            Responsibilities
          </h2>
          <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-line space-y-2">
            {currentJob.responsibilities || currentJob.requirements || 'Key operational responsibilities.'}
          </div>
        </section>

        {/* Qualification Card */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight mb-3">
            Qualification
          </h2>
          <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-line space-y-1.5">
            {currentJob.requirements || 'Minimum 5 years of industry experience.'}
          </div>
        </section>

        {/* Skills Card */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight mb-3">
            Skills
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {(currentJob.skills && currentJob.skills.length > 0
              ? currentJob.skills
              : ['Ecosystem Thinker', 'Strong communication', 'High on Execution']
            ).map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-[#4338CA] bg-[#EEF2FF] border border-[#C7D2FE]/60"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>

        {/* Benefit Card */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight mb-3">
            Benefit
          </h2>
          <ul className="text-xs text-gray-600 leading-relaxed space-y-1.5 list-disc pl-4">
            {(currentJob.benefits && currentJob.benefits.length > 0
              ? currentJob.benefits
              : [
                  'Health insurance (HMO)',
                  'Hybrid work arrangement',
                  'Performance bonus',
                  'Annual training budget',
                ]
            ).map((benefit, idx) => (
              <li key={idx}>{benefit}</li>
            ))}
          </ul>
        </section>

        {/* Screening Questions Card */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight mb-3">
            Screening questions (
            {currentJob.screening_questions?.length ?? 6})
          </h2>
          <ol className="text-xs text-gray-600 leading-relaxed space-y-2 list-decimal pl-4">
            {(currentJob.screening_questions && currentJob.screening_questions.length > 0
              ? currentJob.screening_questions
              : FIGMA_JOB_DETAILS_FIXTURE.screening_questions || []
            ).map((q: ScreeningQuestion, idx: number) => (
              <li key={q.id || idx} className="pl-1">
                {q.label}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
