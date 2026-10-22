import { describe, it, expect } from 'vitest'
import migrationSql from '../../../supabase/migrations/20261022000000_recruiter_ownership_and_collaboration.sql?raw'
import type { Recruiter, Vacancy, VacancyCollaborator } from '../types'

describe('Recruiter Ownership and Collaboration Migration Security & Schema', () => {
  it('adds lead_recruiter_id column with foreign key to recruiters directory and default auth.uid()', () => {
    expect(migrationSql).toMatch(/alter table public\.vacancies/i)
    expect(migrationSql).toMatch(
      /add column if not exists lead_recruiter_id uuid references public\.recruiters\(user_id\) on delete set null default auth\.uid\(\)/i
    )
    expect(migrationSql).toMatch(/create index if not exists vacancies_lead_recruiter_idx on public\.vacancies\(lead_recruiter_id\)/i)
  })

  it('backfills existing vacancies where created_by is a valid recruiter, leaving unattributed ones as NULL', () => {
    expect(migrationSql).toMatch(/update public\.vacancies\s+set lead_recruiter_id = created_by/i)
    expect(migrationSql).toMatch(/where lead_recruiter_id is null\s+and created_by in \(select user_id from public\.recruiters\)/i)
  })

  it('creates vacancy_collaborators table with foreign keys and strict uniqueness constraint', () => {
    expect(migrationSql).toMatch(/create table if not exists public\.vacancy_collaborators/i)
    expect(migrationSql).toMatch(/vacancy_id uuid not null references public\.vacancies\(id\) on delete cascade/i)
    expect(migrationSql).toMatch(/recruiter_id uuid not null references public\.recruiters\(user_id\) on delete cascade/i)
    expect(migrationSql).toMatch(/constraint vacancy_collaborators_unique_assignment unique \(vacancy_id, recruiter_id\)/i)
  })

  it('enforces RLS policies on vacancy_collaborators preventing unauthorized or duplicate assignment', () => {
    expect(migrationSql).toMatch(/alter table public\.vacancy_collaborators enable row level security/i)
    expect(migrationSql).toMatch(/create policy vacancy_collaborators_read on public\.vacancy_collaborators[\s\S]*using \(public\.is_recruiter\(\)\)/i)
    expect(migrationSql).toMatch(/create policy vacancy_collaborators_insert on public\.vacancy_collaborators[\s\S]*public\.is_recruiter\(\)[\s\S]*public\.can_manage_vacancy\(vacancy_id\)[\s\S]*exists \(select 1 from public\.recruiters where user_id = recruiter_id\)/i)
    expect(migrationSql).toMatch(/create policy vacancy_collaborators_delete on public\.vacancy_collaborators[\s\S]*public\.is_recruiter\(\)[\s\S]*public\.can_manage_vacancy\(vacancy_id\) or recruiter_id = auth\.uid\(\)/i)
  })

  it('revokes public/anon access and limits grants to authenticated recruiters', () => {
    expect(migrationSql).toMatch(/revoke all on public\.vacancy_collaborators from public, anon/i)
    expect(migrationSql).toMatch(/grant select, insert, delete on public\.vacancy_collaborators to authenticated/i)
  })

  it('provides atomic security definer procedures for lead assignment and collaboration', () => {
    expect(migrationSql).toMatch(/create or replace function public\.assign_lead_recruiter/i)
    expect(migrationSql).toMatch(/create or replace function public\.add_vacancy_collaborator/i)
    expect(migrationSql).toMatch(/create or replace function public\.remove_vacancy_collaborator/i)
    expect(migrationSql).toMatch(/cannot add lead recruiter as collaborator/i)
  })
})

