create extension if not exists pgcrypto;

create type public.vacancy_status as enum ('draft','active','closed');
create type public.question_type as enum ('text','yes_no','single_select');

create table public.recruiters (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 120),
  created_at timestamptz not null default now()
);
create table public.vacancies (
  id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
  client_name text not null, description text not null, requirements text not null, location text not null,
  employment_type text not null, deadline date, status public.vacancy_status not null default 'draft',
  created_by uuid not null default auth.uid() references public.recruiters(user_id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint vacancy_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
create table public.screening_questions (
  id uuid primary key default gen_random_uuid(), vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  label text not null, type public.question_type not null, required boolean not null default false,
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'), sort_order integer not null default 0,
  unique(vacancy_id, sort_order)
);
create table public.applications (
  id uuid primary key default gen_random_uuid(), vacancy_id uuid not null references public.vacancies(id) on delete restrict,
  full_name text not null, email text not null, phone text not null, cv_path text not null unique,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  privacy_acknowledged_at timestamptz not null, created_at timestamptz not null default now()
);
create index vacancies_public_idx on public.vacancies(status, deadline, created_at desc);
create index screening_questions_vacancy_idx on public.screening_questions(vacancy_id, sort_order);
create index applications_vacancy_created_idx on public.applications(vacancy_id, created_at desc);
create index applications_vacancy_email_idx on public.applications(vacancy_id, lower(email));

create function public.is_recruiter() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.recruiters where user_id = auth.uid());
$$;
revoke all on function public.is_recruiter() from public;
grant execute on function public.is_recruiter() to authenticated;

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
create trigger vacancies_touch before update on public.vacancies for each row execute function public.touch_updated_at();

alter table public.recruiters enable row level security;
alter table public.vacancies enable row level security;
alter table public.screening_questions enable row level security;
alter table public.applications enable row level security;
create policy recruiters_read_self on public.recruiters for select to authenticated using (user_id = auth.uid());
create policy recruiter_vacancies_all on public.vacancies for all to authenticated using (public.is_recruiter()) with check (public.is_recruiter());
create policy recruiter_questions_all on public.screening_questions for all to authenticated using (public.is_recruiter()) with check (public.is_recruiter());
create policy recruiter_applications_read on public.applications for select to authenticated using (public.is_recruiter());

revoke all on public.recruiters, public.vacancies, public.screening_questions, public.applications from anon, authenticated;
grant select on public.recruiters to authenticated;
grant select, insert, update, delete on public.vacancies, public.screening_questions to authenticated;
grant select on public.applications to authenticated;

create view public.public_vacancies with (security_barrier = true) as
  select id,title,slug,description,requirements,location,employment_type,deadline,status,created_at
  from public.vacancies where status = 'active' and (deadline is null or deadline >= current_date);
create view public.public_screening_questions with (security_barrier = true) as
  select q.id,q.vacancy_id,q.label,q.type,q.required,q.options,q.sort_order
  from public.screening_questions q join public.vacancies v on v.id=q.vacancy_id
  where v.status='active' and (v.deadline is null or v.deadline >= current_date);
revoke all on public.public_vacancies, public.public_screening_questions from public;
grant select on public.public_vacancies, public.public_screening_questions to anon, authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('cvs','cvs',false,5242880,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy recruiter_cv_read on storage.objects for select to authenticated using (bucket_id='cvs' and public.is_recruiter());

comment on view public.public_vacancies is 'Public-safe vacancy projection; deliberately excludes client_name and created_by.';
