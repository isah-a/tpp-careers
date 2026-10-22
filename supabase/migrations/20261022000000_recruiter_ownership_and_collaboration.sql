-- Migration: 20261022000000_recruiter_ownership_and_collaboration.sql
-- Description: Finalized, secured recruiter ownership, collaborative hiring, and least-privilege RLS.
--
-- 1. Vacancy Ownership Schema (lead_recruiter_id, backfill, immutability)
-- 2. Organization Roles (Workspace Admin vs Recruiter, bootstrap procedure, role management)
-- 3. Collaborative Recruitment (vacancy_collaborators, duplicate prevention, voluntary leave)
-- 4. Database-Level Authorization Audit & Corrections (vacancies, screening_questions, triggers)
-- 5. Safe Deletion and Mutation Invariant Enforcements

-- -----------------------------------------------------------------------------
-- 1. Vacancy Ownership Schema
-- -----------------------------------------------------------------------------

alter table public.vacancies
  add column if not exists lead_recruiter_id uuid references public.recruiters(user_id) on delete set null default auth.uid();

create index if not exists vacancies_lead_recruiter_idx on public.vacancies(lead_recruiter_id);

-- Backfill legacy vacancies: assign lead_recruiter_id to created_by ONLY when created_by reliably identifies an authorized recruiter
update public.vacancies
  set lead_recruiter_id = created_by
  where lead_recruiter_id is null
    and created_by in (select user_id from public.recruiters);

-- -----------------------------------------------------------------------------
-- 2. Organization Roles & Administrator Management
-- -----------------------------------------------------------------------------

alter table public.recruiters
  add column if not exists role text not null default 'recruiter' check (role in ('recruiter', 'admin'));

-- Helper: Check if authenticated user is a Workspace Admin
create or replace function public.is_workspace_admin()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.recruiters
    where user_id = auth.uid() and role = 'admin'
  );
$$;
revoke all on function public.is_workspace_admin() from public, anon;
grant execute on function public.is_workspace_admin() to authenticated;

-- Bootstrap procedure: One-time repeatable initialization for the first Workspace Admin.
-- Permanently locks once at least one administrator exists in the workspace.
create or replace function public.bootstrap_first_workspace_admin(p_recruiter_id uuid)
returns public.recruiters
language plpgsql security definer set search_path = '' as $$
declare
  v_admin_count integer;
  v_recruiter public.recruiters;
begin
  select count(*) into v_admin_count from public.recruiters where role = 'admin';
  if v_admin_count > 0 then
    raise exception 'bootstrap closed: workspace already has an initialized administrator';
  end if;

  select * into v_recruiter from public.recruiters where user_id = p_recruiter_id;
  if not found then
    raise exception 'recruiter not found in authorized directory: %', p_recruiter_id;
  end if;

  update public.recruiters
    set role = 'admin'
    where user_id = p_recruiter_id
    returning * into v_recruiter;

  return v_recruiter;
end;
$$;
revoke all on function public.bootstrap_first_workspace_admin(uuid) from public, anon;
grant execute on function public.bootstrap_first_workspace_admin(uuid) to authenticated;

-- Administrator-only role assignment procedure
create or replace function public.set_recruiter_role(p_recruiter_id uuid, p_new_role text)
returns public.recruiters
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_admin_count integer;
  v_target public.recruiters;
begin
  if v_actor is null or not public.is_recruiter() then
    raise exception 'recruiter access required';
  end if;

  if not public.is_workspace_admin() then
    raise exception 'only workspace administrators can assign account roles';
  end if;

  if p_new_role not in ('recruiter', 'admin') then
    raise exception 'invalid role: %', p_new_role;
  end if;

  select * into v_target from public.recruiters where user_id = p_recruiter_id;
  if not found then
    raise exception 'target recruiter not found';
  end if;

  -- Prevent demoting the last remaining workspace administrator
  if v_target.role = 'admin' and p_new_role != 'admin' then
    select count(*) into v_admin_count from public.recruiters where role = 'admin';
    if v_admin_count <= 1 then
      raise exception 'cannot demote the last remaining workspace administrator';
    end if;
  end if;

  update public.recruiters
    set role = p_new_role
    where user_id = p_recruiter_id
    returning * into v_target;

  return v_target;
