import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_CV_BYTES = 5 * 1024 * 1024
const MAX_REQUEST_BYTES = 6 * 1024 * 1024
const MAX_TEXT_ANSWER = 2_000
const MAX_CHOICE_ANSWER = 200
const MAX_TOTAL_ANSWERS = 10_000
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]
const ZIP_CENTRAL_HEADER = 0x02014b50
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const AI_REVIEW_CONSENT_VERSION = '2026-10-13-v1'

type Question = { id: string; type: 'text' | 'yes_no' | 'single_select'; required: boolean; options: unknown }
type TurnstileResult = { success?: boolean; hostname?: string; ['error-codes']?: unknown }

function configuredOrigins() {
  return new Set((Deno.env.get('ALLOWED_FRONTEND_ORIGINS') || '').split(',').map(value => value.trim()).filter(Boolean))
}

export function trustedClientIp(req: Request) {
  const cloudflareIp = req.headers.get('cf-connecting-ip')?.trim()
  if (cloudflareIp) return cloudflareIp
  if (Deno.env.get('ALLOW_LOCAL_IP_FALLBACK') !== 'true') return null
  const origin = req.headers.get('origin')
  if (!origin) return null
  try {
    const hostname = new URL(origin).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1' ? '127.0.0.1' : null
  } catch {
    return null
  }
}

export function corsHeaders(origin: string | null, allowed = configuredOrigins()) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  }
  if (origin && allowed.has(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

function json(body: unknown, status: number, origin: string | null, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(origin), ...extraHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte)
}

export function zipEntryNames(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const decoder = new TextDecoder()
  const names = new Set<string>()
  for (let offset = 0; offset + 46 <= bytes.length; offset++) {
    if (view.getUint32(offset, true) !== ZIP_CENTRAL_HEADER) continue
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const end = offset + 46 + nameLength
    if (end > bytes.length) throw new Error('Malformed ZIP directory')
    const name = decoder.decode(bytes.subarray(offset + 46, end)).replaceAll('\\', '/')
    if (!name || name.startsWith('/') || name.split('/').includes('..')) throw new Error('Unsafe ZIP entry')
    names.add(name)
    offset = end + extraLength + commentLength - 1
  }
  return names
}

export function isStructurallyValidDocx(bytes: Uint8Array) {
  if (bytes.length < 4 || !startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return false
  try {
    const names = zipEntryNames(bytes)
    return names.has('[Content_Types].xml') && names.has('_rels/.rels') && names.has('word/document.xml')
  } catch {
    return false
  }
}

export function validateAnswers(raw: unknown, questions: Question[]) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'Invalid answers'
  const answers = raw as Record<string, unknown>
  if (JSON.stringify(answers).length > MAX_TOTAL_ANSWERS) return 'Screening answers are too long'
  const known = new Map(questions.map(question => [question.id, question]))
  for (const [id, supplied] of Object.entries(answers)) {
    const question = known.get(id)
    if (!question || typeof supplied !== 'string') return 'Invalid screening answer'
    const value = supplied.trim()
    const max = question.type === 'text' ? MAX_TEXT_ANSWER : MAX_CHOICE_ANSWER
    if (value.length > max) return 'Screening answer is too long'
    if (question.type === 'yes_no' && value && !['Yes', 'No'].includes(value)) return 'Invalid screening answer'
    if (question.type === 'single_select') {
      if (!Array.isArray(question.options) || !question.options.every(option => typeof option === 'string')) return 'Invalid question configuration'
      if (value && !(question.options as string[]).includes(value)) return 'Invalid screening answer'
    }
  }
  for (const question of questions) {
    const supplied = answers[question.id]
    const value = typeof supplied === 'string' ? supplied.trim() : ''
    if (question.required && !value) return 'A required screening answer is missing'
  }
  return null
}

async function readBody(req: Request) {
  const declared = Number(req.headers.get('content-length') || 0)
  if (declared > MAX_REQUEST_BYTES) throw new RangeError('Request too large')
  if (!req.body) throw new TypeError('Missing request body')
  const reader = req.body.getReader(); const chunks: Uint8Array[] = []; let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_REQUEST_BYTES) { await reader.cancel(); throw new RangeError('Request too large') }
    chunks.push(value)
  }
  const body = new Uint8Array(total); let offset = 0
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
  return body
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function fixedWindowRetryAfter(nowEpochSeconds: number, windowSeconds: number) {
  return Math.max(1, Math.ceil(windowSeconds - (nowEpochSeconds % windowSeconds)))
}

