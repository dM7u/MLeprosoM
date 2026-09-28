-- Manual coordinated cutover after reviewed preflight; not in migrations/.
-- Keep STATISTICS_READ_MODE=history until post-audit and full reconstruction.
begin;
lock table public.team_statistics_observations in access exclusive mode;
alter table public.team_statistics_observations add constraint statistics_projection_binding unique(fixture_id,id);
create table public.statistics_history_projection (
 fixture_id uuid primary key references public.fixtures(id),
 version integer not null default 1 check(version=1),
 generation bigint not null default 0 check(generation between 0 and 9007199254740991),
 observation_count bigint not null default 0 check(observation_count between 0 and 9007199254740991),
 initialized boolean not null default false,
 chosen_id uuid, last_id uuid,
 foreign key(fixture_id,chosen_id) references public.team_statistics_observations(fixture_id,id),
 foreign key(fixture_id,last_id) references public.team_statistics_observations(fixture_id,id),
 check((observation_count=0 and chosen_id is null and last_id is null) or (observation_count>0 and last_id is not null)),
 check(initialized or (observation_count=0 and chosen_id is null and last_id is null))
);
alter table public.statistics_history_projection enable row level security;
create role mle_statistics_writer nologin noinherit nobypassrls;
grant usage on schema public to mle_statistics_writer;
revoke all on public.statistics_history_projection from public,anon,authenticated,service_role;
grant select on public.statistics_history_projection to service_role;
grant select,insert,update on public.statistics_history_projection to mle_statistics_writer;
create policy statistics_projection_writer on public.statistics_history_projection to mle_statistics_writer using(true) with check(true);
grant select,insert on public.team_statistics_observations to mle_statistics_writer;
create policy statistics_history_writer on public.team_statistics_observations to mle_statistics_writer using(true) with check(true);
revoke insert on public.team_statistics_observations from service_role;

create function public.read_statistics_projection(p_fixture_id uuid) returns jsonb
language sql stable security invoker set search_path=pg_catalog,public as $$
 select jsonb_build_object('projection',to_jsonb(p),'chosen',to_jsonb(c),'last',to_jsonb(l))
 from (select p_fixture_id as id) scope
 left join public.statistics_history_projection p on p.fixture_id=scope.id
 left join public.team_statistics_observations c on c.id=p.chosen_id and c.fixture_id=p.fixture_id
 left join public.team_statistics_observations l on l.id=p.last_id and l.fixture_id=p.fixture_id;
$$;
revoke all on function public.read_statistics_projection(uuid) from public,anon,authenticated;
grant execute on function public.read_statistics_projection(uuid) to service_role;

create function public.commit_statistics_projection(p_fixture_id uuid,p_expected_generation bigint,p_observation jsonb,p_chosen_id uuid,p_last_id uuid,p_count bigint,p_version integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 head public.statistics_history_projection%rowtype;
 incoming public.team_statistics_observations%rowtype;
 existing public.team_statistics_observations%rowtype;
 actual_last public.team_statistics_observations%rowtype;
 chosen public.team_statistics_observations%rowtype;
 actual_count bigint;
begin
 if p_fixture_id is null or p_expected_generation is null or p_expected_generation<0 or p_count is null or p_count<0 or p_version is distinct from 1 then
  raise exception 'STATS_PROJECTION_INVALID';
 end if;
 insert into public.statistics_history_projection(fixture_id) values(p_fixture_id) on conflict(fixture_id) do nothing;
 select * into strict head from public.statistics_history_projection where fixture_id=p_fixture_id for update;
 if p_observation is not null then
  if jsonb_typeof(p_observation)<>'object' or p_observation-array['id','fixture_id','provider','external_id','home_team_id','away_team_id','observed_at','status','payload']<>'{}'::jsonb then raise exception 'STATS_PROJECTION_INVALID'; end if;
  select * into incoming from jsonb_populate_record(null::public.team_statistics_observations,p_observation);
  if incoming.fixture_id is distinct from p_fixture_id or incoming.id is null then raise exception 'STATS_PROJECTION_INVALID'; end if;
  select * into existing from public.team_statistics_observations where id=incoming.id;
  if found then
   if (to_jsonb(existing)-'created_at') is distinct from (to_jsonb(incoming)-'created_at') then raise exception 'STATS_IDEMPOTENCY_CONFLICT'; end if;
   return jsonb_build_object('stored',false,'replay',true,'generation',head.generation);
  end if;
 end if;
 if head.generation<>p_expected_generation then raise exception 'STATS_PROJECTION_CHANGED'; end if;
 if p_observation is not null then
  insert into public.team_statistics_observations(id,fixture_id,provider,external_id,home_team_id,away_team_id,observed_at,status,payload)
  values(incoming.id,incoming.fixture_id,incoming.provider,incoming.external_id,incoming.home_team_id,incoming.away_team_id,incoming.observed_at,incoming.status,incoming.payload);
 end if;
 if head.initialized then actual_count:=head.observation_count+case when p_observation is null then 0 else 1 end;
 else select count(*) into actual_count from public.team_statistics_observations where fixture_id=p_fixture_id; end if;
 if p_count<>actual_count then raise exception 'STATS_PROJECTION_COUNT'; end if;
 select * into actual_last from public.team_statistics_observations where fixture_id=p_fixture_id order by observed_at desc limit 1;
 if actual_last.id is distinct from p_last_id then raise exception 'STATS_PROJECTION_LAST'; end if;
 if p_chosen_id is not null then
  select * into chosen from public.team_statistics_observations where fixture_id=p_fixture_id and id=p_chosen_id;
  if not found or chosen.status not in ('complete','partial') or chosen.observed_at>actual_last.observed_at then raise exception 'STATS_PROJECTION_CHOSEN'; end if;
 end if;
 if p_observation is null and head.initialized and head.chosen_id is not distinct from p_chosen_id and head.last_id is not distinct from p_last_id and head.observation_count=p_count then
  return jsonb_build_object('stored',false,'replay',true,'generation',head.generation);
 end if;
 -- Backend validates reducer semantics; SQL enforces atomicity, binding and metadata.
 update public.statistics_history_projection set version=p_version,generation=head.generation+1,
 observation_count=actual_count,initialized=true,chosen_id=p_chosen_id,last_id=p_last_id where fixture_id=p_fixture_id;
 return jsonb_build_object('stored',p_observation is not null,'replay',false,'generation',head.generation+1);
end;
$$;
-- Temporary membership enables ownership transfer for a non-superuser creator.
-- Remove it before commit. PostgreSQL may retain the creator's ADMIN-only grant.
revoke all on function public.commit_statistics_projection(uuid,bigint,jsonb,uuid,uuid,bigint,integer) from public,anon,authenticated;
grant execute on function public.commit_statistics_projection(uuid,bigint,jsonb,uuid,uuid,bigint,integer) to service_role;
grant mle_statistics_writer to current_user with inherit false, set true;
grant create on schema public to mle_statistics_writer;
alter function public.commit_statistics_projection(uuid,bigint,jsonb,uuid,uuid,bigint,integer) owner to mle_statistics_writer;
revoke create on schema public from mle_statistics_writer;
revoke mle_statistics_writer from current_user;
commit;
