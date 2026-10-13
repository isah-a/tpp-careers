import { assertEquals } from 'jsr:@std/assert@1'
import { aiReviewConsentFrom, corsHeaders, fixedWindowRetryAfter, isStructurallyValidDocx, rateLimitArguments, validateAnswers, zipEntryNames } from './index.ts'

Deno.test('CORS only reflects configured origins', () => {
  const allowed = new Set(['http://localhost:5173', 'https://staging.example.com'])
  assertEquals(corsHeaders('https://staging.example.com', allowed)['Access-Control-Allow-Origin'], 'https://staging.example.com')
  assertEquals(corsHeaders('https://evil.example', allowed)['Access-Control-Allow-Origin'], undefined)
})

Deno.test('answers reject unknown ids, non-string values, oversized text, and invalid choices', () => {
  const questions = [{ id: 'q1', type: 'yes_no' as const, required: true, options: [] }, { id: 'q2', type: 'text' as const, required: false, options: [] }]
  assertEquals(validateAnswers({ unknown: 'Yes' }, questions), 'Invalid screening answer')
  assertEquals(validateAnswers({ q1: 1 }, questions), 'Invalid screening answer')
  assertEquals(validateAnswers({ q1: 'Maybe' }, questions), 'Invalid screening answer')
  assertEquals(validateAnswers({ q1: 'Yes', q2: 'x'.repeat(2001) }, questions), 'Screening answer is too long')
  assertEquals(validateAnswers({ q1: 'Yes', q2: 'Short answer' }, questions), null)
})

function centralEntry(name: string) {
  const encoded = new TextEncoder().encode(name); const bytes = new Uint8Array(46 + encoded.length); const view = new DataView(bytes.buffer)
  view.setUint32(0, 0x02014b50, true); view.setUint16(28, encoded.length, true); bytes.set(encoded, 46); return bytes
}

Deno.test('DOCX requires core OOXML entries and rejects path traversal', () => {
  const localHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
  const parts = [localHeader, centralEntry('[Content_Types].xml'), centralEntry('_rels/.rels'), centralEntry('word/document.xml')]
  const valid = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0)); let offset = 0
  for (const part of parts) { valid.set(part, offset); offset += part.length }
  assertEquals(isStructurallyValidDocx(valid), true)
  assertEquals(isStructurallyValidDocx(new Uint8Array([0x50, 0x4b, 0x03, 0x04])), false)
  let unsafe = false
  try { zipEntryNames(centralEntry('../word/document.xml')) } catch { unsafe = true }
  assertEquals(unsafe, true)
})

Deno.test('fixed-window Retry-After is accurate at boundaries', () => {
  assertEquals(fixedWindowRetryAfter(299, 300), 1)
  assertEquals(fixedWindowRetryAfter(300, 300), 300)
  assertEquals(fixedWindowRetryAfter(3_599, 3_600), 1)
  assertEquals(fixedWindowRetryAfter(3_600, 3_600), 3_600)
})

Deno.test('five vacancies for one email fit normal IP quotas and no email bucket is used', () => {
  const policy = rateLimitArguments('hashed-ip')
  assertEquals(policy.p_limits, [15, 100])
  assertEquals(policy.p_window_seconds, [300, 3600])
  assertEquals(policy.p_keys.some(key => key.includes('email') || key.includes('vacancy')), false)
  assertEquals(new Set(policy.p_keys).size, 2)
  assertEquals(policy.p_keys[0] === policy.p_keys[1], false)
  assertEquals(5 <= policy.p_limits[0], true)
})

Deno.test('AI review consent is optional and unchecked by default', () => {
  const unchecked = new FormData()
  assertEquals(aiReviewConsentFrom(unchecked), false)
  unchecked.set('ai_review_consent', 'on')
  assertEquals(aiReviewConsentFrom(unchecked), true)
})

Deno.test('pending migration protects historical exemptions and exposes active consent state', async () => {
  const migration = await Deno.readTextFile(new URL('../../migrations/20261013000002_submission_limits_duplicates_and_ai_consent.sql', import.meta.url))
  assertEquals(migration.includes('applications_protect_duplicate_constraint_exemption'), true)
  assertEquals(migration.includes("tg_op = 'INSERT' and new.duplicate_constraint_exempt = true"), true)
  assertEquals(migration.includes('ai_review_consent_active boolean generated always as'), true)
  assertEquals(migration.includes('v_now := clock_timestamp();'), true)
})
