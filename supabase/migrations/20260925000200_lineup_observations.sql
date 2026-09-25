begin;
-- Required to bind provider player lists to the actual local/visitor identities.
alter table public.teams add constraint teams_lineup_binding_unique unique (provider,id,external_id);
create table public.lineup_observations (
  id uuid primary key,
  fixture_id uuid not null,
  provider text not null check (provider='bsd'),
  external_id text not null,
  home_team_id uuid not null,
  away_team_id uuid not null,
  home_external_id text not null,
  away_external_id text not null,
  observed_at timestamptz not null,
  status text not null check (status in ('complete','partial','unavailable')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (fixture_id,observed_at),
  foreign key (fixture_id,provider,external_id,home_team_id,away_team_id)
    references public.fixtures(id,provider,external_id,home_team_id,away_team_id),
  foreign key (provider,home_team_id,home_external_id) references public.teams(provider,id,external_id),
  foreign key (provider,away_team_id,away_external_id) references public.teams(provider,id,external_id),
  check (observed_at<=created_at),
  check ((jsonb_typeof(payload)='object' and payload->'version'='1'::jsonb and
    payload->>'provider'=provider and payload->>'event_id'=external_id and
    payload->>'state'=status and (payload->>'fetched_at')::timestamptz=observed_at and
    ((status='unavailable' and payload->>'reason'='prediction_excluded' and
      payload->'home'='null'::jsonb and payload->'away'='null'::jsonb) or
     (status in ('complete','partial') and payload->>'confirmation'='provider' and
      payload->'home'->>'team_id'=home_external_id and payload->'away'->>'team_id'=away_external_id and
      jsonb_typeof(payload->'home'->'starters')='array' and jsonb_typeof(payload->'away'->'starters')='array'))) is true)
);
alter table public.lineup_observations enable row level security;
revoke all on public.lineup_observations from public,anon,authenticated,service_role;
grant select,insert on public.lineup_observations to service_role;
commit;
