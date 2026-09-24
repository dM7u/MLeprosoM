-- Immutable private batches; no activation/publication is performed here.
begin;

create table public.standings_batches (
  id uuid primary key,
  provider text not null check (btrim(provider) <> ''),
  competition_external_id text not null check (btrim(competition_external_id) <> ''),
  season_external_id text not null check (btrim(season_external_id) <> ''),
  contract_version integer not null check (contract_version = 1),
  engine_version text not null check (engine_version = 'standings-basic-v1'),
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  review_hash text not null check (review_hash ~ '^[0-9a-f]{64}$'),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  generated_at timestamptz not null,
  data_as_of timestamptz,
  status text not null check (status in ('complete', 'incomplete')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  check (data_as_of is null or data_as_of <= generated_at),
  check (status <> 'complete' or data_as_of is not null),
  -- IS TRUE is intentional: missing JSON fields must not pass via SQL NULL.
  check ((jsonb_typeof(payload) = 'object'
    and jsonb_typeof(payload->'input') = 'object'
    and jsonb_typeof(payload->'snapshots') = 'array'
    and jsonb_array_length(payload->'snapshots') > 0
    and jsonb_typeof(payload->'audit_issues') = 'array'
    and jsonb_typeof(payload->'excluded_ids') = 'array'
    and (payload->'input'->'scope'->>'provider') = provider
    and (payload->'input'->'scope'->>'competition_id') = competition_external_id
    and (payload->'input'->'scope'->>'season_id') = season_external_id) is true)
);

create index standings_batches_scope_observation_idx on public.standings_batches
  (provider, competition_external_id, season_external_id, data_as_of desc, generated_at desc);

alter table public.standings_batches enable row level security;
revoke all on public.standings_batches from public, anon, authenticated, service_role;
grant select, insert on public.standings_batches to service_role;

commit;
