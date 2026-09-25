begin;

-- Freeze the provider/event/team binding while observations reference it.
alter table public.fixtures add constraint fixtures_statistics_binding_unique
  unique (id, provider, external_id, home_team_id, away_team_id);

create table public.team_statistics_observations (
  id uuid primary key,
  fixture_id uuid not null,
  provider text not null check (provider = 'bsd'),
  external_id text not null,
  home_team_id uuid not null,
  away_team_id uuid not null,
  observed_at timestamptz not null,
  status text not null check (status in ('complete','partial','empty','failed')),
  payload jsonb,
  created_at timestamptz not null default now(),
  unique (fixture_id, observed_at),
  foreign key (fixture_id, provider, external_id, home_team_id, away_team_id)
    references public.fixtures(id, provider, external_id, home_team_id, away_team_id),
  check (observed_at <= created_at),
  check ((status = 'failed' and payload is null) or
    (status <> 'failed' and payload is not null and
      (jsonb_typeof(payload) = 'object' and
       payload->>'provider' = provider and payload->>'event_id' = external_id and
       payload->>'state' = status and payload->>'period' = 'full_match' and
       payload->'version' = '1'::jsonb and
       jsonb_typeof(payload->'home') = 'object' and
       jsonb_typeof(payload->'away') = 'object' and
       (payload->>'fetched_at')::timestamptz = observed_at) is true))
);

alter table public.team_statistics_observations enable row level security;
revoke all on public.team_statistics_observations from public, anon, authenticated, service_role;
grant select, insert on public.team_statistics_observations to service_role;
commit;
