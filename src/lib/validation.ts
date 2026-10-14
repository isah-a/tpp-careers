import { z } from 'zod'
import type { ScreeningQuestion } from '../types'

export const vacancySchema = z.object({
  title: z.string().trim().min(3), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  client_name: z.string().trim().min(2), description: z.string().trim().min(20), requirements: z.string().trim().min(10),
  location: z.string().trim().min(2), employment_type: z.string().trim().min(2), deadline: z.string().nullable(),
  department: z.string().trim().optional(), workplace_type: z.enum(['onsite','hybrid','remote']),
  compensation_min: z.number().nonnegative().nullable(), compensation_max: z.number().nonnegative().nullable(), compensation_currency: z.string().trim().length(3),
  start_date: z.string().nullable(), skills: z.array(z.string()), benefits: z.array(z.string()), status: z.enum(['draft','active','closed'])
}).refine(data=>data.compensation_min==null||data.compensation_max==null||data.compensation_max>=data.compensation_min,{message:'Maximum compensation must be at least the minimum',path:['compensation_max']})

export const applicationBaseSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter your full name'), email: z.string().email('Enter a valid email'),
  phone: z.string().trim().min(7, 'Enter a valid phone number'), privacy: z.literal(true, { errorMap: () => ({ message: 'Please acknowledge the privacy notice' }) })
})

export function validateAnswers(questions: ScreeningQuestion[], answers: Record<string,string>) {
  const missing = questions.filter(q => q.required && !answers[q.id || String(q.sort_order)]?.trim())
  return missing.length ? `Please answer: ${missing[0].label}` : null
}

export function validateCv(file?: File) {
  if (!file) return 'Please attach your CV'
  if (file.size > 5 * 1024 * 1024) return 'CV must be 5 MB or smaller'
  const valid = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  return valid.includes(file.type) ? null : 'Only PDF and DOCX files are accepted'
}
