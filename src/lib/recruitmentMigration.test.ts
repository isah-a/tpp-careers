import { describe, expect, it } from 'vitest'
import sql from '../../supabase/migrations/20261014000000_recruitment_management.sql?raw'

describe('recruitment management migration security',()=>{
  it('keys each assessment to the application and reviewer',()=>{
    expect(sql).toMatch(/primary key \(application_id, reviewer_id\)/)
    expect(sql).toMatch(/recruiter_reviews_update_own[\s\S]*reviewer_id = auth\.uid\(\)/)
  })
  it('keeps internal records behind recruiter RLS',()=>{
    expect(sql).toMatch(/alter table public\.application_reviews enable row level security/)
    expect(sql).toMatch(/recruiter_notes_read[\s\S]*public\.is_recruiter\(\)/)
    expect(sql).toMatch(/revoke all on public\.job_templates[\s\S]*from public, anon, authenticated/)
  })
  it('limits template mutation to the creating recruiter',()=>{
    expect(sql).toMatch(/recruiter_templates_update_own[\s\S]*using \(public\.is_recruiter\(\) and created_by = auth\.uid\(\)\)/)
    expect(sql).toMatch(/recruiter_templates_delete_own[\s\S]*created_by = auth\.uid\(\)/)
    expect(sql).not.toMatch(/recruiter_templates_all/)
  })
  it('records stage changes through the recruiter-only function',()=>{
    expect(sql).toMatch(/security definer[\s\S]*if v_actor is null or not public\.is_recruiter\(\)/)
    expect(sql).toMatch(/insert into public\.application_stage_history/)
  })
})