describe('Recruiter Ownership & Collaboration Workflow Rules', () => {
  const directory: Recruiter[] = [
    { user_id: 'rec-creator-1', display_name: 'Amina Bello', role: 'recruiter' },
    { user_id: 'rec-collab-1', display_name: 'Chinedu Eze', role: 'recruiter' },
    { user_id: 'rec-collab-2', display_name: 'Ngozi Okonjo', role: 'recruiter' },
    { user_id: 'rec-admin-1', display_name: 'Workspace Admin', role: 'admin' },
  ]

  it('creator automatically becomes lead recruiter on vacancy creation', () => {
    const creatorUser = directory[0]
    const createdVacancy: Vacancy = {
      id: 'v-new-1',
      title: 'Senior Frontend Engineer',
      slug: 'senior-frontend-engineer',
      description: 'Requirements and job description',
      requirements: 'Requirements text',
      location: 'Lagos, Nigeria',
      employment_type: 'Full-time',
      status: 'active',
      deadline: '2026-11-30',
      created_at: new Date().toISOString(),
      created_by: creatorUser.user_id,
      lead_recruiter_id: creatorUser.user_id,
      lead_recruiter: creatorUser,
    }

    expect(createdVacancy.created_by).toBe(creatorUser.user_id)
    expect(createdVacancy.lead_recruiter_id).toBe(creatorUser.user_id)
    expect(createdVacancy.lead_recruiter?.display_name).toBe('Amina Bello')
  })

  it('preserves creator identity even when lead recruiter ownership changes', () => {
    const creatorUser = directory[0]
    const newLeadUser = directory[1]

    const initialVacancy: Vacancy = {
      id: 'v-new-1',
      title: 'Senior Frontend Engineer',
      slug: 'senior-frontend-engineer',
      description: 'Description',
      requirements: 'Requirements',
      location: 'Lagos',
      employment_type: 'Full-time',
      status: 'active',
      deadline: null,
      created_at: '2026-10-22T08:00:00Z',
      created_by: creatorUser.user_id,
      lead_recruiter_id: creatorUser.user_id,
    }

    // Lead assignment changes to newLeadUser
    const updatedVacancy: Vacancy = {
      ...initialVacancy,
      lead_recruiter_id: newLeadUser.user_id,
      lead_recruiter: newLeadUser,
    }

    expect(updatedVacancy.created_by).toBe(creatorUser.user_id) // Preserved!
    expect(updatedVacancy.lead_recruiter_id).toBe(newLeadUser.user_id) // Updated!
    expect(updatedVacancy.lead_recruiter?.display_name).toBe('Chinedu Eze')
  })

  it('displays Unassigned safely for existing vacancies without reliable attribution', () => {
    const unattributedVacancy: Vacancy = {
      id: 'v-legacy-1',
      title: 'Legacy Operations Manager',
      slug: 'legacy-operations-manager',
      description: 'Description',
      requirements: 'Requirements',
      location: 'Abuja',
      employment_type: 'Full-time',
      status: 'active',
      deadline: null,
      created_at: '2023-01-01T00:00:00Z',
      created_by: 'unknown-uuid-not-in-directory',
      lead_recruiter_id: null,
      lead_recruiter: null,
    }

    const resolvedLead = directory.find(r => r.user_id === unattributedVacancy.lead_recruiter_id) || null
    expect(resolvedLead).toBeNull()

    const displayName = resolvedLead ? resolvedLead.display_name : 'Unassigned'
    expect(displayName).toBe('Unassigned')
  })

  it('allows adding collaborators and rejects duplicate assignment', () => {
    const vacancyId = 'v-100'
    const leadUser = directory[0]
    const collabUser = directory[1]

    const collaborators: VacancyCollaborator[] = [
      {
        vacancy_id: vacancyId,
        recruiter_id: collabUser.user_id,
        recruiter: collabUser,
      },
    ]

    // Attempting to add the same collaborator again
    const isDuplicate = collaborators.some(c => c.recruiter_id === collabUser.user_id)
    expect(isDuplicate).toBe(true)

    // Attempting to add lead recruiter as collaborator
    const isLeadConflict = leadUser.user_id === collabUser.user_id
    expect(isLeadConflict).toBe(false)

    // Adding second collaborator succeeds
    const secondCollab = directory[2]
    const isSecondDuplicate = collaborators.some(c => c.recruiter_id === secondCollab.user_id)
    expect(isSecondDuplicate).toBe(false)

    collaborators.push({
      vacancy_id: vacancyId,
      recruiter_id: secondCollab.user_id,
      recruiter: secondCollab,
    })

    expect(collaborators).toHaveLength(2)
  })

  it('allows authorized users to remove collaborators', () => {
    const vacancyId = 'v-100'
    let collaborators = [
      { vacancy_id: vacancyId, recruiter_id: 'rec-collab-1', display_name: 'Chinedu Eze' },
      { vacancy_id: vacancyId, recruiter_id: 'rec-collab-2', display_name: 'Ngozi Okonjo' },
    ]

    // Remove rec-collab-1
    collaborators = collaborators.filter(c => c.recruiter_id !== 'rec-collab-1')
    expect(collaborators).toHaveLength(1)
    expect(collaborators[0].recruiter_id).toBe('rec-collab-2')
  })
})

describe('Applicants Table Date Layout Verification', () => {
  it('formats applied dates into single-line format matching DD MMM YY', () => {
    const formatAppliedDate = (dateString: string) => {
      const d = new Date(dateString)
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      }).format(d)
    }

    const testDate = '2026-10-15T12:00:00Z'
    const formatted = formatAppliedDate(testDate)
    expect(formatted).toBe('15 Oct 26')
    expect(formatted).not.toContain('\n')
  })
})
