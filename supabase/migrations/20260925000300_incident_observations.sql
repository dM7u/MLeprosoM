begin;
create table public.incident_observations (
  id uuid primary key,
  fixture_id uuid not null,
  provider text not null check(provider='bsd'),
  external_id text not null,
  home_team_id uuid not null,
  away_team_id uuid not null,
  observed_at timestamptz not null,
  status text not null check(status in ('available','partial','empty','failed')),
  payload jsonb,
  created_at timestamptz not null default now(),
  unique(fixture_id,observed_at),
  foreign key(fixture_id,provider,external_id,home_team_id,away_team_id)
    references public.fixtures(id,provider,external_id,home_team_id,away_team_id),
  check(observed_at<=created_at),
  check((status='failed' and payload is null) or
    (status<>'failed' and payload is not null and
      (jsonb_typeof(payload)='object' and payload->'version'='1'::jsonb and
       payload->>'provider'=provider and payload->>'event_id'=external_id and
       payload->>'state'=status and payload->>'order'='provider' and
       payload->>'coverage'='unverified' and jsonb_typeof(payload->'incidents')='array' and
       (payload->>'fetched_at')::timestamptz=observed_at) is true))
);
alter table public.incident_observations enable row level security;
revoke all on public.incident_observations from public,anon,authenticated,service_role;
grant select,insert on public.incident_observations to service_role;
commit;
