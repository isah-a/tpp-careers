alter table public.applications
  add column email_normalized text generated always as (lower(btrim(email))) stored,
  add column duplicate_constraint_exempt boolean not null default false,
  add column ai_review_consent boolean not null default false,
  add column ai_review_consented_at timestamptz,
  add column ai_review_consent_version text,
  add column ai_review_consent_withdrawn_at timestamptz,
  add column ai_review_consent_active boolean generated always as (
    ai_review_consent = true and ai_review_consent_withdrawn_at is null
  ) stored,
  add constraint applications_ai_review_consent_state check (
    (ai_review_consent = true and ai_review_consented_at is not null and ai_review_consent_version is not null)
    or
    (ai_review_consent = false and ai_review_consented_at is null and ai_review_consent_version is null and ai_review_consent_withdrawn_at is null)
  );

with ranked as (
  select id, row_number() over (
    partition by vacancy_id, lower(btrim(email))
    order by created_at, id
  ) as duplicate_number
  from public.applications
)
update public.applications applications
set duplicate_constraint_exempt = true
from ranked
where applications.id = ranked.id and ranked.duplicate_number > 1;

create function public.protect_duplicate_constraint_exemption()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.duplicate_constraint_exempt = true then
    raise exception 'duplicate_constraint_exempt is reserved for migration-preserved records';
  end if;
  if tg_op = 'UPDATE' and new.duplicate_constraint_exempt is distinct from old.duplicate_constraint_exempt then
    raise exception 'duplicate_constraint_exempt is immutable';
  end if;
  return new;
end;
$$;

create trigger applications_protect_duplicate_constraint_exemption
before insert or update of duplicate_constraint_exempt on public.applications
for each row execute function public.protect_duplicate_constraint_exemption();
revoke all on function public.protect_duplicate_constraint_exemption() from public, anon, authenticated;

create unique index applications_one_email_per_vacancy_idx
  on public.applications(vacancy_id, email_normalized)
  where duplicate_constraint_exempt = false;

comment on column public.applications.duplicate_constraint_exempt is
  'Marks historical duplicate rows preserved during unique-index rollout. New application writes must leave this false.';
comment on column public.applications.ai_review_consent_withdrawn_at is
  'Set by an authorized privacy workflow when previously granted consent is withdrawn.';
comment on column public.applications.ai_review_consent_active is
  'Future AI processing must require this value to be true. It is false when consent was declined or withdrawn.';

create or replace function public.consume_application_rate_limits_v2(
  p_keys text[], p_limits integer[], p_window_seconds integer[]
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_window timestamptz;
  v_count integer;
  v_retry integer := 0;
  i integer;
begin
  if coalesce(array_length(p_keys, 1), 0) = 0
     or array_length(p_keys, 1) <> array_length(p_limits, 1)
     or array_length(p_keys, 1) <> array_length(p_window_seconds, 1)
     or array_length(p_keys, 1) <> (select count(distinct key) from unnest(p_keys) as keys(key)) then
    raise exception 'invalid rate limit parameters';
  end if;

  for i in 1..array_length(p_keys, 1) loop
    if p_keys[i] is null or length(p_keys[i]) > 200
       or p_limits[i] < 1 or p_limits[i] > 1000
       or p_window_seconds[i] < 60 or p_window_seconds[i] > 86400 then
      raise exception 'invalid rate limit parameters';
    end if;
  end loop;

  -- Serialize each bucket in deterministic key order so concurrent requests
  -- cannot both pass before either increment is visible.
  for i in select s.i from generate_subscripts(p_keys, 1) s(i) order by p_keys[s.i] loop
    perform pg_advisory_xact_lock(hashtextextended(p_keys[i], 0));
  end loop;

  -- Capture time after lock acquisition so a request waiting across a fixed-
  -- window boundary is evaluated against the current window, not a stale one.
  v_now := clock_timestamp();

  for i in 1..array_length(p_keys, 1) loop
    v_window := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds[i]) * p_window_seconds[i]);
    select request_count into v_count
    from public.application_rate_limits
    where rate_key = p_keys[i] and window_start = v_window;
    if coalesce(v_count, 0) >= p_limits[i] then
      v_retry := greatest(v_retry, ceil(extract(epoch from (v_window + make_interval(secs => p_window_seconds[i]) - v_now)))::integer);
    end if;
  end loop;

  if v_retry > 0 then
    return jsonb_build_object('allowed', false, 'retry_after', greatest(v_retry, 1));
  end if;

  for i in 1..array_length(p_keys, 1) loop
    v_window := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds[i]) * p_window_seconds[i]);
    insert into public.application_rate_limits(rate_key, window_start, request_count)
    values (p_keys[i], v_window, 1)
    on conflict (rate_key, window_start) do update
      set request_count = public.application_rate_limits.request_count + 1;
  end loop;

  delete from public.application_rate_limits where window_start < v_now - interval '2 days';
  return jsonb_build_object('allowed', true, 'retry_after', 0);
end;
$$;

revoke all on function public.consume_application_rate_limits_v2(text[], integer[], integer[]) from public, anon, authenticated;
grant execute on function public.consume_application_rate_limits_v2(text[], integer[], integer[]) to service_role;
