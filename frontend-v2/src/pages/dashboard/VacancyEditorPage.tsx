import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  GripVertical,
  Info,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { parseQuestionOptions, vacancyDraftSchema, vacancySchema } from '../../lib/validation'
import { RichTextEditor } from '../../components/ui/RichTextEditor'
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

/**
 * Extracts individual perk/benefit items from HTML or plain lines
 * for PostgreSQL text[] storage.
 */
function parseBenefitsHtmlOrLines(raw: string): string[] {
  if (!raw) return []
  const liMatches = Array.from(raw.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map(m => m[1].trim())
    .filter(Boolean)
  if (liMatches.length > 0) return liMatches

  const pMatches = Array.from(raw.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map(m => m[1].trim())
    .filter(Boolean)
  if (pMatches.length > 0) return pMatches

  return raw.split('\n').map(b => b.trim()).filter(Boolean)
}

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
  const [deletedQuestionIds, setDeletedQuestionIds] = useState<string[]>([])
  const [referencedQuestionIds, setReferencedQuestionIds] = useState<Set<string>>(new Set())
  const [applicationCount, setApplicationCount] = useState<number>(0)
  const [skillInput, setSkillInput] = useState<string>('')

  // Reusable Question Form state (for both Add and Edit)
  const [isAddingQuestion, setIsAddingQuestion] = useState<boolean>(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formQuestionLabel, setFormQuestionLabel] = useState<string>('')
  const [formQuestionType, setFormQuestionType] = useState<QuestionType>('yes_no')
  const [formQuestionOptions, setFormQuestionOptions] = useState<string>('')
  const [formQuestionRequired, setFormQuestionRequired] = useState<boolean>(true)

  // Status & loading states
  const [loading, setLoading] = useState<boolean>(Boolean(id || searchParams.get('template')))
  const [saving, setSaving] = useState<boolean>(false)
  const [unauthorized, setUnauthorized] = useState<boolean>(false)
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

        const isFixture = searchParams.get('fixture') === 'true' || id.startsWith('v-')

        if (isFixture) {
          // Dev fixture sample data
          setForm({
            ...INITIAL_FORM,
            title: id === 'v-1' ? 'Senior Project Manager' : 'Brand, Communications & Marketing Manager',
            slug: id === 'v-1' ? 'senior-project-manager' : 'brand-communications-marketing-manager',
            client_name: 'TPP Hire',
            department: id === 'v-1' ? 'Operations' : 'Marketing',
            location: 'Lagos, Nigeria',
            employment_type: 'Full-time',
            workplace_type: id === 'v-1' ? 'hybrid' : 'onsite',
            description: id === 'v-1'
              ? '<p>Lead strategic operational initiatives across client engagements.</p>'
              : '<p>Architect brand messaging, PR campaigns, and omni-channel growth.</p>',
            requirements: '<p>Minimum 5 years of relevant industry leadership experience.</p>',
            benefits: '<ul><li>Comprehensive Health insurance (HMO)</li><li>Hybrid work flexibility</li><li>Annual learning stipend</li></ul>',
            status: 'active',
          })

          const sampleQuestions: EditableQuestion[] = [
            {
              id: `${id}-q1`,
              label: 'Are you currently authorized to work in this location?',
              type: 'yes_no',
              required: true,
              options: [],
              sort_order: 0,
            },
            {
              id: `${id}-q2`,
              label: 'How many years of relevant professional experience do you have?',
              type: 'text',
              required: true,
              options: [],
              sort_order: 1,
            },
            {
              id: `${id}-q3`,
              label: 'What is your preferred work arrangement?',
              type: 'single_select',
              required: false,
              options: ['On-site in Lagos', 'Hybrid (2 days remote)', 'Fully remote'],
              sort_order: 2,
            },
          ]
          setQuestions(sampleQuestions)

          if (id === 'v-1') {
            setApplicationCount(10)
            setReferencedQuestionIds(new Set([`${id}-q1`, `${id}-q2`]))
          } else {
            setApplicationCount(0)
            setReferencedQuestionIds(new Set())
          }
          setLoading(false)
          return
        }

        try {
          const [vacRes, appRes] = await Promise.all([
            supabase
              .from('vacancies')
              .select('*, screening_questions(*)')
              .eq('id', id)
              .single(),
            supabase
              .from('applications')
              .select('id, answers')
              .eq('vacancy_id', id),
          ])

          if (vacRes.error) throw vacRes.error
          const data = vacRes.data

          if (isMounted && data) {
            // Guard: Only Lead Recruiter or Workspace Admin can edit an existing vacancy
            if (session?.user?.id && !isFixture) {
              const { data: recData } = await supabase
                .from('recruiters')
                .select('role')
                .eq('user_id', session.user.id)
                .maybeSingle()

              const isWorkspaceAdmin = recData?.role === 'admin'
              const isLead = data.lead_recruiter_id === session.user.id
              if (!isWorkspaceAdmin && !isLead) {
                setUnauthorized(true)
                setLoading(false)
                return
              }
            }

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
              benefits:
                Array.isArray(data.benefits) && data.benefits.length > 0
                  ? `<ul>${data.benefits.map((b: string) => `<li>${b}</li>`).join('')}</ul>`
                  : (data.benefits || ''),
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

            if (appRes.data) {
              setApplicationCount(appRes.data.length)
              const referenced = new Set<string>()
              for (const app of appRes.data) {
                if (app.answers && typeof app.answers === 'object') {
                  for (const [key, val] of Object.entries(app.answers)) {
                    if (val !== undefined && val !== null && String(val).trim() !== '') {
                      referenced.add(key)
                    }
                  }
                }
              }
              setReferencedQuestionIds(referenced)
            }
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
              benefits:
                Array.isArray(t.benefits) && t.benefits.length > 0
                  ? `<ul>${t.benefits.map((b: string) => `<li>${b}</li>`).join('')}</ul>`
                  : (t.benefits?.join('\n') || ''),
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

  // Check if a question is referenced by submitted applications
  const isQuestionReferenced = (qId?: string) => Boolean(qId && referencedQuestionIds.has(qId))

  // Open the editor for an existing question
  const handleStartEditQuestion = (idx: number) => {
    const q = questions[idx]
    if (!q) return

    setEditingIndex(idx)
    setIsAddingQuestion(false)
    setFormQuestionLabel(q.label)
    setFormQuestionType(q.type)
    setFormQuestionRequired(q.required)
    setFormQuestionOptions(
      q.options_input ?? (Array.isArray(q.options) ? q.options.join(', ') : '')
    )
    setErrorMessage(null)
  }

  // Open the form to add a new question
  const handleStartAddQuestion = () => {
    setEditingIndex(null)
    setIsAddingQuestion(true)
    setFormQuestionLabel('')
    setFormQuestionType('yes_no')
    setFormQuestionRequired(true)
    setFormQuestionOptions('')
    setErrorMessage(null)
  }

  // Cancel edit or add
  const handleCancelQuestionForm = () => {
    setEditingIndex(null)
    setIsAddingQuestion(false)
    setFormQuestionLabel('')
    setFormQuestionType('yes_no')
    setFormQuestionRequired(true)
    setFormQuestionOptions('')
  }

  // Save changes from the question form (handles both Add and Edit)
  const handleSaveQuestionForm = () => {
    if (!formQuestionLabel.trim()) {
      setErrorMessage('Screening question prompt cannot be empty.')
      return
    }

    const parsedOpts =
      formQuestionType === 'single_select' ? parseQuestionOptions(formQuestionOptions) : []

    if (formQuestionType === 'single_select' && parsedOpts.length < 2) {
      setErrorMessage('Single-select questions must contain at least two comma-separated options.')
      return
    }

    if (editingIndex !== null) {
      const currentQ = questions[editingIndex]
      const isRef = isQuestionReferenced(currentQ?.id)

      // Substantive edit protection for questions referenced by submitted applications
      if (isRef) {
        if (
          formQuestionLabel.trim() !== currentQ.label.trim() ||
          formQuestionType !== currentQ.type
        ) {
          setErrorMessage(
            'Substantive edits to question prompt or type are locked because candidates have already submitted applications answering this question.'
          )
          return
        }
      }

      setQuestions(prev =>
        prev.map((item, i) =>
          i === editingIndex
            ? {
                ...item,
                label: formQuestionLabel.trim(),
                type: formQuestionType,
                required: formQuestionRequired,
                options: parsedOpts,
                options_input: formQuestionOptions,
              }
            : item
        )
      )
    } else {
      // Adding a new question
      const newQ: EditableQuestion = {
        label: formQuestionLabel.trim(),
        type: formQuestionType,
        required: formQuestionRequired,
        options: parsedOpts,
        options_input: formQuestionOptions,
        sort_order: questions.length,
      }
      setQuestions(prev => [...prev, newQ])
    }

    handleCancelQuestionForm()
  }

  // Delete question
  const handleRemoveQuestion = (idx: number) => {
    const q = questions[idx]
    if (q.id && isQuestionReferenced(q.id)) {
      setErrorMessage(
        `Cannot delete question "${q.label}": candidate applications have already been submitted referencing this question.`
      )
      return
    }

    if (q.id) {
      setDeletedQuestionIds(prev => [...prev, q.id!])
    }

    setQuestions(prev =>
      prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, sort_order: i }))
    )

    if (editingIndex === idx) {
      handleCancelQuestionForm()
    } else if (editingIndex !== null && editingIndex > idx) {
      setEditingIndex(editingIndex - 1)
    }
  }

  // Reordering helper
  const handleMoveQuestion = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= questions.length) return
    setQuestions(prev => {
      const copy = [...prev]
      const [moved] = copy.splice(fromIdx, 1)
      copy.splice(toIdx, 0, moved)
      return copy.map((item, i) => ({ ...item, sort_order: i }))
    })

    if (editingIndex === fromIdx) {
      setEditingIndex(toIdx)
    } else if (editingIndex === toIdx) {
      setEditingIndex(fromIdx)
    }
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
      benefits: parseBenefitsHtmlOrLines(form.benefits),
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
      id: item.id,
      vacancy_id: id || item.vacancy_id,
      label: item.label.trim(),
      type: item.type,
      required: item.required,
      options:
        item.type === 'single_select'
          ? parseQuestionOptions(
              item.options_input ?? (Array.isArray(item.options) ? item.options.join(', ') : '')
            )
          : [],
      sort_order: idx,
    }))

    const invalidQuestion = readyQuestions.find(
      q => !q.label || (q.type === 'single_select' && q.options.length < 2)
    )

    if (invalidQuestion) {
      setActiveTab('screening')
      setErrorMessage(
        !invalidQuestion.label
          ? 'Each screening question must have a non-empty question prompt.'
          : 'Single-select screening questions must include at least two options.'
      )
      return
    }

    setSaving(true)

    try {
      const isFixture = searchParams.get('fixture') === 'true' || id?.startsWith('v-')

      if (isFixture) {
        setSuccessNotice(
          targetStatus === 'active'
            ? '[Fixture] Job vacancy successfully published to the live portal!'
            : '[Fixture] Job draft successfully saved.'
        )
        setTimeout(() => {
          navigate('/dashboard/jobs?fixture=true')
        }, 1200)
        return
      }

      let vacancyId = id

      if (id) {
        // 1. Update existing vacancy
        const { error: updateErr } = await supabase
          .from('vacancies')
          .update(validationResult.data)
          .eq('id', id)

        if (updateErr) throw updateErr

        // 2. Handle screening questions:
        // A. Delete removed questions
        if (deletedQuestionIds.length > 0) {
          const blockedDel = deletedQuestionIds.find(delId => referencedQuestionIds.has(delId))
          if (blockedDel) {
            throw new Error('Cannot delete questions that have submitted candidate applications.')
          }

          const { error: delErr } = await supabase
            .from('screening_questions')
            .delete()
            .in('id', deletedQuestionIds)
            .eq('vacancy_id', id)

          if (delErr) throw delErr
        }

        // B. Separate remaining questions: toUpdate (have existing DB ID) vs toInsert (newly added)
        const toUpdate = readyQuestions.filter(q => q.id)
        const toInsert = readyQuestions.filter(q => !q.id)

        // C. Update existing questions by ID
        // Offset sort_orders to temporary non-colliding values first if multiple to avoid unique(vacancy_id, sort_order) conflicts
        if (toUpdate.length > 1) {
          for (let i = 0; i < toUpdate.length; i++) {
            const { error: tempErr } = await supabase
              .from('screening_questions')
              .update({ sort_order: 10000 + i })
              .eq('id', toUpdate[i].id)

            if (tempErr) throw tempErr
          }
        }

        for (const q of toUpdate) {
          const { error: updErr } = await supabase
            .from('screening_questions')
            .update({
              label: q.label,
              type: q.type,
              required: q.required,
              options: q.options,
              sort_order: q.sort_order,
            })
            .eq('id', q.id)

          if (updErr) throw updErr
        }

        // D. Insert newly added questions
        if (toInsert.length > 0) {
          const { error: insErr } = await supabase
            .from('screening_questions')
            .insert(
              toInsert.map(q => ({
                vacancy_id: id,
                label: q.label,
                type: q.type,
                required: q.required,
                options: q.options,
                sort_order: q.sort_order,
              }))
            )

          if (insErr) throw insErr
        }
      } else {
        // Insert new vacancy
        const insertPayload: Record<string, unknown> = {
          ...validationResult.data,
        }
        if (session?.user?.id) {
          insertPayload.created_by = session.user.id
          insertPayload.lead_recruiter_id = session.user.id
        }

        const { data: inserted, error: insertErr } = await supabase
          .from('vacancies')
          .insert(insertPayload)
          .select('id')
          .single()

        if (insertErr) throw insertErr
        vacancyId = inserted.id

        // Insert questions
        if (readyQuestions.length > 0 && vacancyId) {
          const { error: qErr } = await supabase
            .from('screening_questions')
            .insert(
              readyQuestions.map(q => ({
                vacancy_id: vacancyId,
                label: q.label,
                type: q.type,
                required: q.required,
                options: q.options,
                sort_order: q.sort_order,
              }))
            )

          if (qErr) throw qErr
        }
      }

      setDeletedQuestionIds([])
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

  if (unauthorized) {
    return (
      <div className="p-12 max-w-[640px] mx-auto min-h-[400px] flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
          <ShieldAlert size={28} />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Permission Restricted</h1>
        <p className="text-sm text-gray-600 mt-2 max-w-md">
          Only the designated Lead Recruiter or a Workspace Administrator has permission to edit this vacancy's details, requirements, and screening questions.
        </p>
        <Link
          to={`/dashboard/jobs/${id}`}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5C00DD] text-white text-sm font-semibold hover:bg-[#4900B0] transition-colors shadow-xs"
        >
          <ArrowLeft size={16} />
          <span>Return to Job Details</span>
        </Link>
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

                <RichTextEditor
                  content={form.description}
                  onChange={val => updateField('description', val)}
                  placeholder="Provide a comprehensive summary of the role, responsibilities, and team context..."
                  minHeight="160px"
                />
              </div>

              {/* Card 2: Qualification / Requirements */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col gap-3">
                <h2 className="text-sm font-bold text-gray-900">
                  Qualification & Requirements <span className="text-red-500">*</span>
                </h2>

                <RichTextEditor
                  content={form.requirements}
                  onChange={val => updateField('requirements', val)}
                  placeholder="• Minimum 5 years of relevant industry experience&#10;• Proven leadership track record..."
                  minHeight="140px"
                />
              </div>

              {/* Card 3: Benefit */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col gap-3">
                <h2 className="text-sm font-bold text-gray-900">Benefits & Perks</h2>

                <RichTextEditor
                  content={form.benefits}
                  onChange={val => updateField('benefits', val)}
                  placeholder="• Comprehensive Health insurance (HMO)&#10;• Hybrid work flexibility&#10;• Annual professional learning budget"
                  minHeight="120px"
                />
              </div>
            </>
          )}

          {/* STEP 3: SCREENING QUESTIONS (Jobs-3.png) */}
          {activeTab === 'screening' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Screening questions ({questions.length})
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Configure qualification questions presented to candidates during submission.
                  </p>
                </div>
                {!isAddingQuestion && editingIndex === null && (
                  <button
                    type="button"
                    onClick={handleStartAddQuestion}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#5C00DD] text-white hover:bg-[#4A00B4] transition-colors cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Plus size={14} />
                    <span>Add Question</span>
                  </button>
                )}
              </div>

              {/* Add Question Inline Form */}
              {isAddingQuestion && (
                <div className="p-4 rounded-xl border border-[#5C00DD]/40 bg-[#F3EBFD]/20 shadow-xs flex flex-col gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-1 border-b border-purple-100">
                    <span className="text-xs font-bold text-[#5C00DD] uppercase tracking-wider">
                      New Screening Question
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelQuestionForm}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-md"
                      title="Cancel"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Question Prompt <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formQuestionLabel}
                      onChange={e => setFormQuestionLabel(e.target.value)}
                      placeholder="e.g. Do you have a valid certification from the Chartered Institute?"
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C00DD] text-gray-900 placeholder:text-gray-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Question Type
                      </label>
                      <select
                        value={formQuestionType}
                        onChange={e => setFormQuestionType(e.target.value as QuestionType)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C00DD] text-gray-800"
                      >
                        <option value="yes_no">Yes / No</option>
                        <option value="text">Open ended (Text)</option>
                        <option value="single_select">Multiple choice (Single select)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formQuestionRequired}
                          onChange={e => setFormQuestionRequired(e.target.checked)}
                          className="rounded border-gray-300 text-[#5C00DD] focus:ring-[#5C00DD]"
                        />
                        <span>Candidate response is required</span>
                      </label>
                    </div>
                  </div>

                  {formQuestionType === 'single_select' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Options (separated by commas) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formQuestionOptions}
                        onChange={e => setFormQuestionOptions(e.target.value)}
                        placeholder="Option A, Option B, Option C"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C00DD] text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-100">
                    <button
                      type="button"
                      onClick={handleCancelQuestionForm}
                      className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveQuestionForm}
                      disabled={!formQuestionLabel.trim()}
                      className="px-4 py-1.5 rounded-lg bg-[#5C00DD] text-white text-xs font-semibold hover:bg-[#4A00B4] disabled:opacity-50 cursor-pointer transition-colors shadow-xs"
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
                  questions.map((q, idx) => {
                    const isEditingThis = editingIndex === idx
                    const isRef = isQuestionReferenced(q.id)

                    if (isEditingThis) {
                      return (
                        <div
                          key={q.id || `edit-${idx}`}
                          className="p-4 rounded-xl border border-[#5C00DD]/40 bg-[#F3EBFD]/20 shadow-xs flex flex-col gap-3 animate-in fade-in duration-150"
                        >
                          <div className="flex items-center justify-between pb-1 border-b border-purple-100">
                            <div className="flex items-center gap-2">
                              <Pencil size={14} className="text-[#5C00DD]" />
                              <span className="text-xs font-bold text-[#5C00DD] uppercase tracking-wider">
                                Edit Screening Question #{idx + 1}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleCancelQuestionForm}
                              className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-md"
                              title="Cancel editing"
                            >
                              <X size={15} />
                            </button>
                          </div>

                          {/* Historical response warning if referenced */}
                          {isRef && (
                            <div className="rounded-xl bg-amber-50 border border-amber-200/90 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                              <AlertCircle size={17} className="text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold text-amber-900">Historical Candidate Response Protection</p>
                                <p className="mt-0.5 text-amber-700 leading-relaxed">
                                  Candidate applications have already been submitted answering this question. Question text and question type cannot be substantively altered to preserve historical application records.
                                </p>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                              Question Prompt {isRef && <span className="text-amber-600 font-normal">(Locked to preserve responses)</span>}
                            </label>
                            <input
                              type="text"
                              value={formQuestionLabel}
                              onChange={e => setFormQuestionLabel(e.target.value)}
                              disabled={isRef}
                              placeholder="e.g. Do you have a valid certification from the Chartered Institute?"
                              className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C00DD] ${
                                isRef
                                  ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                                  : 'bg-white border-gray-200 text-gray-900'
                              }`}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                Question Type {isRef && <span className="text-amber-600 font-normal">(Locked)</span>}
                              </label>
                              <select
                                value={formQuestionType}
                                onChange={e => setFormQuestionType(e.target.value as QuestionType)}
                                disabled={isRef}
                                className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C00DD] ${
                                  isRef
                                    ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                                    : 'bg-white border-gray-200 text-gray-900'
                                }`}
                              >
                                <option value="yes_no">Yes / No</option>
                                <option value="text">Open ended (Text)</option>
                                <option value="single_select">Multiple choice (Single select)</option>
                              </select>
                            </div>

                            <div className="flex items-center pt-5">
                              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={formQuestionRequired}
                                  onChange={e => setFormQuestionRequired(e.target.checked)}
                                  className="rounded border-gray-300 text-[#5C00DD] focus:ring-[#5C00DD]"
                                />
                                <span>Candidate response is required</span>
                              </label>
                            </div>
                          </div>

                          {formQuestionType === 'single_select' && (
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                Options (separated by commas) {isRef && <span className="text-amber-600 font-normal">(Locked)</span>}
                              </label>
                              <input
                                type="text"
                                value={formQuestionOptions}
                                onChange={e => setFormQuestionOptions(e.target.value)}
                                disabled={isRef}
                                placeholder="Option A, Option B, Option C"
                                className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5C00DD] ${
                                  isRef
                                    ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                                    : 'bg-white border-gray-200 text-gray-900'
                                }`}
                              />
                            </div>
                          )}

                          {/* Ordering controls within the editor */}
                          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-purple-100/60">
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-500">Position:</span>
                              <span className="font-semibold text-gray-800">
                                Question {idx + 1} of {questions.length}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveQuestion(idx, idx - 1)}
                                className="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-700 hover:bg-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 transition-colors"
                                title="Move earlier"
                              >
                                <ChevronUp size={13} />
                                <span>Move up</span>
                              </button>
                              <button
                                type="button"
                                disabled={idx === questions.length - 1}
                                onClick={() => handleMoveQuestion(idx, idx + 1)}
                                className="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-700 hover:bg-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer flex items-center gap-1 transition-colors"
                                title="Move down"
                              >
                                <ChevronDown size={13} />
                                <span>Move down</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-100/60">
                            <button
                              type="button"
                              onClick={handleCancelQuestionForm}
                              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveQuestionForm}
                              disabled={!formQuestionLabel.trim()}
                              className="px-4 py-1.5 rounded-lg bg-[#5C00DD] text-white text-xs font-semibold hover:bg-[#4A00B4] disabled:opacity-50 cursor-pointer transition-colors shadow-xs"
                            >
                              Update Question
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={q.id || idx}
                        onClick={() => handleStartEditQuestion(idx)}
                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs flex items-start gap-3 hover:border-[#5C00DD]/40 hover:bg-[#F3EBFD]/5 transition-all cursor-pointer group"
                      >
                        {/* Drag Handle & Ordering Arrows */}
                        <div
                          className="flex items-center gap-1 text-gray-300 pt-0.5"
                          onClick={e => e.stopPropagation()}
                        >
                          <span className="cursor-grab text-gray-300 group-hover:text-gray-400">
                            <GripVertical size={16} />
                          </span>
                          <div className="flex flex-col gap-0.5 ml-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveQuestion(idx, idx - 1)}
                              className="text-gray-300 hover:text-[#5C00DD] disabled:opacity-15 cursor-pointer p-0.5"
                              title="Move earlier"
                            >
                              <ChevronUp size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === questions.length - 1}
                              onClick={() => handleMoveQuestion(idx, idx + 1)}
                              className="text-gray-300 hover:text-[#5C00DD] disabled:opacity-15 cursor-pointer p-0.5"
                              title="Move later"
                            >
                              <ChevronDown size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Question details */}
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-[#5C00DD] transition-colors">
                            {q.label}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 mt-2">
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

                            {isRef && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                <Lock size={11} />
                                <span>Locked · responses submitted</span>
                              </span>
                            )}

                            {q.type === 'single_select' && q.options && q.options.length > 0 && (
                              <span className="text-xs text-gray-500">
                                ({q.options.join(', ')})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions: Edit and Delete buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation()
                              handleStartEditQuestion(idx)
                            }}
                            className="text-gray-400 hover:text-[#5C00DD] hover:bg-[#F3EBFD] p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Edit question"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            disabled={isRef}
                            onClick={e => {
                              e.stopPropagation()
                              handleRemoveQuestion(idx)
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isRef
                                ? 'text-gray-300 cursor-not-allowed opacity-40'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                            }`}
                            title={
                              isRef
                                ? 'Cannot delete question with submitted applicant responses'
                                : 'Delete question'
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Add more questions button matching Jobs-3.png */}
              {!isAddingQuestion && editingIndex === null && (
                <button
                  type="button"
                  onClick={handleStartAddQuestion}
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