end;
$$;
revoke all on function public.set_recruiter_role(uuid, text) from public, anon;
grant execute on function public.set_recruiter_role(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Collaborative Recruitment Relationship
-- -----------------------------------------------------------------------------

create table if not exists public.vacancy_collaborators (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  recruiter_id uuid not null references public.recruiters(user_id) on delete cascade,
  assigned_by uuid references public.recruiters(user_id) on delete set null default auth.uid(),
  assigned_at timestamptz not null default now(),
  constraint vacancy_collaborators_unique_assignment unique (vacancy_id, recruiter_id)
);

create index if not exists vacancy_collaborators_vacancy_idx on public.vacancy_collaborators(vacancy_id);
create index if not exists vacancy_collaborators_recruiter_idx on public.vacancy_collaborators(recruiter_id);

-- Check if authenticated user is a collaborator on a vacancy
create or replace function public.is_vacancy_collaborator(p_vacancy_id uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.vacancy_collaborators
    where vacancy_id = p_vacancy_id and recruiter_id = auth.uid()
  );
$$;
revoke all on function public.is_vacancy_collaborator(uuid) from public, anon;
grant execute on function public.is_vacancy_collaborator(uuid) to authenticated;

-- Helper: Check if user can manage the vacancy (lead recruiter or workspace admin).
-- CRITICAL FIX: Unassigned vacancies (v_lead is null) can ONLY be managed by Workspace Admins.
-- Ordinary recruiters CANNOT manage or claim unassigned vacancies.
create or replace function public.can_manage_vacancy(p_vacancy_id uuid)
returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_lead uuid;
begin
  if not public.is_recruiter() then
    return false;
  end if;

  if public.is_workspace_admin() then
    return true;
  end if;

  select lead_recruiter_id into v_lead
  from public.vacancies
  where id = p_vacancy_id;

  if not found then
    return false;
  end if;

  -- Unassigned legacy vacancies can ONLY be managed/reconciled by Workspace Admins
  if v_lead is null then
    return false;
  end if;

  return (v_lead = auth.uid());
end;
$$;
revoke all on function public.can_manage_vacancy(uuid) from public, anon;
grant execute on function public.can_manage_vacancy(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Invariants Enforcement Triggers (Server-Side Rules)
-- -----------------------------------------------------------------------------

-- Server-side trigger to set creator and default lead on vacancy creation
-- Prevents clients from spoofing creator identity or creating vacancies without a lead
create or replace function public.set_vacancy_creator_and_lead()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'authentication required to create a vacancy';
  end if;
  if not exists (select 1 from public.recruiters where user_id = v_actor) then
    raise exception 'only authorized recruiters can create vacancies';
  end if;

  -- Enforce creator identity server-side (anti-spoofing)
  new.created_by := v_actor;

  -- Default lead recruiter to creator unless workspace admin explicitly assigns an authorized recruiter
  if new.lead_recruiter_id is null or not public.is_workspace_admin() then
    new.lead_recruiter_id := v_actor;
  end if;

  -- Ensure lead recruiter is an authorized recruiter
  if not exists (select 1 from public.recruiters where user_id = new.lead_recruiter_id) then
    raise exception 'lead_recruiter_id must belong to an authorized recruiter';
  end if;

  return new;
end;
$$;

drop trigger if exists set_vacancy_creator_and_lead_trigger on public.vacancies;
create trigger set_vacancy_creator_and_lead_trigger
  before insert on public.vacancies
  for each row execute function public.set_vacancy_creator_and_lead();

-- Trigger enforcing vacancy invariants:
-- 1. created_by is strictly immutable
-- 2. lead_recruiter_id can only be re-assigned by current lead or workspace admin
-- 3. Deletion is permitted ONLY for eligible empty drafts without candidate applications
create or replace function public.enforce_vacancy_invariants()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    -- Preserve created_by as immutable
    if new.created_by is distinct from old.created_by then
      raise exception 'created_by cannot be modified';
    end if;

    -- Reassigning lead recruiter requires current lead ownership or workspace admin
    if new.lead_recruiter_id is distinct from old.lead_recruiter_id then
      if not (public.is_workspace_admin() or old.lead_recruiter_id = auth.uid()) then
        raise exception 'only the lead recruiter or a workspace administrator can reassign vacancy leadership';
      end if;
      if new.lead_recruiter_id is not null and not exists (select 1 from public.recruiters where user_id = new.lead_recruiter_id) then
        raise exception 'new lead recruiter must be an authorized recruiter';
      end if;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    -- Vacancies with applicants or active history cannot be permanently deleted
    if old.status != 'draft' then
      raise exception 'only draft vacancies can be permanently deleted; active or closed vacancies must be closed or archived';
    end if;
    if exists (select 1 from public.applications where vacancy_id = old.id) then
      raise exception 'cannot delete vacancy with submitted candidate applications or recruitment history';
    end if;
    if not (public.is_workspace_admin() or old.lead_recruiter_id = auth.uid()) then
      raise exception 'unauthorized to delete this vacancy';
    end if;
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_vacancy_invariants_trigger on public.vacancies;
create trigger enforce_vacancy_invariants_trigger
  before update or delete on public.vacancies
  for each row execute function public.enforce_vacancy_invariants();

-- -----------------------------------------------------------------------------
-- 5. Least-Privilege Row Level Security (RLS) Audit & Replacement
-- -----------------------------------------------------------------------------

-- Drop broad legacy policy that granted all recruiters full update/delete across all vacancies
drop policy if exists recruiter_vacancies_all on public.vacancies;
drop policy if exists recruiter_vacancies_read on public.vacancies;
drop policy if exists recruiter_vacancies_insert on public.vacancies;
drop policy if exists recruiter_vacancies_update on public.vacancies;
drop policy if exists recruiter_vacancies_delete on public.vacancies;

-- Read: All authenticated recruiters can view vacancies in the workspace
create policy recruiter_vacancies_read on public.vacancies
  for select to authenticated
  using (public.is_recruiter());

-- Insert: Authorized recruiters can create vacancies (trigger sets created_by and lead_recruiter_id)
create policy recruiter_vacancies_insert on public.vacancies
  for insert to authenticated
  with check (public.is_recruiter() and created_by = auth.uid());

-- Update: ONLY Lead Recruiter or Workspace Admin can edit/publish/close/reopen vacancies
create policy recruiter_vacancies_update on public.vacancies
  for update to authenticated
  using (public.is_recruiter() and (public.is_workspace_admin() or lead_recruiter_id = auth.uid()))
  with check (public.is_recruiter() and (public.is_workspace_admin() or lead_recruiter_id = auth.uid()));

-- Delete: ONLY Lead Recruiter or Workspace Admin can delete, restricted to empty drafts
create policy recruiter_vacancies_delete on public.vacancies
  for delete to authenticated
  using (
    public.is_recruiter()
    and (public.is_workspace_admin() or lead_recruiter_id = auth.uid())
    and status = 'draft'
    and not exists (select 1 from public.applications where vacancy_id = id)
  );

-- Drop broad legacy screening questions policy
drop policy if exists recruiter_questions_all on public.screening_questions;
drop policy if exists recruiter_questions_read on public.screening_questions;
drop policy if exists recruiter_questions_write on public.screening_questions;

-- Screening Questions RLS: Collaborators cannot edit questions; only Lead or Admin can modify
create policy recruiter_questions_read on public.screening_questions
  for select to authenticated
  using (public.is_recruiter());

create policy recruiter_questions_write on public.screening_questions
  for all to authenticated
  using (
    public.is_recruiter()
    and exists (
      select 1 from public.vacancies v
      where v.id = screening_questions.vacancy_id
        and (public.is_workspace_admin() or v.lead_recruiter_id = auth.uid())
    )
  )
  with check (
    public.is_recruiter()
    and exists (
      select 1 from public.vacancies v
      where v.id = screening_questions.vacancy_id
        and (public.is_workspace_admin() or v.lead_recruiter_id = auth.uid())
    )
  );

-- Vacancy Collaborators RLS
alter table public.vacancy_collaborators enable row level security;

drop policy if exists vacancy_collaborators_read on public.vacancy_collaborators;
drop policy if exists vacancy_collaborators_insert on public.vacancy_collaborators;
drop policy if exists vacancy_collaborators_delete on public.vacancy_collaborators;

create policy vacancy_collaborators_read on public.vacancy_collaborators
  for select to authenticated
  using (public.is_recruiter());

-- Only Lead Recruiter or Workspace Admin can add collaborating recruiters
create policy vacancy_collaborators_insert on public.vacancy_collaborators
  for insert to authenticated
  with check (
    public.is_recruiter()
    and public.can_manage_vacancy(vacancy_id)
    and exists (select 1 from public.recruiters where user_id = recruiter_id)
  );

-- Lead Recruiter, Workspace Admin, OR the collaborator themselves can remove/leave assignment
create policy vacancy_collaborators_delete on public.vacancy_collaborators
  for delete to authenticated
  using (
    public.is_recruiter()
    and (public.can_manage_vacancy(vacancy_id) or recruiter_id = auth.uid())
  );

revoke all on public.vacancy_collaborators from public, anon;
grant select, insert, delete on public.vacancy_collaborators to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Stored Procedures: Safe Lead Assignment & Collaboration
-- -----------------------------------------------------------------------------

-- Assign or Reconcile Lead Recruiter
create or replace function public.assign_lead_recruiter(
  p_vacancy_id uuid,
  p_recruiter_id uuid
) returns public.vacancies
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_vacancy public.vacancies;
begin
  if v_actor is null or not public.is_recruiter() then
    raise exception 'recruiter access required';
  end if;

  if not exists (select 1 from public.recruiters where user_id = p_recruiter_id) then
    raise exception 'target user is not an authorized recruiter';
  end if;

  -- Requires lead ownership or workspace admin (unassigned vacancies require workspace admin)
  if not (public.is_workspace_admin() or exists (
    select 1 from public.vacancies v where v.id = p_vacancy_id and v.lead_recruiter_id = v_actor
  )) then
    raise exception 'unauthorized: only the lead recruiter or a workspace administrator can assign lead ownership';
  end if;

  update public.vacancies
    set lead_recruiter_id = p_recruiter_id,
        updated_at = now()
    where id = p_vacancy_id
    returning * into v_vacancy;

  if not found then
    raise exception 'vacancy not found';
  end if;

  -- Remove from collaborators if previously assigned as collaborator
  delete from public.vacancy_collaborators
    where vacancy_id = p_vacancy_id and recruiter_id = p_recruiter_id;

  return v_vacancy;
end;
$$;
revoke all on function public.assign_lead_recruiter(uuid, uuid) from public, anon;
grant execute on function public.assign_lead_recruiter(uuid, uuid) to authenticated;

-- Add Vacancy Collaborator
create or replace function public.add_vacancy_collaborator(
  p_vacancy_id uuid,
  p_recruiter_id uuid
) returns public.vacancy_collaborators
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_lead uuid;
  v_result public.vacancy_collaborators;
begin
  if v_actor is null or not public.is_recruiter() then
    raise exception 'recruiter access required';
  end if;

  if not exists (select 1 from public.recruiters where user_id = p_recruiter_id) then
    raise exception 'target user is not an authorized recruiter';
  end if;

  if not public.can_manage_vacancy(p_vacancy_id) then
    raise exception 'unauthorized: only the lead recruiter or a workspace administrator can add collaborators';
  end if;

  select lead_recruiter_id into v_lead from public.vacancies where id = p_vacancy_id;
  if not found then
    raise exception 'vacancy not found';
  end if;

  if v_lead = p_recruiter_id then
    raise exception 'cannot add lead recruiter as collaborator';
  end if;

  insert into public.vacancy_collaborators(vacancy_id, recruiter_id, assigned_by)
  values (p_vacancy_id, p_recruiter_id, v_actor)
  returning * into v_result;

  return v_result;
end;
$$;
revoke all on function public.add_vacancy_collaborator(uuid, uuid) from public, anon;
grant execute on function public.add_vacancy_collaborator(uuid, uuid) to authenticated;

-- Remove Vacancy Collaborator
create or replace function public.remove_vacancy_collaborator(
  p_vacancy_id uuid,
  p_recruiter_id uuid
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.is_recruiter() then
    raise exception 'recruiter access required';
  end if;

  -- Authorized if user can manage the vacancy OR if the collaborator is voluntarily removing themselves
  if not (public.can_manage_vacancy(p_vacancy_id) or p_recruiter_id = v_actor) then
    raise exception 'unauthorized to remove collaborator from this vacancy';
  end if;

  delete from public.vacancy_collaborators
    where vacancy_id = p_vacancy_id and recruiter_id = p_recruiter_id;

  return true;
end;
$$;
revoke all on function public.remove_vacancy_collaborator(uuid, uuid) from public, anon;
grant execute on function public.remove_vacancy_collaborator(uuid, uuid) to authenticated;
