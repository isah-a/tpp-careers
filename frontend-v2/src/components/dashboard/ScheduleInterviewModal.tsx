import { useEffect, useState, useMemo } from 'react'
import {
  Calendar,
  Clock,
  Globe,
  Video,
  Phone,
  MapPin,
  AlertTriangle,
  Info,
  X,
  Loader2,
  Check,
  User,
  ArrowRight,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Interview, InterviewFormat, InterviewOverlapConflict } from '../../types'

interface CandidateOption {
  id: string
  full_name: string
  email: string
  phone: string
  stage: string
  vacancy_title?: string
}

interface ScheduleInterviewModalProps {
  isOpen: boolean
  onClose: () => void
  candidateId?: string
  candidateName?: string
  candidateRole?: string
  existingInterview?: Interview | null
  onSuccess: () => void
}

const COMMON_TIMEZONES = [
  { value: 'Africa/Lagos', label: 'West Africa Time (Lagos, UTC+1)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
  { value: 'Europe/London', label: 'UK Time (London, GMT/BST)' },
  { value: 'America/New_York', label: 'Eastern Time (New York, ET)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago, CT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (LA, PT)' },
  { value: 'Africa/Nairobi', label: 'East Africa Time (Nairobi, UTC+3)' },
  { value: 'Africa/Johannesburg', label: 'South Africa Standard Time (SAST, UTC+2)' },
]

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  candidateId: initialCandidateId,
  candidateName: initialCandidateName,
  candidateRole: initialCandidateRole,
  existingInterview,
  onSuccess,
}: ScheduleInterviewModalProps) {
  const isRescheduling = Boolean(existingInterview)

  // Candidate selection
  const [candidates, setCandidates] = useState<CandidateOption[]>([])
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    initialCandidateId || existingInterview?.application_id || ''
  )
  const [candidateSearch, setCandidateSearch] = useState('')
  const [loadingCandidates, setLoadingCandidates] = useState(false)

  // Form fields
  const [date, setDate] = useState<string>('')
  const [time, setTime] = useState<string>('10:00')
  const [duration, setDuration] = useState<number>(45)
  const [timezone, setTimezone] = useState<string>('Africa/Lagos')
  const [format, setFormat] = useState<InterviewFormat>('online')
  const [locationOrLink, setLocationOrLink] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [advanceStage, setAdvanceStage] = useState<boolean>(false)

  // Feedback states
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [overlapWarning, setOverlapWarning] = useState<InterviewOverlapConflict | null>(null)
  const [checkingOverlap, setCheckingOverlap] = useState<boolean>(false)

  // Min date: today
  const minDate = useMemo(() => {
    return new Date().toISOString().split('T')[0]
  }, [])

  // Initialize form when opened or when existingInterview changes
  useEffect(() => {
    if (!isOpen) return

    setErrorMessage(null)
    setOverlapWarning(null)

    if (existingInterview) {
      const scheduledDate = new Date(existingInterview.scheduled_at)
      setDate(scheduledDate.toISOString().split('T')[0])
      setTime(
        scheduledDate.toTimeString().slice(0, 5) // "HH:MM"
      )
      setDuration(existingInterview.duration_minutes || 45)
      setTimezone(existingInterview.timezone || 'Africa/Lagos')
      setFormat(existingInterview.format || 'online')
      setLocationOrLink(existingInterview.location_or_link || '')
      setNotes(existingInterview.notes || '')
      setSelectedCandidateId(existingInterview.application_id)
      setAdvanceStage(false)
    } else {
      // Default to tomorrow at 10:00 AM
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setDate(tomorrow.toISOString().split('T')[0])
      setTime('10:00')
      setDuration(45)
      setTimezone('Africa/Lagos')
      setFormat('online')
      setLocationOrLink('')
      setNotes('')
      setSelectedCandidateId(initialCandidateId || '')
      setAdvanceStage(false)
    }
  }, [isOpen, existingInterview, initialCandidateId])

  // Load candidate list if opening from dashboard (no fixed candidateId)
  useEffect(() => {
    if (!isOpen || initialCandidateId || existingInterview) return

    let isMounted = true
    async function loadCandidates() {
      setLoadingCandidates(true)
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('id, full_name, email, phone, stage, vacancies(title)')
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) throw error
        if (isMounted && data) {
          const formatted: CandidateOption[] = data.map((item: any) => ({
            id: item.id,
            full_name: item.full_name,
            email: item.email,
            phone: item.phone,
            stage: item.stage,
            vacancy_title: item.vacancies?.title || 'Open Position',
          }))
          setCandidates(formatted)
          if (formatted.length > 0 && !selectedCandidateId) {
            setSelectedCandidateId(formatted[0].id)
          }
        }
      } catch (err: unknown) {
        console.error('[ScheduleInterviewModal] Load candidates error:', err)
      } finally {
        if (isMounted) setLoadingCandidates(false)
      }
    }

    loadCandidates()
    return () => {
      isMounted = false
    }
  }, [isOpen, initialCandidateId, existingInterview])

  // Automatically prefill candidate phone if format switched to phone
  useEffect(() => {
    if (format === 'phone' && !locationOrLink.trim()) {
      const candidate = candidates.find(c => c.id === selectedCandidateId)
      if (candidate?.phone) {
        setLocationOrLink(candidate.phone)
      }
    }
  }, [format, selectedCandidateId, candidates])

  // Active selected candidate details
  const activeCandidate = useMemo(() => {
    if (initialCandidateName) {
      return {
        id: initialCandidateId || '',
        full_name: initialCandidateName,
        email: '',
        phone: '',
        stage: '',
        vacancy_title: initialCandidateRole,
      }
    }
    return candidates.find(c => c.id === selectedCandidateId)
  }, [initialCandidateName, initialCandidateRole, initialCandidateId, candidates, selectedCandidateId])

  // Filtered candidate list for search
  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.toLowerCase().trim()
    if (!q) return candidates
    return candidates.filter(
      c =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.vacancy_title && c.vacancy_title.toLowerCase().includes(q))
    )
  }, [candidates, candidateSearch])

  // Calculate combined scheduled_at ISO timestamp
  const scheduledIso = useMemo(() => {
    if (!date || !time) return null
    try {
      const dtString = `${date}T${time}:00`
      const d = new Date(dtString)
      return isNaN(d.getTime()) ? null : d.toISOString()
    } catch {
      return null
    }
  }, [date, time])

  // Real-time overlap detection
  useEffect(() => {
    if (!isOpen || !scheduledIso) {
      setOverlapWarning(null)
      return
    }

    let isMounted = true
    const timer = setTimeout(async () => {
      setCheckingOverlap(true)
      try {
        const { data, error } = await supabase.rpc('check_interview_overlap', {
          p_scheduled_at: scheduledIso,
          p_duration_minutes: duration,
          p_exclude_interview_id: existingInterview?.id || null,
        })

        if (!error && isMounted && data && Array.isArray(data) && data.length > 0) {
          setOverlapWarning(data[0] as InterviewOverlapConflict)
        } else if (isMounted) {
          setOverlapWarning(null)
        }
      } catch (err) {
        // Silently skip if overlap RPC is unavailable
        console.warn('[ScheduleInterviewModal] Overlap check error:', err)
      } finally {
        if (isMounted) setCheckingOverlap(false)
      }
    }, 350)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [isOpen, scheduledIso, duration, existingInterview])

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!selectedCandidateId) {
      setErrorMessage('Please select a candidate to schedule an interview with.')
      return
    }

    if (!date || !time) {
      setErrorMessage('Please specify an interview date and start time.')
      return
    }

    if (!scheduledIso) {
      setErrorMessage('Invalid date or time selected.')
      return
    }

    const scheduledDate = new Date(scheduledIso)
    if (scheduledDate.getTime() < Date.now() - 300000) {
      setErrorMessage('Appointments must be scheduled for a future date and time.')
      return
    }

    if (!locationOrLink.trim()) {
      setErrorMessage(
        format === 'online'
          ? 'Please provide a video meeting link (e.g. Google Meet, Zoom).'
          : format === 'phone'
          ? 'Please provide a contact phone number.'
          : 'Please provide a physical office address or room location.'
      )
      return
    }

    setSubmitting(true)

    try {
      if (isRescheduling && existingInterview) {
        // Update existing appointment
        const { error: updateError } = await supabase
          .from('interviews')
          .update({
            scheduled_at: scheduledIso,
            duration_minutes: duration,
            timezone,
            format,
            location_or_link: locationOrLink.trim(),
            notes: notes.trim() || null,
            status: 'rescheduled',
          })
          .eq('id', existingInterview.id)

        if (updateError) throw updateError
      } else {
        // Create new appointment
        const { error: insertError } = await supabase.from('interviews').insert({
          application_id: selectedCandidateId,
          scheduled_at: scheduledIso,
          duration_minutes: duration,
          timezone,
          format,
          location_or_link: locationOrLink.trim(),
          notes: notes.trim() || null,
          status: 'scheduled',
        })

        if (insertError) throw insertError

        // Optional pipeline stage advance
        if (advanceStage && activeCandidate?.stage !== 'interview') {
          const { error: stageError } = await supabase.rpc('transition_application_stage', {
            p_application_id: selectedCandidateId,
            p_to_stage: 'interview',
            p_note: 'Moved to interview stage upon scheduling interview appointment',
          })
          if (stageError) {
            console.warn('[ScheduleInterviewModal] Optional stage transition error:', stageError.message)
          }
        }
      }

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database operation failed'
      console.error('[ScheduleInterviewModal] Submit error:', msg)
      setErrorMessage(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F3EBFD] text-[#5C00DD] flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-snug">
                {isRescheduling ? 'Reschedule Interview' : 'Schedule Interview'}
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">Internal hiring team appointment</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Clear Scope Disclaimer Banner (Requirement 7) */}
        <div className="px-6 py-2.5 bg-[#F9F7FE] border-b border-purple-100/60 flex items-start gap-2 text-[11px] text-purple-900 leading-relaxed">
          <Info size={15} className="text-[#5C00DD] shrink-0 mt-0.5" />
          <span>
            <strong>Internal record only.</strong> Candidate email invitations and external calendar synchronization (Google Calendar / Outlook) are not configured.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-2">
              <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Overlap Warning Banner (Requirement 3) */}
          {overlapWarning && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <p className="font-semibold text-amber-900">Scheduling Overlap Warning</p>
                <p className="mt-0.5 text-amber-700 text-[11px]">
                  This appointment overlaps with an existing session for candidate{' '}
                  <strong>{overlapWarning.candidate_name}</strong> ({overlapWarning.format},{' '}
                  {overlapWarning.duration_minutes} min).
                </p>
              </div>
            </div>
          )}

          {/* 1. Candidate Selection */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Candidate <span className="text-red-500">*</span>
            </label>

            {initialCandidateName || existingInterview ? (
              // Pre-selected candidate view
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#5C00DD]/10 text-[#5C00DD] flex items-center justify-center font-bold text-xs">
                    {(initialCandidateName || activeCandidate?.full_name || 'C')[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-xs">
                      {initialCandidateName || activeCandidate?.full_name}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {initialCandidateRole || activeCandidate?.vacancy_title || 'Applicant'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md">
                  Selected
                </span>
              </div>
            ) : (
              // Candidate Dropdown
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Filter candidates by name, email, or role..."
                  value={candidateSearch}
                  onChange={e => setCandidateSearch(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C00DD]"
                />
                <select
                  value={selectedCandidateId}
                  onChange={e => setSelectedCandidateId(e.target.value)}
                  disabled={loadingCandidates}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] focus:border-transparent text-gray-900"
                >
                  {loadingCandidates ? (
                    <option value="">Loading candidate applications...</option>
                  ) : filteredCandidates.length === 0 ? (
                    <option value="">No candidates match your search</option>
                  ) : (
                    filteredCandidates.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.email}) — {c.vacancy_title} [{c.stage}]
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>

          {/* 2. Date, Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={minDate}
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] text-gray-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] text-gray-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Duration <span className="text-red-500">*</span>
              </label>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] text-gray-900"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes (1 hr)</option>
                <option value={90}>90 minutes (1.5 hr)</option>
                <option value={120}>120 minutes (2 hr)</option>
              </select>
            </div>
          </div>

          {/* 3. Timezone */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Timezone <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] text-gray-900"
              >
                {COMMON_TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Format Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Interview Format <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormat('online')}
                className={`py-2 px-3 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                  format === 'online'
                    ? 'border-[#5C00DD] bg-[#F3EBFD] text-[#5C00DD] font-semibold'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Video size={16} />
                <span>Online Video</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('phone')}
                className={`py-2 px-3 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                  format === 'phone'
                    ? 'border-[#5C00DD] bg-[#F3EBFD] text-[#5C00DD] font-semibold'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Phone size={16} />
                <span>Phone Call</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('in_person')}
                className={`py-2 px-3 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                  format === 'in_person'
                    ? 'border-[#5C00DD] bg-[#F3EBFD] text-[#5C00DD] font-semibold'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <MapPin size={16} />
                <span>In-Person</span>
              </button>
            </div>
          </div>

          {/* 5. Location or Link Input */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              {format === 'online'
                ? 'Meeting Link (Google Meet, Zoom, etc.) *'
                : format === 'phone'
                ? 'Telephone Number *'
                : 'Physical Office Address / Room Location *'}
            </label>
            <input
              type="text"
              required
              value={locationOrLink}
              onChange={e => setLocationOrLink(e.target.value)}
              placeholder={
                format === 'online'
                  ? 'https://meet.google.com/xyz-abcd-efg'
                  : format === 'phone'
                  ? '+234 800 123 4567'
                  : 'Floor 3, Conference Room B, OnCulture HQ, Lagos'
              }
              className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* 6. Notes Textarea */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Internal Interview Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Focus on technical architecture and system scalability assessment..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] text-gray-900 placeholder:text-gray-400 resize-none"
            />
          </div>

          {/* 7. Optional Pipeline Stage Advance (Requirement 8) */}
          {!isRescheduling && activeCandidate?.stage !== 'interview' && (
            <div className="pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700 text-xs">
                <input
                  type="checkbox"
                  checked={advanceStage}
                  onChange={e => setAdvanceStage(e.target.checked)}
                  className="rounded border-gray-300 text-[#5C00DD] focus:ring-[#5C00DD]"
                />
                <span>
                  Advance candidate's recruitment stage to <strong>"Interview"</strong>
                </span>
              </label>
              <p className="text-[11px] text-gray-400 ml-5 mt-0.5">
                If left unchecked, the candidate's current stage ({activeCandidate?.stage || 'Screening'}) is strictly preserved.
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || checkingOverlap}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#5C00DD] hover:bg-[#4A00B4] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving appointment...</span>
                </>
              ) : (
                <>
                  <Calendar size={14} />
                  <span>{isRescheduling ? 'Update Schedule' : 'Schedule Interview'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
