import { describe, expect, it } from 'vitest'
import { parseSubmissionError } from './submissionError'

const functionError = (status:number, body:unknown, headers:Record<string,string>={}) => ({ context: new Response(JSON.stringify(body), { status, headers: { 'Content-Type':'application/json', ...headers } }) })

describe('submission error parsing',()=>{
  it('shows accurate Retry-After duration',async()=>expect(await parseSubmissionError(functionError(429,{error:'internal',retry_after:999},{'Retry-After':'61'}))).toBe('Too many submission attempts. Please try again in 1 minute 1 second.'))
  it('shows the safe duplicate message',async()=>expect(await parseSubmissionError(functionError(409,{error:'An application for this vacancy has already been submitted with this email address.'}))).toContain('already been submitted'))
  it('does not expose unknown server details',async()=>expect(await parseSubmissionError(functionError(500,{error:'database password is secret'}))).not.toContain('password'))
})
