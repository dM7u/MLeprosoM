begin;

create table public.editorial_xi_revisions (
  id uuid primary key,
  contract_version integer not null check (contract_version=1),
  fixture_id uuid not null references public.fixtures(id),
  team_id uuid not null references public.teams(id),
  source_url text not null,
  previous_id uuid,
  action text not null check (action in ('review','retract')),
  reason text,
  reviewed_at timestamptz not null,
  reviewer text not null check (btrim(reviewer) <> ''),
  evidence jsonb not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (id,fixture_id,team_id,source_url),
  unique (previous_id),
  foreign key (previous_id,fixture_id,team_id,source_url)
    references public.editorial_xi_revisions(id,fixture_id,team_id,source_url),
  check (previous_id is null or previous_id <> id),
  check (action <> 'retract' or (previous_id is not null and reason is not null and btrim(reason) <> '')),
  check (reviewed_at <= created_at),
  check ((jsonb_typeof(evidence)='object' and evidence->'version'='1'::jsonb
    and evidence->'source'->>'url'=source_url
    and evidence->'source'->>'type'='journalistic'
    and evidence->'source'->>'outlet'='La Capital'
    and jsonb_typeof(evidence->'starters')='array'
    and jsonb_array_length(evidence->'starters')<=11
    and (evidence->'review'->>'reviewed_at')::timestamptz<=reviewed_at
    and not (evidence ? 'assessment') and not (evidence ? 'issues')) is true)
);

-- A root and each successor are unique even under competing INSERT transactions.
create unique index editorial_xi_root_unique on public.editorial_xi_revisions
  (fixture_id,team_id,source_url) where previous_id is null;
create index editorial_xi_fixture_team_idx on public.editorial_xi_revisions(fixture_id,team_id);

create function public.check_editorial_xi_binding() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
begin
  if not exists (
    select 1 from public.fixtures f
    join public.teams h on h.id=f.home_team_id
    join public.teams a on a.id=f.away_team_id
    join public.seasons s on s.id=f.season_id
    join public.competitions c on c.id=s.competition_id
    where f.id=new.fixture_id and new.team_id in (f.home_team_id,f.away_team_id)
      and new.evidence->'binding'->>'provider'=f.provider
      and new.evidence->'binding'->>'fixture_external_id'=f.external_id
      and new.evidence->'binding'->>'competition_external_id'=c.external_id
      and new.evidence->'binding'->>'season_external_id'=s.external_id
      and new.evidence->'binding'->>'home_external_id'=h.external_id
      and new.evidence->'binding'->>'away_external_id'=a.external_id
      and (new.action='retract' or (new.evidence->'binding'->>'kickoff_at')::timestamptz=f.kickoff_at)
      and new.evidence->>'team_external_id'=case when new.team_id=h.id then h.external_id else a.external_id end
  ) then raise exception 'EDITORIAL_XI_BINDING_MISMATCH'; end if;
  if new.previous_id is not null and not exists (
    select 1 from public.editorial_xi_revisions r
    where r.id=new.previous_id and r.reviewed_at<=new.reviewed_at
      and (new.action<>'retract' or r.evidence=new.evidence)
  ) then raise exception 'EDITORIAL_XI_INVALID_PREDECESSOR'; end if;
  return new;
end;
$$;
create trigger editorial_xi_binding before insert on public.editorial_xi_revisions
for each row execute function public.check_editorial_xi_binding();

alter table public.editorial_xi_revisions enable row level security;
revoke all on public.editorial_xi_revisions from public,anon,authenticated,service_role;
grant select,insert on public.editorial_xi_revisions to service_role;
revoke all on function public.check_editorial_xi_binding() from public,anon,authenticated;

-- Single statement snapshot, including retract/conflict heads; never a paginated prefix.
-- JSON scalar avoids PostgREST's table-row cap. Defensive overflow returns null.
create function public.read_editorial_xi_heads(p_fixture_id uuid,p_team_id uuid)
returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $$
  select case when count(*)>100 then null else coalesce(jsonb_agg(to_jsonb(heads) order by heads.source_url),'[]'::jsonb) end
  from (
    select r.* from public.editorial_xi_revisions r
    where r.fixture_id=p_fixture_id and r.team_id=p_team_id
      and not exists (select 1 from public.editorial_xi_revisions child where child.previous_id=r.id)
    limit 101
  ) heads;
$$;
revoke all on function public.read_editorial_xi_heads(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_editorial_xi_heads(uuid,uuid) to service_role;
commit;
