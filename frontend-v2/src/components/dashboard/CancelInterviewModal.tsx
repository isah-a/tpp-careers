import { useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Interview } from '../../types'

interface CancelInterviewModalProps {
  isOpen: boolean
  onClose: () => void
  interview: Interview
  candidateName?: string
  onSuccess: () => void
}

const COMMON_REASONS = [
  'Candidate requested postponement',
  'Interviewer scheduling conflict',
  'Candidate withdrew application',
  'Requisition paused or filled',
  'Other',
]

export function CancelInterviewModal({
  isOpen,
  onClose,
  interview,
  candidateName,
  onSuccess,
}: CancelInterviewModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(COMMON_REASONS[0])
  const [customReason, setCustomReason] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason
    if (!finalReason) {
      setErrorMessage('Please provide a reason for cancelling this interview.')
      return
    }

    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('interviews')
        .update({
          status: 'cancelled',
          cancellation_reason: finalReason,
        })
        .eq('id', interview.id)

      if (error) throw error

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel appointment'
      console.error('[CancelInterviewModal] Cancel error:', msg)
      setErrorMessage(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const formattedDate = new Date(interview.scheduled_at).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={18} />
            <h3 className="text-base font-bold text-gray-900">Cancel Interview</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleConfirmCancel} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
            <p className="font-semibold text-gray-900 text-xs">
              {candidateName || 'Candidate Interview'}
            </p>
            <p className="text-gray-500 text-[11px]">{formattedDate}</p>
            <p className="text-[11px] text-gray-500 capitalize">
              Format: {interview.format} · {interview.duration_minutes} min
            </p>
          </div>

          <p className="text-gray-600 leading-relaxed text-[11px]">
            Cancelling this appointment marks the internal record as <strong>cancelled</strong>.
            The audit trail is preserved in the candidate dossier.
          </p>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={e => setSelectedReason(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] text-gray-900"
            >
              {COMMON_REASONS.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {selectedReason === 'Other' && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Specify Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                placeholder="Brief reason for cancellation..."
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] text-gray-900 resize-none"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Keep Appointment
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <span>Confirm Cancellation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
