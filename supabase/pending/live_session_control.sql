-- T09: local proposal. Apply only after preflight and explicit activation plan.
-- Existing migrations and projection SQL have already been applied elsewhere.
begin;

create table public.live_sessions (
  fixture_id uuid primary key references public.fixtures(id),
  enabled boolean not null default false,
  phase text not null default 'scheduled' check (phase in
    ('scheduled','waiting','first_half','halftime','second_half','extra_time','penalties','finalizing','finished','stopped','unknown')),
  next_due_at timestamptz,
  hard_stop_at timestamptz not null,
  lease_owner uuid,
  lease_until timestamptz,
  fence bigint not null default 0 check (fence >= 0),
  request_count integer not null default 0 check (request_count between 0 and 500),
  last_cycle_at timestamptz,
  created_at timestamptz not null default now(),
  check ((lease_owner is null) = (lease_until is null)),
  check (not enabled or next_due_at is not null)
);

create index live_sessions_due_idx on public.live_sessions(next_due_at)
  where enabled;

create table public.live_daily_budget (
  day_utc date primary key,
  request_count integer not null default 0 check (request_count between 0 and 1000)
);

create table public.live_requests (
  id uuid primary key,
  fixture_id uuid not null references public.live_sessions(fixture_id),
  lease_owner uuid not null,
  fence bigint not null check (fence > 0),
  resource text not null check (resource in ('fixture','lineups','incidents','statistics')),
  reserved_at timestamptz not null default now(),
  completed_at timestamptz,
  result_hash text,
  check ((completed_at is null) = (result_hash is null)),
  check (completed_at is null or completed_at >= reserved_at)
);

create index live_requests_fixture_idx on public.live_requests(fixture_id,reserved_at);

create table public.live_snapshots (
  fixture_id uuid not null references public.live_sessions(fixture_id),
  resource text not null check (resource in ('fixture','lineups','incidents','statistics')),
  last_attempt_at timestamptz not null,
  last_quality text not null check (last_quality in ('complete','partial','unavailable','empty','failed')),
  last_error_code text,
  last_good_payload jsonb,
  last_good_at timestamptz,
  last_complete_payload jsonb,
  last_complete_at timestamptz,
  source_updated_at timestamptz,
  primary key (fixture_id,resource),
  check ((last_good_payload is null) = (last_good_at is null)),
  check ((last_complete_payload is null) = (last_complete_at is null)),
  check (last_complete_at is null or last_good_at >= last_complete_at),
  check ((last_quality = 'failed') = (last_error_code is not null))
);

alter table public.live_sessions enable row level security;
alter table public.live_daily_budget enable row level security;
alter table public.live_requests enable row level security;
alter table public.live_snapshots enable row level security;
revoke all on public.live_sessions,public.live_daily_budget,
  public.live_requests,public.live_snapshots from public,anon,authenticated,service_role;
grant select on public.live_sessions,public.live_snapshots to service_role;

