-- Migration: Additive internal interview scheduling with immutable identities, audit history, and overlap checking
-- File: supabase/migrations/20261021000000_interview_scheduling.sql

-- 1. Main interviews table (normalized without redundant vacancy_id)
create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 45 check (duration_minutes between 10 and 480),
  timezone text not null default 'UTC',
  format text not null check (format in ('online', 'phone', 'in_person')),
  location_or_link text not null check (char_length(btrim(location_or_link)) between 1 and 2000),
  notes text check (notes is null or char_length(notes) <= 5000),
  status text not null default 'scheduled' check (status in ('scheduled', 'rescheduled', 'completed', 'cancelled')),
  cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 1000),
  created_by uuid not null default auth.uid() references public.recruiters(user_id),
  updated_by uuid not null default auth.uid() references public.recruiters(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Interview audit history table (preserves permanent audit records)
create table if not exists public.interview_history (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  action text not null check (action in ('created', 'rescheduled', 'updated', 'cancelled', 'completed')),
  scheduled_at timestamptz not null,
  duration_minutes integer not null,
  timezone text not null,
  format text not null,
  location_or_link text not null,
  notes text,
  status text not null,
  cancellation_reason text,
  changed_by uuid not null references public.recruiters(user_id),
  changed_at timestamptz not null default now()
);

-- 3. Indexes for candidate lookups, status filtering, and audit history
create index if not exists interviews_application_idx on public.interviews(application_id, scheduled_at desc);
create index if not exists interviews_scheduled_status_idx on public.interviews(scheduled_at, status);
create index if not exists interview_history_interview_idx on public.interview_history(interview_id, changed_at desc);

-- 4. Trigger to validate future date/time, timezone, format details, immutable fields, and terminal status
create or replace function public.validate_interview_schedule()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- 4.1. Enforce authenticated caller and derive updated_by
  if auth.uid() is null then
    raise exception 'Authentication required to schedule or modify interviews';
  end if;

  new.updated_by = auth.uid();

  -- 4.2. On INSERT, derive created_by from authenticated user
  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
  end if;

  -- 4.3. On UPDATE, prevent modifying terminal appointments
  if tg_op = 'UPDATE' then
    if old.status in ('completed', 'cancelled') then
      raise exception 'Appointments with terminal status (%) cannot be modified. Please schedule a new appointment.', old.status;
    end if;

    -- 4.4. Prevent changing immutable identity fields
    if new.created_by is distinct from old.created_by then
      raise exception 'created_by cannot be changed after appointment creation';
    end if;
    if new.application_id is distinct from old.application_id then
      raise exception 'application_id cannot be changed after appointment creation';
    end if;
    if new.created_at is distinct from old.created_at then
      raise exception 'created_at cannot be changed after appointment creation';
    end if;
  end if;

  -- 4.5. Format-specific location/link validation
  if new.format = 'online' and (new.location_or_link is null or btrim(new.location_or_link) = '') then
    raise exception 'Online interviews require a meeting link or platform details';
  end if;
  if new.format = 'in_person' and (new.location_or_link is null or btrim(new.location_or_link) = '') then
    raise exception 'In-person interviews require a physical address or room location';
  end if;
  if new.format = 'phone' and (new.location_or_link is null or btrim(new.location_or_link) = '') then
    raise exception 'Phone interviews require a contact telephone number';
  end if;

  -- 4.6. Timezone validation using PostgreSQL built-in timezone conversion
  begin
    perform now() at time zone new.timezone;
  exception when others then
    raise exception 'Invalid timezone identifier: %', new.timezone;
  end;

  -- 4.7. Validate that newly scheduled or rescheduled appointments are in the future (5-minute margin)
  if (tg_op = 'INSERT' or new.scheduled_at is distinct from old.scheduled_at)
     and new.status in ('scheduled', 'rescheduled') then
    if new.scheduled_at < (now() - interval '5 minutes') then
      raise exception 'Interview appointment must be scheduled for a future date and time.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists interviews_validate_schedule on public.interviews;
create trigger interviews_validate_schedule
  before insert or update on public.interviews
  for each row execute function public.validate_interview_schedule();

-- 5. Standard timestamp trigger (using existing touch_updated_at)
drop trigger if exists interviews_touch on public.interviews;
create trigger interviews_touch
  before update on public.interviews
  for each row execute function public.touch_updated_at();

-- 6. Trigger to automatically record appointment audit history (tamper-proof)
create or replace function public.log_interview_history()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_action text;
  v_actor uuid;
begin
  if tg_op = 'INSERT' then
    v_action := 'created';
    v_actor := new.created_by;
  elsif new.status = 'cancelled' and (old.status is distinct from 'cancelled') then
    v_action := 'cancelled';
    v_actor := coalesce(auth.uid(), new.updated_by);
  elsif new.status = 'completed' and (old.status is distinct from 'completed') then
    v_action := 'completed';
    v_actor := coalesce(auth.uid(), new.updated_by);
  elsif new.scheduled_at is distinct from old.scheduled_at then
    v_action := 'rescheduled';
    v_actor := coalesce(auth.uid(), new.updated_by);
  else
    v_action := 'updated';
    v_actor := coalesce(auth.uid(), new.updated_by);
  end if;

  insert into public.interview_history (
    interview_id,
    action,
    scheduled_at,
    duration_minutes,
    timezone,
    format,
    location_or_link,
    notes,
    status,
    cancellation_reason,
    changed_by,
    changed_at
  ) values (
    new.id,
    v_action,
    new.scheduled_at,
    new.duration_minutes,
    new.timezone,
    new.format,
    new.location_or_link,
    new.notes,
    new.status,
    new.cancellation_reason,
    v_actor,
    now()
  );

  return new;
end;
$$;

drop trigger if exists interviews_record_history on public.interviews;
create trigger interviews_record_history
  after insert or update on public.interviews
  for each row execute function public.log_interview_history();

-- 7. Overlap detection helper RPC (provides overlap warning data)
create or replace function public.check_interview_overlap(
  p_scheduled_at timestamptz,
  p_duration_minutes integer,
  p_exclude_interview_id uuid default null
)
returns table (
  interview_id uuid,
  application_id uuid,
  candidate_name text,
  scheduled_at timestamptz,
  duration_minutes integer,
  format text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Enforce recruiter role check
  if not public.is_recruiter() then
    raise exception 'Not authorized: recruiter role required';
  end if;

  return query
  select
    i.id as interview_id,
    i.application_id,
    a.full_name as candidate_name,
    i.scheduled_at,
    i.duration_minutes,
    i.format
  from public.interviews i
  join public.applications a on a.id = i.application_id
  where i.status in ('scheduled', 'rescheduled')
    and (p_exclude_interview_id is null or i.id <> p_exclude_interview_id)
    and tstzrange(i.scheduled_at, i.scheduled_at + (i.duration_minutes || ' minutes')::interval) &&
        tstzrange(p_scheduled_at, p_scheduled_at + (p_duration_minutes || ' minutes')::interval);
end;
$$;

-- 8. Row Level Security & Explicit Role Grants
alter table public.interviews enable row level security;
alter table public.interview_history enable row level security;

-- Policies for interviews: Read, Insert, Update only (No Delete policy)
drop policy if exists recruiter_interviews_read on public.interviews;
create policy recruiter_interviews_read on public.interviews
  for select to authenticated using (public.is_recruiter());

drop policy if exists recruiter_interviews_insert on public.interviews;
create policy recruiter_interviews_insert on public.interviews
  for insert to authenticated
  with check (public.is_recruiter() and created_by = auth.uid());

drop policy if exists recruiter_interviews_update on public.interviews;
create policy recruiter_interviews_update on public.interviews
  for update to authenticated
  using (public.is_recruiter())
  with check (public.is_recruiter());

-- Policies for history: Read-only for recruiters (tamper-proof)
drop policy if exists recruiter_interview_history_read on public.interview_history;
create policy recruiter_interview_history_read on public.interview_history
  for select to authenticated using (public.is_recruiter());

-- Revoke all from public/anon
revoke all on public.interviews, public.interview_history from public, anon, authenticated;
revoke all on function public.check_interview_overlap(timestamptz, integer, uuid) from public, anon, authenticated;

-- Grant minimal necessary permissions to authenticated recruiters only
grant select, insert, update on public.interviews to authenticated;
grant select on public.interview_history to authenticated;
grant execute on function public.check_interview_overlap(timestamptz, integer, uuid) to authenticated;
