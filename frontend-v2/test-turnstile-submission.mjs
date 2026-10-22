import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function run() {
  console.log('======================================================================')
  console.log(' Cloudflare Turnstile & Application Submission E2E Verification Suite')
  console.log('======================================================================\n')

  // 1. Fetch an active vacancy
  const { data: vacancies, error: vErr } = await admin
    .from('vacancies')
    .select('id, title, slug, status')
    .eq('status', 'active')
    .limit(1)

  if (vErr || !vacancies || vacancies.length === 0) {
    throw new Error('No active vacancy found in local database: ' + JSON.stringify(vErr))
  }
  const vacancy = vacancies[0]
  console.log(`Active vacancy under test: "${vacancy.title}" (${vacancy.slug})`)

  // Fetch screening questions for this vacancy
  const { data: questions } = await admin
    .from('screening_questions')
    .select('id, type, required, options')
    .eq('vacancy_id', vacancy.id)

  const answers = {}
  for (const q of questions || []) {
    if (q.type === 'yes_no') answers[q.id] = 'Yes'
    else if (q.type === 'single_select' && Array.isArray(q.options) && q.options.length > 0) answers[q.id] = q.options[0]
    else answers[q.id] = 'Experienced software professional with 6+ years experience.'
  }

  // Create a minimal dummy PDF file
  const pdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF')
  const testEmail = `turnstile-e2e-${Date.now()}@test.local`

  // Helper to build FormData
  function buildFormData(challengeToken, email = testEmail) {
    const form = new FormData()
    form.append('vacancy_slug', vacancy.slug)
    form.append('full_name', 'Turnstile Verified Candidate')
    form.append('email', email)
    form.append('phone', '+44 7700 900077')
    form.append('privacy', 'on')
    form.append('ai_review_consent', 'on')
    form.append('answers', JSON.stringify(answers))
    if (challengeToken !== null && challengeToken !== undefined) {
      form.append('challenge_token', challengeToken)
    }
    const blob = new Blob([pdfHeader], { type: 'application/pdf' })
    form.append('cv', blob, 'verified_cv.pdf')
    return form
  }

  // --- Scenario 1: Submission with missing challenge_token ---
  console.log('[Scenario 1] Submission with missing challenge_token (bot attempt)...')
  {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-application`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        origin: 'http://localhost:5174',
      },
      body: buildFormData(null),
    })
    const body = await res.json()
    console.log(`Response: HTTP ${res.status}`, body)
    if (res.status !== 403 || body.error !== 'Bot verification failed') {
      throw new Error(`Expected 403 "Bot verification failed", got ${res.status}: ${JSON.stringify(body)}`)
    }
    console.log('✅ PASS: Rejected missing challenge_token with 403 Forbidden\n')
  }

  // --- Scenario 2: Submission with empty challenge_token string ---
  console.log('[Scenario 2] Submission with empty challenge_token string...')
  {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-application`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        origin: 'http://localhost:5174',
      },
      body: buildFormData(''),
    })
    const body = await res.json()
    console.log(`Response: HTTP ${res.status}`, body)
    if (res.status !== 403 || body.error !== 'Bot verification failed') {
      throw new Error(`Expected 403 "Bot verification failed", got ${res.status}: ${JSON.stringify(body)}`)
    }
    console.log('✅ PASS: Rejected empty challenge_token with 403 Forbidden\n')
  }

  // --- Scenario 3: Submission with unallowed CORS origin ---
  console.log('[Scenario 3] Submission from unallowed CORS origin (evil.com)...')
  {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-application`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        origin: 'https://evil.com',
      },
      body: buildFormData('1x00000000000000000000AA'),
    })
    const body = await res.json()
    console.log(`Response: HTTP ${res.status}`, body)
    if (res.status !== 403 || body.error !== 'Origin not allowed') {
      throw new Error(`Expected 403 "Origin not allowed", got ${res.status}: ${JSON.stringify(body)}`)
    }
    console.log('✅ PASS: Rejected untrusted origin with 403 Forbidden\n')
  }

  // --- Scenario 4: Valid submission with Cloudflare Turnstile verification ---
  console.log('[Scenario 4] Valid application submission with Turnstile challenge_token...')
  let createdAppId = null
  let createdCvPath = null
  {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-application`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        origin: 'http://localhost:5174',
      },
      body: buildFormData('1x00000000000000000000AA', testEmail),
    })
    const body = await res.json()
    console.log(`Response: HTTP ${res.status}`, body)
    if (res.status !== 201 || !body.success) {
      throw new Error(`Expected 201 success: true, got ${res.status}: ${JSON.stringify(body)}`)
    }
    console.log('✅ PASS: Successfully accepted verified application (201 Created)\n')

    // Verify record in database
    const { data: appRecord, error: appErr } = await admin
      .from('applications')
      .select('id, email, vacancy_id, cv_path, ai_review_consent, ai_review_consent_version')
      .eq('email_normalized', testEmail)
      .maybeSingle()

    if (appErr || !appRecord) {
      throw new Error('Application was not found in database: ' + JSON.stringify(appErr))
    }
    createdAppId = appRecord.id
    createdCvPath = appRecord.cv_path
    console.log(`✅ PASS: Database record verified -> ID: ${createdAppId}, cv_path: ${createdCvPath}, ai_consent: ${appRecord.ai_review_consent}\n`)
  }

  // --- Scenario 5: Duplicate submission with the same email ---
  console.log('[Scenario 5] Duplicate submission with same applicant email...')
  {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-application`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        origin: 'http://localhost:5174',
      },
      body: buildFormData('1x00000000000000000000AA', testEmail),
    })
    const body = await res.json()
    console.log(`Response: HTTP ${res.status}`, body)
    if (res.status !== 409 || !body.error?.includes('already been submitted with this email address')) {
      throw new Error(`Expected 409 Conflict, got ${res.status}: ${JSON.stringify(body)}`)
    }
    console.log('✅ PASS: Rejected duplicate application with 409 Conflict\n')
  }

  // --- Scenario 6: Cleanup test data immediately ---
  console.log('[Scenario 6] Immediate cleanup of test applicant record and storage...')
  if (createdAppId) {
    const { error: delErr } = await admin.from('applications').delete().eq('id', createdAppId)
    if (delErr) throw delErr
    console.log(`✅ Removed test record ${createdAppId} from applications table`)
  }
  if (createdCvPath) {
    const { error: storageErr } = await admin.storage.from('cvs').remove([createdCvPath])
    if (storageErr) throw storageErr
    console.log(`✅ Removed test CV ${createdCvPath} from cvs storage bucket`)
  }

  // Verify cleanup
  const { data: checkClean } = await admin
    .from('applications')
    .select('id')
    .eq('email_normalized', testEmail)
    .maybeSingle()

  if (checkClean) throw new Error('Cleanup failed: record still exists in database!')
  console.log('✅ PASS: Verified 0 leftover test records in local database\n')

  console.log('======================================================================')
  console.log(' 🎉 ALL 6 E2E TURNSTILE INTEGRATION SCENARIOS PASSED WITH ZERO ERRORS!')
  console.log('======================================================================')
}

run().catch((err) => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err)
  process.exit(1)
})
