import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  MapPin,
  Building2,
  Clock,
  Briefcase,
  CheckCircle2,
  UploadCloud,
  AlertCircle
} from 'lucide-react'
import { isConfigured, supabase } from '../../lib/supabase'
import { applicationBaseSchema, validateAnswers, validateCv } from '../../lib/validation'
import { parseSubmissionError } from '../../lib/submissionError'
import { formatCompensation } from '../../lib/recruitment'
import { sanitizeHtml } from '../../lib/sanitize'
import type { Vacancy, ScreeningQuestion } from '../../types'

export function JobPage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [job, setJob] = useState<Vacancy | null>(null)
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [file, setFile] = useState<File | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    let isMounted = true

    async function loadJobDetails() {
      if (!isConfigured) {
        setLoading(false)
        setError('Supabase is not configured')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: jobError } = await supabase
          .from('public_vacancies')
          .select('*')
          .eq('slug', slug)
          .single()

        if (jobError) throw new Error(jobError.message)

        if (data && isMounted) {
          setJob(data as Vacancy)

          // Load screening questions
          const { data: qData } = await supabase
            .from('public_screening_questions')
            .select('*')
            .eq('vacancy_id', data.id)
            .order('sort_order', { ascending: true })

          if (qData && isMounted) {
            setQuestions(qData as ScreeningQuestion[])
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to load vacancy'
          setError(msg)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadJobDetails()

    return () => {
      isMounted = false
    }
  }, [slug])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const parsed = applicationBaseSchema.safeParse({
      full_name: formData.get('full_name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      privacy: formData.get('privacy') === 'on',
    })

    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    const cvError = validateCv(file || undefined)
    if (cvError) {
      setError(cvError)
      return
    }

    const answerError = validateAnswers(questions, answers)
    if (answerError) {
      setError(answerError)
      return
    }

    setSubmitting(true)

    try {
      formData.set('answers', JSON.stringify(answers))
      formData.set('vacancy_slug', slug || '')

      const { error: fnError } = await supabase.functions.invoke('submit-application', {
        body: formData,
      })

      if (fnError) {
        const parsedErr = await parseSubmissionError(fnError)
        setError(parsedErr)
        setSubmitting(false)
        return
      }

      navigate('/application-success', { state: { role: job?.title } })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <div className="w-8 h-8 rounded-full border-2 border-[#5C00DD] border-t-transparent animate-spin mb-3" />
        <p className="text-sm text-gray-500">Loading vacancy details...</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
        <h1 className="text-xl font-bold text-gray-900">Position Unavailable</h1>
        <p className="text-sm text-gray-500 mt-2">
          This job vacancy could not be found or may have been unlisted.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5C00DD] text-white text-sm font-medium hover:bg-[#4A00B4] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>View all open positions</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-[#F9FAFB] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#5C00DD] transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          <span>All Open Positions</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-8 items-start">
          {/* Left Column: Job Description & Details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F3EBFD] text-[#5C00DD]">
                {job.employment_type}
              </span>
              {job.workplace_type && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                  {job.workplace_type}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {job.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin size={14} className="text-gray-400" />
                {job.location || 'Remote'}
              </span>
              {job.department && (
                <span className="flex items-center gap-1">
                  <Building2 size={14} className="text-gray-400" />
                  {job.department}
                </span>
              )}
              {job.deadline && (
                <span className="flex items-center gap-1">
                  <Clock size={14} className="text-gray-400" />
                  Deadline: {job.deadline}
                </span>
              )}
            </div>

            {/* Compensation */}
            <div className="mt-4 pt-4 border-t border-gray-100 text-sm font-semibold text-gray-900">
              {formatCompensation(job)}
            </div>

            {/* Job Description Sections */}
            <div className="mt-8 space-y-6 text-sm text-gray-600 leading-relaxed">
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-2">About the Role</h2>
                <div
                  className="rendered-html text-sm text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.description) }}
                />
              </div>

              {job.requirements && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-2">Qualifications & Requirements</h2>
                  <div
                    className="rendered-html text-sm text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.requirements) }}
                  />
                </div>
              )}

              {Boolean(job.skills?.length) && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-2">Required Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {job.skills?.map(skill => (
                      <span key={skill} className="px-3 py-1 rounded-lg text-xs bg-gray-100 text-gray-700">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {Boolean(job.benefits?.length) && (
                <div>
                  <h2 className="text-base font-bold text-gray-900 mb-2">Benefits</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    {job.benefits?.map((benefit, i) => (
                      <li
                        key={i}
                        className="rendered-html"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(benefit) }}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Application Form */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-xs sticky top-8">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Apply for this Position</h2>
            <p className="text-xs text-gray-500 mt-1 mb-6">
              Complete the form below to submit your application.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  name="full_name"
                  type="text"
                  required
                  placeholder="e.g. Philip Matthew"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5C00DD] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="philip@example.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5C00DD] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  name="phone"
                  type="tel"
                  required
                  placeholder="+234 800 000 0000"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5C00DD] focus:border-transparent"
                />
              </div>

              {/* CV Upload */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Resume / CV (PDF or DOCX, max 5MB) *
                </label>
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-gray-300 hover:border-[#5C00DD] bg-gray-50/50 cursor-pointer transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-[#5C00DD] shrink-0">
                    <UploadCloud size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-gray-800 truncate">
                      {file ? file.name : 'Choose a file to upload'}
                    </span>
                    <span className="block text-[11px] text-gray-400">PDF, DOCX up to 5MB</span>
                  </div>
                  <input
                    type="file"
                    name="cv"
                    accept=".pdf,.docx"
                    className="sr-only"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Custom Screening Questions */}
              {questions.map(q => (
                <div key={q.id || q.sort_order}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {q.label} {q.required && '*'}
                  </label>
                  {q.type === 'text' ? (
                    <textarea
                      required={q.required}
                      value={answers[q.id || String(q.sort_order)] || ''}
                      onChange={e =>
                        setAnswers({ ...answers, [q.id || String(q.sort_order)]: e.target.value })
                      }
                      rows={2}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5C00DD] focus:border-transparent"
                    />
                  ) : (
                    <select
                      required={q.required}
                      value={answers[q.id || String(q.sort_order)] || ''}
                      onChange={e =>
                        setAnswers({ ...answers, [q.id || String(q.sort_order)]: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5C00DD] focus:border-transparent bg-white"
                    >
                      <option value="">Select an answer</option>
                      {(q.type === 'yes_no' ? ['Yes', 'No'] : q.options).map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}

              {/* Privacy Consent */}
              <label className="flex items-start gap-2.5 text-xs text-gray-600 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  name="privacy"
                  required
                  className="mt-0.5 rounded text-[#5C00DD] focus:ring-[#5C00DD]"
                />
                <span>I agree to the processing of my application data for this recruitment process. *</span>
              </label>

              {/* Error Message */}
              {error && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2"
                >
                  <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer mt-2"
              >
                <span>{submitting ? 'Submitting Application...' : 'Submit Application'}</span>
                {!submitting && <CheckCircle2 size={16} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
