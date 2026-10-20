import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bold,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  GripVertical,
  Info,
  Italic,
  List,
  ListOrdered,
  Loader2,
  MapPin,
  Plus,
  Save,
  Trash2,
  Underline,
  User,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { parseQuestionOptions, vacancyDraftSchema, vacancySchema } from '../../lib/validation'
import type { JobTemplate, QuestionType, ScreeningQuestion, VacancyStatus, WorkplaceType } from '../../types'

interface FormState {
  title: string
  slug: string
  client_name: string
  department: string
  location: string
  employment_type: string
  workplace_type: WorkplaceType
  compensation_min: string
  compensation_max: string
  compensation_currency: string
  start_date: string
  deadline: string
  skills: string[]
  benefits: string
  description: string
  requirements: string
  status: VacancyStatus
  show_salary_public: boolean
  auto_close_deadline: boolean
}

type EditableQuestion = ScreeningQuestion & { options_input?: string }

const INITIAL_FORM: FormState = {
  title: '',
  slug: '',
  client_name: 'TPP Careers',
  department: '',
  location: '',
  employment_type: 'Full-time',
  workplace_type: 'onsite',
  compensation_min: '',
  compensation_max: '',
  compensation_currency: 'NGN',
  start_date: '',
  deadline: '',
  skills: [],
  benefits: '',
  description: '',
  requirements: '',
  status: 'draft',
  show_salary_public: true,
  auto_close_deadline: true,
}

// Preset skills matching Jobs-1.png
const DEFAULT_PRESET_SKILLS = [
  'Ecosystem Thinker',
  'Strong communication',
  'High on Execution',
]