create function public.claim_live_session(p_fixture_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare s public.live_sessions%rowtype;
declare v_now timestamptz := clock_timestamp();
declare owner_id uuid := gen_random_uuid();
begin
  if p_fixture_id is null then raise exception 'LIVE_INVALID_FIXTURE'; end if;
  select ls.* into s from public.live_sessions ls
    join public.fixtures f on f.id=ls.fixture_id
    where ls.fixture_id=p_fixture_id and f.provider='bsd'
    for update of ls skip locked;
  if not found or not s.enabled or s.next_due_at>v_now or
     s.hard_stop_at<=v_now or s.request_count>=500 or
     (s.lease_until is not null and s.lease_until>v_now) then
    return null;
  end if;
  update public.live_sessions set lease_owner=owner_id,
    lease_until=v_now+interval '120 seconds',fence=s.fence+1,
    last_cycle_at=v_now where fixture_id=p_fixture_id;
  return jsonb_build_object('fixture_id',p_fixture_id,'owner',owner_id,
    'fence',s.fence+1,'lease_until',v_now+interval '120 seconds');
end;
$$;

create function public.reserve_live_request(p_fixture_id uuid,p_owner uuid,
  p_fence bigint,p_request_id uuid,p_resource text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare s public.live_sessions%rowtype;
declare budget public.live_daily_budget%rowtype;
declare v_now timestamptz := clock_timestamp();
declare utc_day date := (clock_timestamp() at time zone 'UTC')::date;
begin
  if p_fixture_id is null or p_owner is null or p_request_id is null or
     p_fence is null or p_fence<=0 or
     p_resource not in ('fixture','lineups','incidents','statistics') then
    raise exception 'LIVE_INVALID_RESERVATION';
  end if;
  -- Always lock daily budget before session. A timeout remains counted.
  insert into public.live_daily_budget(day_utc) values(utc_day)
    on conflict (day_utc) do nothing;
  select * into strict budget from public.live_daily_budget
    where day_utc=utc_day for update;
  select * into strict s from public.live_sessions
    where fixture_id=p_fixture_id for update;
  if not s.enabled or s.lease_owner is distinct from p_owner or
     s.fence<>p_fence or s.lease_until<=v_now or
     s.lease_until<v_now+interval '25 seconds' or
     s.hard_stop_at<=v_now then
    raise exception 'LIVE_LEASE_LOST';
  end if;
  if s.request_count>=500 or budget.request_count>=1000 then
    raise exception 'LIVE_BUDGET_EXHAUSTED';
  end if;
  insert into public.live_requests(id,fixture_id,lease_owner,fence,resource,reserved_at)
    values(p_request_id,p_fixture_id,p_owner,p_fence,p_resource,v_now);
  update public.live_sessions set request_count=request_count+1
    where fixture_id=p_fixture_id;
  update public.live_daily_budget set request_count=request_count+1
    where day_utc=utc_day;
  return jsonb_build_object('request_id',p_request_id,'reserved_at',v_now,
    'session_used',s.request_count+1,'day_used',budget.request_count+1);
end;
$$;

create function public.commit_live_snapshot(p_request_id uuid,p_owner uuid,
  p_fence bigint,p_quality text,p_payload jsonb,p_observed_at timestamptz,
  p_source_updated_at timestamptz default null,p_error_code text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare req public.live_requests%rowtype;
declare s public.live_sessions%rowtype;
declare snap public.live_snapshots%rowtype;
declare v_now timestamptz := clock_timestamp();
declare event_id text;
declare fingerprint text;
begin
  if p_request_id is null or p_owner is null or p_fence is null or
     p_observed_at is null or p_observed_at>v_now+interval '5 seconds' or
     p_quality not in ('complete','partial','unavailable','empty','failed') or
     (p_quality='failed') <> (p_error_code is not null) or
     (p_quality <> 'failed' and
       (p_payload is null or jsonb_typeof(p_payload)<>'object')) or
     (p_quality='failed' and p_payload is not null) or
     (p_quality='failed' and p_source_updated_at is not null) or
     (p_source_updated_at is not null and p_source_updated_at>p_observed_at) or
     (p_error_code is not null and p_error_code !~ '^[A-Z][A-Z0-9_]{0,79}$') then
    raise exception 'LIVE_INVALID_SNAPSHOT';
  end if;
  -- Session then request then snapshot: a stale owner cannot publish.
  select * into strict req from public.live_requests where id=p_request_id;
  select * into strict s from public.live_sessions
    where fixture_id=req.fixture_id for update;
  select * into strict req from public.live_requests
    where id=p_request_id for update;
  if req.lease_owner is distinct from p_owner or req.fence<>p_fence or
     s.lease_owner is distinct from p_owner or s.fence<>p_fence or
     s.lease_until<=v_now then
    raise exception 'LIVE_LEASE_LOST';
  end if;
  select external_id into strict event_id from public.fixtures
    where id=req.fixture_id and provider='bsd';
  if p_quality<>'failed' and
     (p_payload->>'provider' is distinct from 'bsd' or
      p_payload->>'event_id' is distinct from event_id or
      p_payload->>'version' is null) then
    raise exception 'LIVE_SNAPSHOT_IDENTITY';
  end if;
  fingerprint=encode(sha256(convert_to(jsonb_build_object(
    'quality',p_quality,'payload',p_payload,'observed_at',p_observed_at,
    'source_updated_at',p_source_updated_at,'error_code',p_error_code)::text,'UTF8')),'hex');
  if req.completed_at is not null then
    if req.result_hash=fingerprint then
      return jsonb_build_object('stored',false,'replay',true,
        'fixture_id',req.fixture_id,'resource',req.resource,'quality',p_quality);
    end if;
    raise exception 'LIVE_REQUEST_CONFLICT';
  end if;
  if p_observed_at<req.reserved_at-interval '30 seconds' then
    raise exception 'LIVE_INVALID_SNAPSHOT';
  end if;
  select * into snap from public.live_snapshots
    where fixture_id=req.fixture_id and resource=req.resource for update;
  if found and p_observed_at<=snap.last_attempt_at then
    raise exception 'LIVE_OBSERVATION_REGRESSION';
  end if;
  insert into public.live_snapshots(fixture_id,resource,last_attempt_at,last_quality,
    last_error_code,last_good_payload,last_good_at,last_complete_payload,
    last_complete_at,source_updated_at)
  values(req.fixture_id,req.resource,p_observed_at,p_quality,p_error_code,
    case when p_quality in ('complete','partial') then p_payload
         else snap.last_good_payload end,
    case when p_quality in ('complete','partial') then p_observed_at
         else snap.last_good_at end,
    case when p_quality='complete' then p_payload
         else snap.last_complete_payload end,
    case when p_quality='complete' then p_observed_at
         else snap.last_complete_at end,
    case when p_quality in ('complete','partial') then p_source_updated_at
         else snap.source_updated_at end)
  on conflict (fixture_id,resource) do update set
    last_attempt_at=excluded.last_attempt_at,last_quality=excluded.last_quality,
    last_error_code=excluded.last_error_code,
    last_good_payload=excluded.last_good_payload,last_good_at=excluded.last_good_at,
    last_complete_payload=excluded.last_complete_payload,
    last_complete_at=excluded.last_complete_at,
    source_updated_at=excluded.source_updated_at;
  update public.live_requests set completed_at=v_now,result_hash=fingerprint
    where id=p_request_id;
  return jsonb_build_object('stored',true,'fixture_id',req.fixture_id,
    'resource',req.resource,'quality',p_quality);
end;
$$;

create function public.finish_live_cycle(p_fixture_id uuid,p_owner uuid,
  p_fence bigint,p_phase text,p_next_due_at timestamptz,p_stop boolean default false)
returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare s public.live_sessions%rowtype;
declare v_now timestamptz := clock_timestamp();
begin
  if p_fixture_id is null or p_owner is null or p_fence is null or
     p_stop is null or p_phase not in
     ('scheduled','waiting','first_half','halftime','second_half','extra_time','penalties','finalizing','finished','stopped','unknown') or
     (not p_stop and (p_next_due_at is null or p_next_due_at<v_now or
       p_next_due_at>v_now+interval '900 seconds')) or
     (p_stop and p_next_due_at is not null) then
    raise exception 'LIVE_INVALID_FINISH';
  end if;
  select * into strict s from public.live_sessions
    where fixture_id=p_fixture_id for update;
  if s.lease_owner is distinct from p_owner or s.fence<>p_fence or
     s.lease_until<=v_now then raise exception 'LIVE_LEASE_LOST'; end if;
  update public.live_sessions set lease_owner=null,lease_until=null,
    phase=p_phase,next_due_at=p_next_due_at,enabled=not p_stop
    where fixture_id=p_fixture_id;
  return true;
end;
$$;

revoke all on function public.claim_live_session(uuid),
  public.reserve_live_request(uuid,uuid,bigint,uuid,text),
  public.commit_live_snapshot(uuid,uuid,bigint,text,jsonb,timestamptz,timestamptz,text),
  public.finish_live_cycle(uuid,uuid,bigint,text,timestamptz,boolean)
  from public,anon,authenticated;
grant execute on function public.claim_live_session(uuid),
  public.reserve_live_request(uuid,uuid,bigint,uuid,text),
  public.commit_live_snapshot(uuid,uuid,bigint,text,jsonb,timestamptz,timestamptz,text),
  public.finish_live_cycle(uuid,uuid,bigint,text,timestamptz,boolean)
  to service_role;
commit;
