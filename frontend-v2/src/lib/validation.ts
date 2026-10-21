import { z } from 'zod'
import type { ScreeningQuestion } from '../types'

const vacancyFields = {
  title: z.string().trim().min(3, 'Job title must be at least 3 characters'),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Public URL slug must use lowercase letters, numbers and hyphens'),
  client_name: z.string().trim().min(2, 'Client name must be at least 2 characters'),
  description: z.string().trim().min(20, 'Description must be at least 20 characters'),
  requirements: z.string().trim().min(10, 'Requirements must be at least 10 characters'),
  location: z.string().trim().min(2, 'Location must be at least 2 characters'),
  employment_type: z.string().trim().min(2, 'Employment type is required'),
  deadline: z.string().nullable(),
  department: z.string().trim().optional(),
  workplace_type: z.enum(['onsite', 'hybrid', 'remote']),
  compensation_min: z.number().nonnegative().nullable(),
  compensation_max: z.number().nonnegative().nullable(),
  compensation_currency: z.string().trim().length(3),
  start_date: z.string().nullable(),
  skills: z.array(z.string()),
  benefits: z.array(z.string()),
  status: z.enum(['draft', 'active', 'closed'])
}

export const vacancySchema = z.object(vacancyFields).refine(
  data => data.compensation_min == null || data.compensation_max == null || data.compensation_max >= data.compensation_min,
  { message: 'Maximum compensation must be at least the minimum', path: ['compensation_max'] }
)

export const vacancyDraftSchema = z.object({
  ...vacancyFields,
  title: z.string().trim().min(1, 'Enter a job title before saving a draft'),
  slug: vacancyFields.slug,
  client_name: z.string(),
  description: z.string(),
  requirements: z.string(),
  location: z.string()
})

export function parseQuestionOptions(raw: string): string[] {
  return raw.split(',').map(value => value.trim()).filter(Boolean)
}

export const applicationBaseSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().trim().min(7, 'Enter a valid phone number'),
  privacy: z.literal(true, { errorMap: () => ({ message: 'Please acknowledge the privacy notice' }) })
})

export function validateAnswers(questions: ScreeningQuestion[], answers: Record<string, string>): string | null {
  const missing = questions.filter(q => q.required && !answers[q.id || String(q.sort_order)]?.trim())
  return missing.length ? `Please answer: ${missing[0].label}` : null
}

export function validateCv(file?: File): string | null {
  if (!file) return 'Please attach your CV'
  if (file.size > 5 * 1024 * 1024) return 'CV must be 5 MB or smaller'
  const valid = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  return valid.includes(file.type) ? null : 'Only PDF and DOCX files are accepted'
}

export const interviewScheduleSchema = z.object({
  application_id: z.string().uuid('Please select an application'),
  scheduled_at: z.string().refine(val => {
    const d = new Date(val)
    return !isNaN(d.getTime()) && d.getTime() > Date.now() - 300000
  }, 'Interview must be scheduled for a future date and time'),
  duration_minutes: z.number().int().min(10, 'Minimum duration is 10 minutes').max(480, 'Maximum duration is 8 hours'),
  timezone: z.string().min(1, 'Timezone is required'),
  format: z.enum(['online', 'phone', 'in_person']),
  location_or_link: z.string().trim().min(1, 'Meeting link or location details are required').max(2000),
  notes: z.string().max(5000).optional(),
  advance_stage: z.boolean().optional(),
})
