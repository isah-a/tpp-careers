create type public.application_stage as enum ('screening','review','interview','offer','hired','rejected');
create type public.workplace_type as enum ('onsite','hybrid','remote');

alter table public.vacancies
  add column department text,
  add column workplace_type public.workplace_type not null default 'onsite',
  add column compensation_min numeric(14,2),
  add column compensation_max numeric(14,2),
  add column compensation_currency text not null default 'NGN' check (compensation_currency ~ '^[A-Z]{3}$'),
  add column start_date date,
  add column skills text[] not null default '{}',
  add column benefits text[] not null default '{}',
  add constraint vacancies_compensation_range check (
    (compensation_min is null or compensation_min >= 0)
    and (compensation_max is null or compensation_max >= 0)
    and (compensation_min is null or compensation_max is null or compensation_max >= compensation_min)
  );

alter table public.applications
  add column stage public.application_stage not null default 'screening',
  add column stage_updated_at timestamptz not null default now();

create table public.job_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  title text not null,
  description text not null,
  requirements text not null,
  department text,
  location text not null,
  workplace_type public.workplace_type not null default 'onsite',
  employment_type text not null,
  compensation_min numeric(14,2),
  compensation_max numeric(14,2),
  compensation_currency text not null default 'NGN' check (compensation_currency ~ '^[A-Z]{3}$'),
  skills text[] not null default '{}',
  benefits text[] not null default '{}',
  screening_questions jsonb not null default '[]'::jsonb check (jsonb_typeof(screening_questions) = 'array'),
  created_by uuid not null default auth.uid() references public.recruiters(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_templates_compensation_range check (
    (compensation_min is null or compensation_min >= 0)
    and (compensation_max is null or compensation_max >= 0)
    and (compensation_min is null or compensation_max is null or compensation_max >= compensation_min)
  )
);

create table public.application_reviews (
  application_id uuid not null references public.applications(id) on delete cascade,
  reviewer_id uuid not null default auth.uid() references public.recruiters(user_id),
  rating smallint not null check (rating between 1 and 5),
  assessment text not null default '' check (char_length(assessment) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (application_id, reviewer_id)
);

create table public.application_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.recruiters(user_id),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_stage_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  from_stage public.application_stage,
  to_stage public.application_stage not null,
  changed_by uuid not null references public.recruiters(user_id),
  note text check (note is null or char_length(note) <= 2000),
  changed_at timestamptz not null default now()
);

create index applications_stage_idx on public.applications(stage, stage_updated_at desc);
create index application_notes_application_idx on public.application_notes(application_id, created_at desc);
create index application_history_application_idx on public.application_stage_history(application_id, changed_at desc);
create index application_reviews_application_idx on public.application_reviews(application_id, updated_at desc);

create trigger job_templates_touch before update on public.job_templates for each row execute function public.touch_updated_at();
create trigger application_reviews_touch before update on public.application_reviews for each row execute function public.touch_updated_at();
create trigger application_notes_touch before update on public.application_notes for each row execute function public.touch_updated_at();

drop policy recruiters_read_self on public.recruiters;
create policy recruiter_directory_read on public.recruiters for select to authenticated using (public.is_recruiter());

alter table public.job_templates enable row level security;
alter table public.application_reviews enable row level security;
alter table public.application_notes enable row level security;
alter table public.application_stage_history enable row level security;

create policy recruiter_templates_read on public.job_templates for select to authenticated using (public.is_recruiter());
create policy recruiter_templates_insert_own on public.job_templates for insert to authenticated
  with check (public.is_recruiter() and created_by = auth.uid());
create policy recruiter_templates_update_own on public.job_templates for update to authenticated
  using (public.is_recruiter() and created_by = auth.uid())
  with check (public.is_recruiter() and created_by = auth.uid());
create policy recruiter_templates_delete_own on public.job_templates for delete to authenticated
  using (public.is_recruiter() and created_by = auth.uid());
create policy recruiter_reviews_read on public.application_reviews for select to authenticated using (public.is_recruiter());
create policy recruiter_reviews_insert_own on public.application_reviews for insert to authenticated
  with check (public.is_recruiter() and reviewer_id = auth.uid());
create policy recruiter_reviews_update_own on public.application_reviews for update to authenticated
  using (public.is_recruiter() and reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());
create policy recruiter_notes_read on public.application_notes for select to authenticated using (public.is_recruiter());
create policy recruiter_notes_insert_own on public.application_notes for insert to authenticated
  with check (public.is_recruiter() and author_id = auth.uid());
create policy recruiter_notes_update_own on public.application_notes for update to authenticated
  using (public.is_recruiter() and author_id = auth.uid()) with check (author_id = auth.uid());
create policy recruiter_notes_delete_own on public.application_notes for delete to authenticated
  using (public.is_recruiter() and author_id = auth.uid());
create policy recruiter_history_read on public.application_stage_history for select to authenticated using (public.is_recruiter());

revoke all on public.job_templates, public.application_reviews, public.application_notes, public.application_stage_history from public, anon, authenticated;
grant select, insert, update, delete on public.job_templates to authenticated;
grant select, insert, update on public.application_reviews to authenticated;
grant select, insert, update, delete on public.application_notes to authenticated;
grant select on public.application_stage_history to authenticated;

create or replace function public.transition_application_stage(
  p_application_id uuid,
  p_to_stage public.application_stage,
  p_note text default null
) returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_application public.applications;
  v_from public.application_stage;
begin
  if v_actor is null or not public.is_recruiter() then raise exception 'recruiter access required'; end if;
  if p_note is not null and char_length(p_note) > 2000 then raise exception 'stage note is too long'; end if;
  select stage into v_from from public.applications where id = p_application_id for update;
  if not found then raise exception 'application not found'; end if;
  if v_from = p_to_stage then select * into v_application from public.applications where id = p_application_id; return v_application; end if;
  update public.applications set stage = p_to_stage, stage_updated_at = now() where id = p_application_id returning * into v_application;
  insert into public.application_stage_history(application_id, from_stage, to_stage, changed_by, note)
  values (p_application_id, v_from, p_to_stage, v_actor, nullif(btrim(p_note), ''));
  return v_application;
end;
$$;

revoke all on function public.transition_application_stage(uuid, public.application_stage, text) from public, anon;
grant execute on function public.transition_application_stage(uuid, public.application_stage, text) to authenticated;

create or replace view public.public_vacancies with (security_barrier = true) as
  select id,title,slug,description,requirements,location,employment_type,deadline,status,created_at,
         department,workplace_type,compensation_min,compensation_max,compensation_currency,start_date,skills,benefits
  from public.vacancies where status = 'active' and (deadline is null or deadline >= current_date);
grant select on public.public_vacancies to anon, authenticated;

comment on table public.application_reviews is 'Private recruiter assessments. Composite primary key prevents one recruiter overwriting another recruiter assessment.';
comment on function public.transition_application_stage is 'Recruiter-only atomic application stage transition with immutable attribution history.';