export function rateLimitArguments(ipKey: string) {
  return { p_keys: [`ip-5m:${ipKey}`, `ip-1h:${ipKey}`], p_limits: [15, 100], p_window_seconds: [300, 3600] }
}

export function aiReviewConsentFrom(form: Pick<FormData, 'get'>) {
  return form.get('ai_review_consent') === 'on'
}

async function verifyTurnstile(token: string, trustedIp: string) {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  const allowedHostnames = new Set((Deno.env.get('TURNSTILE_ALLOWED_HOSTNAMES') || '').split(',').map(value => value.trim()).filter(Boolean))
  if (!secret || allowedHostnames.size === 0 || !token) return false
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5_000),
      body: JSON.stringify({ secret, response: token, remoteip: trustedIp }),
    })
    if (!response.ok) return false
    const result = await response.json() as TurnstileResult
    return result.success === true && typeof result.hostname === 'string' && allowedHostnames.has(result.hostname)
  } catch {
    return false
  }
}

export async function handler(req: Request) {
  const origin = req.headers.get('origin')
  const allowedOrigins = configuredOrigins()
  if (origin && !allowedOrigins.has(origin)) return json({ error: 'Origin not allowed' }, 403, null)
  if (req.method === 'OPTIONS') {
    if (!origin || !allowedOrigins.has(origin) || req.headers.get('access-control-request-method') !== 'POST') return json({ error: 'Invalid preflight request' }, 403, null)
    return new Response(null, { status: 204, headers: corsHeaders(origin, allowedOrigins) })
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin)

  const contentType = req.headers.get('content-type') || ''
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) return json({ error: 'Invalid content type' }, 415, origin)
  let body: Uint8Array
  try { body = await readBody(req) } catch (error) { return json({ error: error instanceof RangeError ? 'Request too large' : 'Invalid request body' }, error instanceof RangeError ? 413 : 400, origin) }

  let form: FormData
  const parsedBody = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer
  try { form = await new Response(parsedBody, { headers: { 'Content-Type': contentType } }).formData() } catch { return json({ error: 'Invalid multipart body' }, 400, origin) }
  const slug = String(form.get('vacancy_slug') || '').trim()
  const fullName = String(form.get('full_name') || '').trim()
  const email = String(form.get('email') || '').trim().toLowerCase()
  const phone = String(form.get('phone') || '').trim()
  const privacy = form.get('privacy') === 'on'
  const aiReviewConsent = aiReviewConsentFrom(form)
  const file = form.get('cv')
  let answers: unknown
  try { answers = JSON.parse(String(form.get('answers') || '{}')) } catch { return json({ error: 'Invalid answers' }, 400, origin) }
  if (!slug || fullName.length < 2 || fullName.length > 200 || !EMAIL_PATTERN.test(email) || email.length > 320 || phone.length < 7 || phone.length > 50 || !privacy) return json({ error: 'Invalid applicant details' }, 400, origin)
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_CV_BYTES) return json({ error: 'Invalid CV size' }, 400, origin)
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowedTypes.includes(file.type)) return json({ error: 'Invalid CV type' }, 400, origin)
  const fileBytes = new Uint8Array(await file.arrayBuffer())
  if ((file.type === 'application/pdf' && !startsWith(fileBytes, PDF_SIGNATURE)) || (file.type.includes('officedocument') && !isStructurallyValidDocx(fileBytes))) return json({ error: 'File content does not match its type' }, 400, origin)

  const supabaseUrl = Deno.env.get('SUPABASE_URL'); const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const rateSalt = Deno.env.get('RATE_LIMIT_SALT'); const trustedIp = trustedClientIp(req)
  if (!supabaseUrl || !serviceKey || !rateSalt || !trustedIp) {
    console.error('Submission protection unavailable', { missing: [...(!supabaseUrl?['SUPABASE_URL']:[]),...(!serviceKey?['SUPABASE_SERVICE_ROLE_KEY']:[]),...(!rateSalt?['RATE_LIMIT_SALT']:[]),...(!trustedIp?['trusted-client-ip']:[])] })
    return json({ error: 'Submission protection unavailable' }, 503, origin)
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  if (!await verifyTurnstile(String(form.get('challenge_token') || ''), trustedIp)) return json({ error: 'Bot verification failed' }, 403, origin)
  const { data: vacancy, error: vacancyError } = await admin.from('vacancies').select('id,status,deadline').eq('slug', slug).maybeSingle()
  if (vacancyError) return json({ error: 'Unable to verify vacancy' }, 503, origin)
  if (!vacancy || vacancy.status !== 'active' || (vacancy.deadline && vacancy.deadline < new Date().toISOString().slice(0, 10))) return json({ error: 'Vacancy is not accepting applications' }, 409, origin)
  const { data: questions, error: questionsError } = await admin.from('screening_questions').select('id,type,required,options').eq('vacancy_id', vacancy.id)
  if (questionsError) return json({ error: 'Unable to verify screening questions' }, 503, origin)
  const answerError = validateAnswers(answers, (questions || []) as Question[])
  if (answerError) return json({ error: answerError }, 400, origin)

  const { data: duplicate, error: duplicateError } = await admin.from('applications').select('id').eq('vacancy_id', vacancy.id).eq('email_normalized', email).eq('duplicate_constraint_exempt', false).maybeSingle()
  if (duplicateError) return json({ error: 'Unable to verify application eligibility' }, 503, origin)
  if (duplicate) return json({ error: 'An application for this vacancy has already been submitted with this email address.' }, 409, origin)

  const ipKey = await sha256(`${rateSalt}:ip:${trustedIp}`)
  const { data: rateResult, error: rateError } = await admin.rpc('consume_application_rate_limits_v2', rateLimitArguments(ipKey))
  if (rateError || !rateResult || typeof rateResult !== 'object') return json({ error: 'Submission protection unavailable' }, 503, origin)
  const rate = rateResult as { allowed?: unknown; retry_after?: unknown }
  if (rate.allowed !== true) {
    const retryAfter = typeof rate.retry_after === 'number' && Number.isInteger(rate.retry_after) && rate.retry_after > 0 ? rate.retry_after : null
    if (!retryAfter) return json({ error: 'Submission protection unavailable' }, 503, origin)
    return json({ error: 'Too many submission attempts. Please try again later.', retry_after: retryAfter }, 429, origin, { 'Retry-After': String(retryAfter) })
  }

  const extension = file.type === 'application/pdf' ? 'pdf' : 'docx'; const path = `${vacancy.id}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await admin.storage.from('cvs').upload(path, fileBytes, { contentType: file.type, upsert: false })
  if (uploadError) return json({ error: 'Unable to store CV' }, 500, origin)
  const consentedAt = aiReviewConsent ? new Date().toISOString() : null
  const { error: insertError } = await admin.from('applications').insert({ vacancy_id: vacancy.id, full_name: fullName, email, phone, cv_path: path, answers, privacy_acknowledged_at: new Date().toISOString(), duplicate_constraint_exempt: false, ai_review_consent: aiReviewConsent, ai_review_consented_at: consentedAt, ai_review_consent_version: aiReviewConsent ? AI_REVIEW_CONSENT_VERSION : null })
  if (insertError) {
    await admin.storage.from('cvs').remove([path])
    if (insertError.code === '23505') {
      const { data: concurrentDuplicate, error: duplicateCheckError } = await admin.from('applications').select('id').eq('vacancy_id', vacancy.id).eq('email_normalized', email).eq('duplicate_constraint_exempt', false).maybeSingle()
      if (!duplicateCheckError && concurrentDuplicate) return json({ error: 'An application for this vacancy has already been submitted with this email address.' }, 409, origin)
    }
    return json({ error: 'Unable to save application' }, 500, origin)
  }
  return json({ success: true }, 201, origin)
}

if (import.meta.main) Deno.serve(handler)
