import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, ArrowRight } from 'lucide-react'

export function SuccessPage() {
  const location = useLocation()
  const role = (location.state as { role?: string } | null)?.role

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-10 flex flex-col items-center text-center">
        {/* Subtle Success Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-6 shadow-xs">
          <CheckCircle2 size={32} className="stroke-[2.25]" />
        </div>

        {/* Position Badge (if state passed) */}
        {role && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-[#5C00DD] border border-purple-100 text-xs font-semibold mb-4">
            <span className="truncate max-w-[280px]">Role: {role}</span>
          </div>
        )}

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Application submitted successfully
        </h1>

        {/* Supporting text */}
        <p className="text-sm sm:text-base text-gray-600 mt-3.5 leading-relaxed font-normal">
          Thank you for applying. Your application has been received, and our recruitment team will review it. If you're shortlisted, we'll contact you using the details you provided.
        </p>

        {/* Return Button */}
        <Link
          to="/"
          className="mt-8 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#5C00DD] hover:bg-[#4A00B4] text-white text-sm font-semibold transition-colors shadow-xs cursor-pointer"
        >
          <span>Return to careers</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
