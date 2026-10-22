-- Migration: 20261022000000_recruiter_ownership_and_collaboration.sql
-- Description: Implement real recruiter ownership and collaborative hiring for vacancies.
-- 1. Add lead_recruiter_id to public.vacancies with default auth.uid()
-- 2. Backfill existing vacancies where created_by is a valid recruiter
-- 3. Create public.vacancy_collaborators table with unique constraints and RLS
-- 4. Provide secure atomic RPC functions for lead recruiter and collaborator management

-- 1. Add lead_recruiter_id to vacancies
alter table public.vacancies
  add column if not exists lead_recruiter_id uuid references public.recruiters(user_id) on delete set null default auth.uid();

create index if not exists vacancies_lead_recruiter_idx on public.vacancies(lead_recruiter_id);

-- Backfill existing vacancies: assign lead_recruiter_id to created_by if created_by is a valid recruiter
update public.vacancies
  set lead_recruiter_id = created_by
  where lead_recruiter_id is null
    and created_by in (select user_id from public.recruiters);

-- 2. Add role column to recruiters (if not present) to support workspace admin rights
alter table public.recruiters
  add column if not exists role text not null default 'recruiter' check (role in ('recruiter', 'admin'));

-- Helper function: is_workspace_admin
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

-- Helper function: can_manage_vacancy
-- Returns true if user is authorized to manage the vacancy (lead recruiter, creator, or workspace admin,
-- or if vacancy is unassigned and user is an authorized recruiter)
create or replace function public.can_manage_vacancy(p_vacancy_id uuid)
returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_lead uuid;
  v_creator uuid;
begin
  if not public.is_recruiter() then
    return false;
  end if;

  if public.is_workspace_admin() then
    return true;
  end if;

  select lead_recruiter_id, created_by into v_lead, v_creator
  from public.vacancies
  where id = p_vacancy_id;

  if not found then
    return false;
  end if;

  -- If vacancy has no lead recruiter yet, any authorized recruiter can claim/assign
  if v_lead is null then
    return true;
  end if;

  return (v_lead = auth.uid() or v_creator = auth.uid());
end;
$$;
revoke all on function public.can_manage_vacancy(uuid) from public, anon;
grant execute on function public.can_manage_vacancy(uuid) to authenticated;

-- 3. Create vacancy_collaborators table
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

-- 4. Row Level Security for vacancy_collaborators
alter table public.vacancy_collaborators enable row level security;

-- Drop existing policies if re-running
drop policy if exists vacancy_collaborators_read on public.vacancy_collaborators;
drop policy if exists vacancy_collaborators_insert on public.vacancy_collaborators;
drop policy if exists vacancy_collaborators_delete on public.vacancy_collaborators;

-- Recruiter directory members can read collaborators
create policy vacancy_collaborators_read on public.vacancy_collaborators
  for select to authenticated
  using (public.is_recruiter());

-- Only authorized recruiter (lead, creator, or admin) can insert collaborators
-- Cannot assign an entity that is not in the recruiters directory
create policy vacancy_collaborators_insert on public.vacancy_collaborators
  for insert to authenticated
  with check (
    public.is_recruiter()
    and public.can_manage_vacancy(vacancy_id)
    and exists (select 1 from public.recruiters where user_id = recruiter_id)
  );

-- Only authorized recruiter (lead, creator, or admin) OR the collaborator themselves can remove
create policy vacancy_collaborators_delete on public.vacancy_collaborators
  for delete to authenticated
  using (
    public.is_recruiter()
    and (public.can_manage_vacancy(vacancy_id) or recruiter_id = auth.uid())
  );

-- Permissions
revoke all on public.vacancy_collaborators from public, anon;
grant select, insert, delete on public.vacancy_collaborators to authenticated;

-- 5. Stored Procedures for atomic and safe recruiter team operations

-- Assign Lead Recruiter
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

  if not public.can_manage_vacancy(p_vacancy_id) then
    raise exception 'unauthorized to assign lead recruiter for this vacancy';
  end if;

  update public.vacancies
    set lead_recruiter_id = p_recruiter_id,
        updated_at = now()
    where id = p_vacancy_id
    returning * into v_vacancy;

  if not found then
    raise exception 'vacancy not found';
  end if;

  -- If the new lead was previously in collaborators, remove them to prevent duplicate role
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
    raise exception 'unauthorized to manage collaborators for this vacancy';
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