export function VacancyEditorPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { session } = useAuth()

  // Tab: 'job' (Job Details) | 'details' (Details / Description) | 'screening' (Screening Questions)
  const [activeTab, setActiveTab] = useState<'job' | 'details' | 'screening'>('job')

  // Form & questions state
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [questions, setQuestions] = useState<EditableQuestion[]>([])
  const [skillInput, setSkillInput] = useState<string>('')

  // New question draft modal / popover state
  const [isAddingQuestion, setIsAddingQuestion] = useState<boolean>(false)
  const [newQuestionLabel, setNewQuestionLabel] = useState<string>('')
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>('yes_no')
  const [newQuestionOptions, setNewQuestionOptions] = useState<string>('')
  const [newQuestionRequired, setNewQuestionRequired] = useState<boolean>(true)

  // Status & loading states
  const [loading, setLoading] = useState<boolean>(Boolean(id || searchParams.get('template')))
  const [saving, setSaving] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  // Load existing vacancy or template
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      const templateId = searchParams.get('template')

      if (id) {
        setLoading(true)
        setErrorMessage(null)

        try {
          const { data, error } = await supabase
            .from('vacancies')
            .select('*, screening_questions(*)')
            .eq('id', id)
            .single()

          if (error) throw error

          if (isMounted && data) {
            setForm({
              title: data.title || '',
              slug: data.slug || '',
              client_name: data.client_name || 'TPP Careers',
              department: data.department || '',
              location: data.location || '',
              employment_type: data.employment_type || 'Full-time',
              workplace_type: data.workplace_type || 'onsite',
              compensation_min: data.compensation_min?.toString() || '',
              compensation_max: data.compensation_max?.toString() || '',
              compensation_currency: data.compensation_currency || 'NGN',
              start_date: data.start_date || '',
              deadline: data.deadline || '',
              skills: Array.isArray(data.skills) ? data.skills : [],
              benefits: Array.isArray(data.benefits) ? data.benefits.join('\n') : (data.benefits || ''),
              description: data.description || '',
              requirements: data.requirements || '',
              status: data.status || 'draft',
              show_salary_public: true,
              auto_close_deadline: true,
            })

            const qList = (data.screening_questions || []).sort(
              (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
            )
            setQuestions(
              qList.map((q: any) => ({
                ...q,
                options_input: Array.isArray(q.options) ? q.options.join(', ') : '',
              }))
            )
          }
        } catch (err: unknown) {
          if (isMounted) {
            const msg = err instanceof Error ? err.message : 'Failed to load vacancy'
            console.error('[VacancyEditorPage] Load error:', msg)
            setErrorMessage(msg)
          }
        } finally {
          if (isMounted) setLoading(false)
        }
      } else if (templateId) {
        setLoading(true)
        setErrorMessage(null)

        try {
          const { data, error } = await supabase
            .from('job_templates')
            .select('*')
            .eq('id', templateId)
            .single()

          if (error) throw error

          if (isMounted && data) {
            const t = data as JobTemplate
            const autoSlug = t.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '')

            setForm({
              ...INITIAL_FORM,
              title: t.title,
              slug: autoSlug,
              department: t.department || '',
              location: t.location || '',
              employment_type: t.employment_type || 'Full-time',
              workplace_type: t.workplace_type || 'onsite',
              compensation_min: t.compensation_min?.toString() || '',
              compensation_max: t.compensation_max?.toString() || '',
              compensation_currency: t.compensation_currency || 'NGN',
              skills: t.skills || [],
              benefits: t.benefits?.join('\n') || '',
              description: t.description || '',
              requirements: t.requirements || '',
              status: 'draft',
            })

            setQuestions(
              (t.screening_questions || []).map((q: ScreeningQuestion) => ({
                ...q,
                options_input: q.options?.join(', ') || '',
              }))
            )
          }
        } catch (err: unknown) {
          if (isMounted) {
            const msg = err instanceof Error ? err.message : 'Failed to load template'
            setErrorMessage(msg)
          }
        } finally {
          if (isMounted) setLoading(false)
        }
      } else {
        // New vacancy: initialize with sample skills from Jobs-1.png
        setForm(prev => ({
          ...prev,
          skills: DEFAULT_PRESET_SKILLS,
        }))
        setLoading(false)
      }
    }

    void loadData()

    return () => {
      isMounted = false
    }
  }, [id, searchParams])

  // Field change helper
  const updateField = (field: keyof FormState, value: any) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      // Auto-generate slug on new vacancy title changes
      if (field === 'title' && !id) {
        next.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      }
      return next
    })
  }

  // Add skill tag
  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const trimmed = skillInput.trim().replace(/^,+|,+$/g, '')
      if (trimmed && !form.skills.includes(trimmed)) {
        setForm(prev => ({ ...prev, skills: [...prev.skills, trimmed] }))
        setSkillInput('')
      }
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove),
    }))
  }

  // Add question to list
  const handleConfirmAddQuestion = () => {
    if (!newQuestionLabel.trim()) return

    const parsedOpts =
      newQuestionType === 'single_select' ? parseQuestionOptions(newQuestionOptions) : []

    const q: EditableQuestion = {
      label: newQuestionLabel.trim(),
      type: newQuestionType,
      required: newQuestionRequired,
      options: parsedOpts,
      options_input: newQuestionOptions,
      sort_order: questions.length,
    }

    setQuestions(prev => [...prev, q])
    setNewQuestionLabel('')
    setNewQuestionOptions('')
    setNewQuestionType('yes_no')
    setIsAddingQuestion(false)
  }

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx))
  }

  // Format payload for validation and database
  const buildPayload = (targetStatus: VacancyStatus) => {
    return {
      title: form.title.trim(),
      slug: form.slug.trim(),
      client_name: form.client_name.trim() || 'TPP Careers',
      description: form.description.trim(),
      requirements: form.requirements.trim(),
      department: form.department.trim() || undefined,
      location: form.location.trim(),
      employment_type: form.employment_type.trim(),
      workplace_type: form.workplace_type,
      compensation_min: form.compensation_min ? Number(form.compensation_min) : null,
      compensation_max: form.compensation_max ? Number(form.compensation_max) : null,
      compensation_currency: form.compensation_currency.trim().toUpperCase() || 'NGN',
      start_date: form.start_date || null,
      deadline: form.deadline || null,
      skills: form.skills,
      benefits: form.benefits
        .split('\n')
        .map(b => b.trim())
        .filter(Boolean),
      status: targetStatus,
    }
  }

  // Save handler (Draft or Publish)
  const handleSave = async (targetStatus: VacancyStatus) => {
    setErrorMessage(null)
    setSuccessNotice(null)

    const rawPayload = buildPayload(targetStatus)

    // Validate using Zod schemas from validation.ts
    const validationResult =
      targetStatus === 'draft'
        ? vacancyDraftSchema.safeParse(rawPayload)
        : vacancySchema.safeParse(rawPayload)

    if (!validationResult.success) {
      const firstIssue = validationResult.error.issues[0]
      const issueField = String(firstIssue.path[0] || '')

      // Navigate to the tab where the error occurred
      if (['description', 'requirements', 'benefits'].includes(issueField)) {
        setActiveTab('details')
      } else {
        setActiveTab('job')
      }

      setErrorMessage(firstIssue.message)
      return
    }

    // Verify screening questions
    const readyQuestions = questions.map((item, idx) => ({
      label: item.label.trim(),
      type: item.type,
      required: item.required,
      options: item.type === 'single_select' ? parseQuestionOptions(item.options_input || '') : [],
      sort_order: idx,
    }))

    const invalidQuestion = readyQuestions.find(
      q => !q.label || (q.type === 'single_select' && q.options.length < 2)
    )

    if (invalidQuestion) {
      setActiveTab('screening')
      setErrorMessage(
        !invalidQuestion.label
          ? 'Each screening question must have a label.'
          : 'Multiple-choice questions must have at least 2 comma-separated options.'
      )
      return
    }

    setSaving(true)

    try {
      let vacancyId = id

      if (id) {
        // Update existing vacancy
        const { error: updateErr } = await supabase
          .from('vacancies')
          .update(validationResult.data)
          .eq('id', id)

        if (updateErr) throw updateErr

        // Replace screening questions
        await supabase.from('screening_questions').delete().eq('vacancy_id', id)
      } else {
        // Insert new vacancy
        const { data: inserted, error: insertErr } = await supabase
          .from('vacancies')
          .insert(validationResult.data)
          .select('id')
          .single()

        if (insertErr) throw insertErr
        vacancyId = inserted.id
      }

      // Insert screening questions
      if (readyQuestions.length && vacancyId) {
        const questionsPayload = readyQuestions.map(q => ({
          vacancy_id: vacancyId,
          label: q.label,
          type: q.type,
          required: q.required,
          options: q.options,
          sort_order: q.sort_order,
        }))

        const { error: qErr } = await supabase
          .from('screening_questions')
          .insert(questionsPayload)

        if (qErr) throw qErr
      }

      setSuccessNotice(
        targetStatus === 'active'
          ? 'Job vacancy successfully published to the live portal!'
          : 'Job draft successfully saved.'
      )

      setTimeout(() => {
        navigate('/dashboard/jobs')
      }, 1200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database transaction failed'
      console.error('[VacancyEditorPage] Save error:', msg)
      setErrorMessage(`Failed to save vacancy: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-gray-500">
        <Loader2 size={28} className="animate-spin text-[#5C00DD] mx-auto mb-3" />
        <p className="text-sm font-medium">Loading requisition editor...</p>
      </div>
    )
  }

  const isEditing = Boolean(id)

  return (
    <div className="p-8 max-w-[1440px] mx-auto flex flex-col gap-6">
      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-start gap-3 shadow-xs animate-in fade-in"
        >
          <CircleAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-900">Validation or Save Error</p>
            <p className="mt-0.5 text-red-700">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Success Notice */}
      {successNotice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{successNotice}</span>
          </div>
        </div>
      )}

      {/* 1. Header Card matching Jobs-1.png */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col gap-4">
        {/* Back Link */}
        <div>
          <Link
            to="/dashboard/jobs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </Link>
        </div>

        {/* Title, Badges & Top Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">
              {form.title || (isEditing ? 'Untitled Requisition' : 'New Job Requisition')}
            </h1>

            {/* Badges Row matching Figma */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                {form.slug || 'JT-010'}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                {form.location || 'Lagos, Nigeria'}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                {form.employment_type}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-semibold capitalize border ${
                  form.status === 'active'
                    ? 'bg-[#F0FDF4] text-[#15803D] border-[#86EFAC]/50'
                    : form.status === 'draft'
                    ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]/60'
                    : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]/50'
                }`}
              >
                {form.status}
              </span>
              <span className="text-xs text-gray-400 ml-1">
                · {isEditing ? 'Last edited recently' : 'Draft in progress'}
              </span>
            </div>
          </div>

          {/* Action Buttons matching Jobs-1.png top right */}
          <div className="flex flex-wrap items-center gap-3">
            {form.slug && (
              <a
                href={`/jobs/${form.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors shadow-xs"
              >
                <ExternalLink size={14} />
                <span>Preview as applicant</span>
              </a>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave('draft')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>Save as draft</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave('active')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5C00DD] hover:bg-[#4A00B4] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span>{form.status === 'active' ? 'Save Changes' : 'Publish Vacancy'}</span>
            </button>
          </div>
        </div>

        {/* Step Tabs matching Jobs-1.png, Jobs-2.png, Jobs-3.png */}
        <div className="border-t border-gray-100 -mx-6 px-6 pt-3 flex items-center gap-8 text-sm font-semibold select-none mt-2">
          <button
            type="button"
            onClick={() => setActiveTab('job')}
            className={`pb-3 relative transition-colors cursor-pointer ${
              activeTab === 'job'
                ? 'text-[#5C00DD] font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>Job Details</span>
            {activeTab === 'job' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5C00DD] rounded-t-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-3 relative transition-colors cursor-pointer ${
              activeTab === 'details'
                ? 'text-[#5C00DD] font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>Details</span>
            {activeTab === 'details' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5C00DD] rounded-t-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('screening')}
            className={`pb-3 relative transition-colors cursor-pointer ${
              activeTab === 'screening'
                ? 'text-[#5C00DD] font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>Screening Question</span>
            {questions.length > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                {questions.length}
              </span>
            )}
            {activeTab === 'screening' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5C00DD] rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Two-Column Layout matching Figma */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Forms for Step 1, 2, or 3) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* STEP 1: JOB DETAILS (Jobs-1.png) */}
          {activeTab === 'job' && (
            <>
              {/* Card 1: Job Identity & Categorization */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col gap-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => updateField('title', e.target.value)}
                    placeholder="e.g. Brand, Communications & Marketing Manager"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] placeholder:text-gray-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Job Code / Reference
                    </label>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={e => updateField('slug', e.target.value)}
                      placeholder="e.g. brand-communications-manager"
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] placeholder:text-gray-400 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Department
                    </label>
                    <input
                      type="text"
                      value={form.department}
                      onChange={e => updateField('department', e.target.value)}
                      placeholder="e.g. Marketing, Operations, Product"
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Employment Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.employment_type}
                      onChange={e => updateField('employment_type', e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] cursor-pointer"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Workplace Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.workplace_type}
                      onChange={e => updateField('workplace_type', e.target.value as WorkplaceType)}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] cursor-pointer"
                    >
                      <option value="onsite">Onsite</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="remote">Remote</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => updateField('location', e.target.value)}
                    placeholder="e.g. Lagos, Nigeria"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Card 2: Compensation */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col gap-4">
                <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                  Compensation
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Salary Min
                    </label>
                    <input
                      type="number"
                      value={form.compensation_min}
                      onChange={e => updateField('compensation_min', e.target.value)}
                      placeholder="e.g. 500000"
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Salary Max
                    </label>
                    <input
                      type="number"
                      value={form.compensation_max}
                      onChange={e => updateField('compensation_max', e.target.value)}
                      placeholder="e.g. 900000"
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Currency
                    </label>
                    <select
                      value={form.compensation_currency}
                      onChange={e => updateField('compensation_currency', e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] cursor-pointer"
                    >
                      <option value="NGN">NGN (₦)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 text-xs text-gray-600 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={form.show_salary_public}
                    onChange={e => updateField('show_salary_public', e.target.checked)}
                    className="rounded border-gray-300 text-[#5C00DD] focus:ring-[#5C00DD]"
                  />
                  <span>Show salary range on the public job board</span>
                </label>
              </div>

              {/* Card 3: Timeline */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col gap-4">
                <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
                  Timeline
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Posted / Start Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={form.start_date}
                        onChange={e => updateField('start_date', e.target.value)}
                        className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Application Deadline
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={form.deadline}
                        onChange={e => updateField('deadline', e.target.value)}
                        className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD]"
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 text-xs text-gray-600 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={form.auto_close_deadline}
                    onChange={e => updateField('auto_close_deadline', e.target.checked)}
                    className="rounded border-gray-300 text-[#5C00DD] focus:ring-[#5C00DD]"
                  />
                  <span>Auto-close job when deadline passes</span>
                </label>
              </div>

              {/* Card 4: Skills matching Jobs-1.png */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-900">Skills</h2>
                  <span className="text-[11px] text-gray-400">Press Enter or comma to add a tag</span>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded-xl flex flex-wrap items-center gap-2 focus-within:ring-2 focus-within:ring-[#5C00DD] focus-within:border-transparent">
                  {form.skills.map(skill => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#F3EBFD] text-[#5C00DD] border border-[#5C00DD]/20"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-[#5C00DD]/70 hover:text-[#5C00DD] cursor-pointer"
                        aria-label={`Remove ${skill}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}

                  <input
                    type="text"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    placeholder={form.skills.length === 0 ? 'Type a skill and press Enter...' : ''}
                    className="flex-1 min-w-[140px] text-xs bg-transparent border-0 focus:outline-none py-1 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </>
          )}

          {/* STEP 2: DETAILS / JOB DESCRIPTION (Jobs-2.png) */}
          {activeTab === 'details' && (
            <>
              {/* Card 1: Job Description */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col gap-3">
                <h2 className="text-sm font-bold text-gray-900">
                  Job Description <span className="text-red-500">*</span>
                </h2>

                <div className="rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-[#5C00DD] focus-within:border-transparent">
                  {/* Visual Formatting Toolbar matching Jobs-2.png */}
                  <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-1">
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Bold">
                      <Bold size={14} />
                    </button>
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Italic">
                      <Italic size={14} />
                    </button>
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Underline">
                      <Underline size={14} />
                    </button>
                    <span className="w-px h-4 bg-gray-300 mx-1" />
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Bullet List">
                      <List size={14} />
                    </button>
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Numbered List">
                      <ListOrdered size={14} />
                    </button>
                  </div>

                  <textarea
                    rows={6}
                    value={form.description}
                    onChange={e => updateField('description', e.target.value)}
                    placeholder="Provide a comprehensive summary of the role, responsibilities, and team context..."
                    className="w-full p-4 text-sm text-gray-800 placeholder:text-gray-400 border-0 focus:outline-none resize-y leading-relaxed"
                  />
                </div>
              </div>

              {/* Card 2: Qualification / Requirements */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col gap-3">
                <h2 className="text-sm font-bold text-gray-900">
                  Qualification & Requirements <span className="text-red-500">*</span>
                </h2>

                <div className="rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-[#5C00DD] focus-within:border-transparent">
                  <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-1">
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Bold">
                      <Bold size={14} />
                    </button>
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Italic">
                      <Italic size={14} />
                    </button>
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Underline">
                      <Underline size={14} />
                    </button>
                    <span className="w-px h-4 bg-gray-300 mx-1" />
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Bullet List">
                      <List size={14} />
                    </button>
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Numbered List">
                      <ListOrdered size={14} />
                    </button>
                  </div>

                  <textarea
                    rows={5}
                    value={form.requirements}
                    onChange={e => updateField('requirements', e.target.value)}
                    placeholder="• Minimum 5 years of relevant industry experience&#10;• Proven leadership track record..."
                    className="w-full p-4 text-sm text-gray-800 placeholder:text-gray-400 border-0 focus:outline-none resize-y leading-relaxed"
                  />
                </div>
              </div>

              {/* Card 3: Benefit */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col gap-3">
                <h2 className="text-sm font-bold text-gray-900">Benefits & Perks</h2>

                <div className="rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-[#5C00DD] focus-within:border-transparent">
                  <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center gap-1">
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Bold">
                      <Bold size={14} />
                    </button>
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Italic">
                      <Italic size={14} />
                    </button>
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Underline">
                      <Underline size={14} />
                    </button>
                    <span className="w-px h-4 bg-gray-300 mx-1" />
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Bullet List">
                      <List size={14} />
                    </button>
                    <button type="button" className="p-1.5 text-gray-600 hover:bg-gray-200 rounded" title="Numbered List">
                      <ListOrdered size={14} />
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={form.benefits}
                    onChange={e => updateField('benefits', e.target.value)}
                    placeholder="• Comprehensive Health insurance (HMO)&#10;• Hybrid work flexibility&#10;• Annual professional learning budget"
                    className="w-full p-4 text-sm text-gray-800 placeholder:text-gray-400 border-0 focus:outline-none resize-y leading-relaxed"
                  />
                </div>
              </div>
            </>
          )}

          {/* STEP 3: SCREENING QUESTIONS (Jobs-3.png) */}
          {activeTab === 'screening' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900">
                  Screening questions ({questions.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setIsAddingQuestion(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#5C00DD] text-white hover:bg-[#4A00B4] transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Question</span>
                </button>
              </div>

              {/* Add Question Inline Card */}
              {isAddingQuestion && (
                <div className="p-4 rounded-xl border border-[#5C00DD]/30 bg-[#F3EBFD]/30 flex flex-col gap-3 animate-in fade-in">
                  <span className="text-xs font-bold text-[#5C00DD]">New Screening Question</span>
                  <input
                    type="text"
                    value={newQuestionLabel}
                    onChange={e => setNewQuestionLabel(e.target.value)}
                    placeholder="e.g. Do you have a valid certification from the Chartered Institute?"
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C00DD]"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Question Type
                      </label>
                      <select
                        value={newQuestionType}
                        onChange={e => setNewQuestionType(e.target.value as QuestionType)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C00DD]"
                      >
                        <option value="yes_no">Yes / No</option>
                        <option value="text">Open ended (Text)</option>
                        <option value="single_select">Multiple choice (Single select)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newQuestionRequired}
                          onChange={e => setNewQuestionRequired(e.target.checked)}
                          className="rounded border-gray-300 text-[#5C00DD] focus:ring-[#5C00DD]"
                        />
                        <span>Candidate response is required</span>
                      </label>
                    </div>
                  </div>

                  {newQuestionType === 'single_select' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                        Options (separated by commas)
                      </label>
                      <input
                        type="text"
                        value={newQuestionOptions}
                        onChange={e => setNewQuestionOptions(e.target.value)}
                        placeholder="Option A, Option B, Option C"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C00DD]"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-100">
                    <button
                      type="button"
                      onClick={() => setIsAddingQuestion(false)}
                      className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmAddQuestion}
                      disabled={!newQuestionLabel.trim()}
                      className="px-4 py-1.5 rounded-lg bg-[#5C00DD] text-white text-xs font-semibold hover:bg-[#4A00B4] disabled:opacity-50"
                    >
                      Add Question
                    </button>
                  </div>
                </div>
              )}

              {/* Questions List matching Jobs-3.png */}
              <div className="space-y-3">
                {questions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400">
                    <p className="text-sm font-semibold text-gray-700">No screening questions attached</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Add role-specific qualification questions to pre-screen candidates during application.
                    </p>
                  </div>
                ) : (
                  questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs flex items-start gap-3 hover:border-gray-300 transition-colors"
                    >
                      <div className="text-gray-300 pt-1 cursor-grab">
                        <GripVertical size={16} />
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">
                          {q.label}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              q.type === 'yes_no'
                                ? 'bg-[#F3EBFD] text-[#5C00DD] border-[#5C00DD]/20'
                                : q.type === 'text'
                                ? 'bg-[#FDF2F8] text-[#BE185D] border-[#F472B6]/40'
                                : 'bg-[#FFF7ED] text-[#C2410C] border-[#FDBA74]/40'
                            }`}
                          >
                            {q.type === 'yes_no'
                              ? 'Yes/No'
                              : q.type === 'text'
                              ? 'Open ended'
                              : 'Multiple choice'}
                          </span>

                          {q.required && (
                            <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Required
                            </span>
                          )}

                          {q.type === 'single_select' && q.options && q.options.length > 0 && (
                            <span className="text-xs text-gray-500">
                              ({q.options.join(', ')})
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-gray-400 hover:text-red-600 p-1.5 rounded transition-colors"
                        title="Delete question"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add more questions button matching Jobs-3.png */}
              {!isAddingQuestion && (
                <button
                  type="button"
                  onClick={() => setIsAddingQuestion(true)}
                  className="w-full py-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2"
                >
                  <Plus size={15} />
                  <span>+ Add more questions</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Column (Sidebar Cards matching Jobs-1.png, Jobs-2.png, Jobs-3.png) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Card 1: Status Radio Options */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Requisition Status
            </h2>

            <div className="flex flex-col gap-2">
              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  form.status === 'active'
                    ? 'border-[#5C00DD] bg-[#F3EBFD]/30'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="vacancyStatus"
                    value="active"
                    checked={form.status === 'active'}
                    onChange={() => updateField('status', 'active')}
                    className="text-[#5C00DD] focus:ring-[#5C00DD]"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Active</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">accepting applications on public portal</p>
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  form.status === 'draft'
                    ? 'border-[#5C00DD] bg-[#F3EBFD]/30'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="vacancyStatus"
                    value="draft"
                    checked={form.status === 'draft'}
                    onChange={() => updateField('status', 'draft')}
                    className="text-[#5C00DD] focus:ring-[#5C00DD]"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Draft</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">hidden from public portal</p>
                  </div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                  form.status === 'closed'
                    ? 'border-[#5C00DD] bg-[#F3EBFD]/30'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="vacancyStatus"
                    value="closed"
                    checked={form.status === 'closed'}
                    onChange={() => updateField('status', 'closed')}
                    className="text-[#5C00DD] focus:ring-[#5C00DD]"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Closed</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">applications closed</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Card 2: Recruiter Info matching Jobs-1.png */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Recruiter
            </h2>

            <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/70 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#5C00DD] text-white font-bold text-xs flex items-center justify-center shrink-0">
                SW
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">
                  {session?.user?.email?.split('@')[0] || 'Serena Williams'}
                </p>
                <p className="text-[11px] text-gray-500">Recruitment Lead</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert('Co-recruiter assignment is managed through organization permissions.')}
              className="w-full py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Add co-recruiter
            </button>
          </div>

          {/* Card 3: Pipeline Stage matching Jobs-1.png */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Pipeline Stage
              </h2>
              <span className="text-xs font-bold text-[#5C00DD] cursor-pointer">+ Add</span>
            </div>

            <div className="space-y-2">
              {[
                { name: 'Screening', dot: 'bg-[#5C00DD]' },
                { name: 'Review', dot: 'bg-[#BE185D]' },
                { name: 'Interview', dot: 'bg-[#C2410C]' },
                { name: 'Rejected', dot: 'bg-[#DC2626]' },
                { name: 'Offer', dot: 'bg-[#059669]' },
                { name: 'Hired', dot: 'bg-[#15803D]' },
              ].map(st => (
                <div
                  key={st.name}
                  className="p-2.5 rounded-xl border border-gray-200 bg-white flex items-center gap-2.5 text-xs font-medium text-gray-800"
                >
                  <GripVertical size={14} className="text-gray-300" />
                  <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                  <span>{st.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
