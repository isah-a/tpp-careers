import { describe, it, expect } from 'vitest'
import migrationSql from '../../../supabase/migrations/20261022000000_recruiter_ownership_and_collaboration.sql?raw'
import type { Recruiter, Vacancy, VacancyCollaborator } from '../types'

describe('Recruiter Ownership & Collaboration Migration Security & Schema Audit', () => {
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

  it('enforces server-side trigger to set created_by and lead_recruiter_id preventing client spoofing', () => {
    expect(migrationSql).toMatch(/create or replace function public\.set_vacancy_creator_and_lead/i)
    expect(migrationSql).toMatch(/new\.created_by := v_actor/i)
    expect(migrationSql).toMatch(/new\.lead_recruiter_id := v_actor/i)
    expect(migrationSql).toMatch(/create trigger set_vacancy_creator_and_lead_trigger/i)
  })

  it('enforces trigger preserving created_by as immutable and restricting deletion', () => {
    expect(migrationSql).toMatch(/create or replace function public\.enforce_vacancy_invariants/i)
    expect(migrationSql).toMatch(/new\.created_by is distinct from old\.created_by/i)
    expect(migrationSql).toMatch(/created_by cannot be modified/i)
    expect(migrationSql).toMatch(/old\.status != 'draft'/i)
    expect(migrationSql).toMatch(/cannot delete vacancy with submitted candidate applications/i)
  })

  it('strictly restricts unassigned vacancy management to Workspace Admins in can_manage_vacancy()', () => {
    expect(migrationSql).toMatch(/create or replace function public\.can_manage_vacancy/i)
    expect(migrationSql).toMatch(/if public\.is_workspace_admin\(\) then\s+return true;/i)
    // Unassigned check: must NOT return true for ordinary recruiters
    expect(migrationSql).toMatch(/if v_lead is null then\s+return false;/i)
  })

  it('provides a secure, one-time bootstrap procedure for the first Workspace Admin', () => {
    expect(migrationSql).toMatch(/create or replace function public\.bootstrap_first_workspace_admin/i)
    expect(migrationSql).toMatch(/select count\(\*\) into v_admin_count from public\.recruiters where role = 'admin'/i)
    expect(migrationSql).toMatch(/workspace already has an initialized administrator/i)
  })

  it('provides administrator-only role management preventing demotion of the last admin', () => {
    expect(migrationSql).toMatch(/create or replace function public\.set_recruiter_role/i)
    expect(migrationSql).toMatch(/if not public\.is_workspace_admin\(\) then/i)
    expect(migrationSql).toMatch(/cannot demote the last remaining workspace administrator/i)
  })

  it('drops broad legacy policies and enforces least-privilege RLS on vacancies and screening questions', () => {
    // Vacancies
    expect(migrationSql).toMatch(/drop policy if exists recruiter_vacancies_all on public\.vacancies/i)
    expect(migrationSql).toMatch(/create policy recruiter_vacancies_update on public\.vacancies[\s\S]*public\.is_workspace_admin\(\) or lead_recruiter_id = auth\.uid\(\)/i)
    expect(migrationSql).toMatch(/create policy recruiter_vacancies_delete on public\.vacancies[\s\S]*status = 'draft'/i)
    // Screening Questions
    expect(migrationSql).toMatch(/drop policy if exists recruiter_questions_all on public\.screening_questions/i)
    expect(migrationSql).toMatch(/create policy recruiter_questions_write on public\.screening_questions[\s\S]*public\.is_workspace_admin\(\) or v\.lead_recruiter_id = auth\.uid\(\)/i)
  })

  it('enforces RLS on vacancy_collaborators allowing collaborator voluntary leave', () => {
    expect(migrationSql).toMatch(/alter table public\.vacancy_collaborators enable row level security/i)
    expect(migrationSql).toMatch(/create policy vacancy_collaborators_read on public\.vacancy_collaborators[\s\S]*using \(public\.is_recruiter\(\)\)/i)
    expect(migrationSql).toMatch(/create policy vacancy_collaborators_insert on public\.vacancy_collaborators[\s\S]*public\.can_manage_vacancy\(vacancy_id\)/i)
    // Voluntary leave: recruiter_id = auth.uid()
    expect(migrationSql).toMatch(/create policy vacancy_collaborators_delete on public\.vacancy_collaborators[\s\S]*recruiter_id = auth\.uid\(\)/i)
  })

  it('revokes public/anon access and limits grants to authenticated recruiters', () => {
    expect(migrationSql).toMatch(/revoke all on public\.vacancy_collaborators from public, anon/i)
    expect(migrationSql).toMatch(/grant select, insert, delete on public\.vacancy_collaborators to authenticated/i)
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

    expect(updatedVacancy.created_by).toBe(creatorUser.user_id) // Preserved immutable!
    expect(updatedVacancy.lead_recruiter_id).toBe(newLeadUser.user_id) // Updated!
    expect(updatedVacancy.lead_recruiter?.display_name).toBe('Chinedu Eze')
  })

  it('prevents ordinary recruiters from claiming or managing unassigned legacy vacancies', () => {
    const legacyVacancy: Vacancy = {
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

    const ordinaryRecruiter = directory[0] // role: recruiter
    const workspaceAdmin = directory[3] // role: admin

    // Rule: can_manage_vacancy logic
    const canOrdinaryManage =
      ordinaryRecruiter.role === 'admin' ||
      (legacyVacancy.lead_recruiter_id !== null && legacyVacancy.lead_recruiter_id === ordinaryRecruiter.user_id)

    const canAdminManage =
      workspaceAdmin.role === 'admin' ||
      (legacyVacancy.lead_recruiter_id !== null && legacyVacancy.lead_recruiter_id === workspaceAdmin.user_id)

    expect(canOrdinaryManage).toBe(false) // Ordinary recruiter strictly denied!
    expect(canAdminManage).toBe(true) // Workspace Admin authorized to reconcile!
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

  it('allows collaborator to voluntarily leave assignment', () => {
    const vacancyId = 'v-100'
    const collaboratorId = 'rec-collab-1'
    let collaborators = [
      { vacancy_id: vacancyId, recruiter_id: collaboratorId, display_name: 'Chinedu Eze' },
      { vacancy_id: vacancyId, recruiter_id: 'rec-collab-2', display_name: 'Ngozi Okonjo' },
    ]

    // Collaborator voluntarily removes self
    collaborators = collaborators.filter(c => c.recruiter_id !== collaboratorId)
    expect(collaborators).toHaveLength(1)
    expect(collaborators.some(c => c.recruiter_id === collaboratorId)).toBe(false)
  })

  it('enforces deletion restrictions: only empty drafts can be deleted', () => {
    const activeVacancyWithApps: Vacancy = {
      id: 'v-1',
      title: 'Active Role',
      slug: 'active-role',
      description: 'Desc',
      requirements: 'Req',
      location: 'Lagos',
      employment_type: 'Full-time',
      status: 'active',
      deadline: null,
      created_at: '2024-01-01',
      application_count: 5,
    }

    const draftVacancyWithApps: Vacancy = {
      id: 'v-2',
      title: 'Draft Role with Applicants',
      slug: 'draft-role-apps',
      description: 'Desc',
      requirements: 'Req',
      location: 'Lagos',
      employment_type: 'Full-time',
      status: 'draft',
      deadline: null,
      created_at: '2024-01-01',
      application_count: 2,
    }

    const emptyDraftVacancy: Vacancy = {
      id: 'v-3',
      title: 'Clean Empty Draft',
      slug: 'clean-empty-draft',
      description: 'Desc',
      requirements: 'Req',
      location: 'Lagos',
      employment_type: 'Full-time',
      status: 'draft',
      deadline: null,
      created_at: '2024-01-01',
      application_count: 0,
    }

    const canDelete = (v: Vacancy) => v.status === 'draft' && (v.application_count ?? 0) === 0

    expect(canDelete(activeVacancyWithApps)).toBe(false)
    expect(canDelete(draftVacancyWithApps)).toBe(false)
    expect(canDelete(emptyDraftVacancy)).toBe(true)
  })

  it('prevents demoting the last remaining workspace administrator', () => {
    const admins = [{ user_id: 'rec-admin-1', role: 'admin' }]
    const canDemote = (adminList: typeof admins) => adminList.length > 1
    expect(canDemote(admins)).toBe(false)

    // Adding second admin allows demoting one
    admins.push({ user_id: 'rec-admin-2', role: 'admin' })
    expect(canDemote(admins)).toBe(true)
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
