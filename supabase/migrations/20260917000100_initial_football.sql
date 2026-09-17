-- Minimal provider-backed storage. No standings, ratings or invented scores.
begin;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (btrim(provider) <> ''),
  external_id text not null check (btrim(external_id) <> ''),
  name text not null check (btrim(name) <> ''),
  fetched_at timestamptz not null,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, external_id),
  unique (provider, id)
);

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (btrim(provider) <> ''),
  external_id text not null check (btrim(external_id) <> ''),
  name text not null check (btrim(name) <> ''),
  country text,
  fetched_at timestamptz not null,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, external_id),
  unique (provider, id)
);

-- A provider season may combine more than one local tournament.
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (btrim(provider) <> ''),
  external_id text not null check (btrim(external_id) <> ''),
  competition_id uuid not null,
  name text not null check (btrim(name) <> ''),
  year integer,
  fetched_at timestamptz not null,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, competition_id, external_id),
  unique (provider, id),
  foreign key (provider, competition_id) references public.competitions(provider, id)
);

create table public.fixtures (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (btrim(provider) <> ''),
  external_id text not null check (btrim(external_id) <> ''),
  season_id uuid not null,
  home_team_id uuid not null,
  away_team_id uuid not null,
  kickoff_at timestamptz,
  source_status text not null check (btrim(source_status) <> ''),
  source_stage text,
  source_group text,
  source_round integer,
  home_score integer check (home_score >= 0),
  away_score integer check (away_score >= 0),
  fetched_at timestamptz not null,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, external_id),
  check (home_team_id <> away_team_id),
  foreign key (provider, season_id) references public.seasons(provider, id),
  foreign key (provider, home_team_id) references public.teams(provider, id),
  foreign key (provider, away_team_id) references public.teams(provider, id)
);

create index fixtures_home_kickoff_idx on public.fixtures(home_team_id, kickoff_at);
create index fixtures_away_kickoff_idx on public.fixtures(away_team_id, kickoff_at);
create index fixtures_season_idx on public.fixtures(provider, season_id);

-- Store codes and counts, never headers, tokens or raw error bodies.
create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (btrim(provider) <> ''),
  operation text not null check (btrim(operation) <> ''),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'succeeded', 'failed')),
  request_count integer not null default 0 check (request_count >= 0),
  error_code text,
  check (finished_at is null or finished_at >= started_at),
  check ((status = 'running' and finished_at is null) or
         (status <> 'running' and finished_at is not null))
);

alter table public.teams enable row level security;
alter table public.competitions enable row level security;
alter table public.seasons enable row level security;
alter table public.fixtures enable row level security;
alter table public.sync_runs enable row level security;

revoke all on public.teams, public.competitions, public.seasons,
  public.fixtures, public.sync_runs from public, anon, authenticated;
grant select, insert, update, delete on public.teams, public.competitions,
  public.seasons, public.fixtures, public.sync_runs to service_role;

commit;
