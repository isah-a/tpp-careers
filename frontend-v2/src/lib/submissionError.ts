const SAFE_VALIDATION_MESSAGES = new Set([
  'Invalid applicant details',
  'Invalid CV size',
  'Invalid CV type',
  'File content does not match its type',
  'Invalid answers',
  'Invalid screening answer',
  'Screening answer is too long',
  'Screening answers are too long',
  'A required screening answer is missing',
  'Request too large',
])

function duration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  if (!minutes) return `${seconds} second${seconds === 1 ? '' : 's'}`
  return `${minutes} minute${minutes === 1 ? '' : 's'}${remaining ? ` ${remaining} second${remaining === 1 ? '' : 's'}` : ''}`
}

export async function parseSubmissionError(error: unknown): Promise<string> {
  const context = error && typeof error === 'object' && 'context' in error ? (error as { context?: unknown }).context : null
  if (!(context instanceof Response)) {
    return 'We could not connect to the application service. Please try again.'
  }
  let body: { error?: unknown; retry_after?: unknown } = {}
  try {
    body = await context.clone().json()
  } catch {
    /* fallback to status */
  }
  const message = typeof body.error === 'string' ? body.error : ''
  if (context.status === 400 || context.status === 413 || context.status === 415) {
    return SAFE_VALIDATION_MESSAGES.has(message) ? message : 'Please check your application details and try again.'
  }
  if (context.status === 403) {
    return 'We could not verify that you are human. Please refresh the verification and try again.'
  }
  if (context.status === 409) {
    return message.includes('already been submitted') ? message : 'This vacancy is no longer accepting applications.'
  }
  if (context.status === 429) {
    const headerSeconds = Number(context.headers.get('Retry-After'))
    const bodySeconds = Number(body.retry_after)
    const seconds = Number.isInteger(headerSeconds) && headerSeconds > 0 ? headerSeconds : bodySeconds
    return Number.isInteger(seconds) && seconds > 0
      ? `Too many submission attempts. Please try again in ${duration(seconds)}.`
      : 'Too many submission attempts. Please try again later.'
  }
  return 'We could not submit your application right now. Please try again later.'
}
