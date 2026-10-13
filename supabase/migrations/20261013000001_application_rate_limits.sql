create table public.application_rate_limits (
  rate_key text not null,
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (rate_key, window_start)
);
create index application_rate_limits_cleanup_idx on public.application_rate_limits(window_start);

alter table public.application_rate_limits enable row level security;
revoke all on public.application_rate_limits from public, anon, authenticated;

create or replace function public.consume_application_rate_limits(
  p_keys text[], p_limits integer[], p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window timestamptz;
  v_count integer;
  i integer;
begin
  if coalesce(array_length(p_keys, 1), 0) = 0
     or array_length(p_keys, 1) <> array_length(p_limits, 1)
     or p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit parameters';
  end if;
  v_window := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);
  for i in 1..array_length(p_keys, 1) loop
    if p_keys[i] is null or length(p_keys[i]) > 200 or p_limits[i] < 1 or p_limits[i] > 1000 then
      raise exception 'invalid rate limit parameters';
    end if;
    insert into public.application_rate_limits(rate_key, window_start, request_count)
    values (p_keys[i], v_window, 1)
    on conflict (rate_key, window_start) do update
      set request_count = public.application_rate_limits.request_count + 1
    returning request_count into v_count;
    if v_count > p_limits[i] then return false; end if;
  end loop;
  delete from public.application_rate_limits where window_start < v_now - interval '2 days';
  return true;
end;
$$;

revoke all on function public.consume_application_rate_limits(text[], integer[], integer) from public, anon, authenticated;
grant execute on function public.consume_application_rate_limits(text[], integer[], integer) to service_role;
