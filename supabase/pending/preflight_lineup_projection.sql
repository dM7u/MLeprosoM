-- Read-only preflight BEFORE applying the pending proposal. No application rows.
-- This is catalog evidence for review, not authorization to migrate.
with history as (
 select c.oid,c.relkind,c.relrowsecurity,pg_get_userbyid(c.relowner) as owner
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname='lineup_observations'
), privileges as (
 select v.name as role,p.name as privilege,
  case when r.oid is null or h.oid is null then null else
   has_table_privilege(r.oid,h.oid,p.name) or
   case when p.name in ('SELECT','INSERT','UPDATE','REFERENCES') then has_any_column_privilege(r.oid,h.oid,p.name) else false end
  end as allowed,
  v.name='service_role' and p.name in ('SELECT','INSERT') as expected
 from (values ('anon'),('authenticated'),('service_role')) v(name)
 left join pg_roles r on r.rolname=v.name
 cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(name)
 left join history h on true
), collisions as (
 select 'relation' as kind,c.relname::text as name from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('lineup_history_projection','lineup_projection_binding')
 union all
 select 'role',rolname from pg_roles where rolname='mle_lineup_writer'
 union all
 select 'function',p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('read_lineup_projection','commit_lineup_projection')
 union all
 select 'constraint',conname from pg_constraint where conrelid=(select oid from history) and conname='lineup_projection_binding'
 union all
 select 'policy',polname from pg_policy where polrelid=(select oid from history) and polname='lineup_history_writer'
)
select jsonb_build_object(
 'phase','before_lineup_projection',
 'server_version',current_setting('server_version'),
 'new_names_available',not exists(select 1 from collisions),
 'collisions',coalesce((select jsonb_agg(to_jsonb(c) order by kind,name) from collisions c),'[]'::jsonb),
 'history',jsonb_build_object(
  'exists',exists(select 1 from history),
  'owner',(select owner from history),
  'kind',(select relkind from history),
  'rls_enabled',(select relrowsecurity from history),
  'access_ok',coalesce((select relkind='r' and relrowsecurity from history),false)
    and not exists(select 1 from privileges where allowed is distinct from expected),
  'privileges',(select jsonb_agg(to_jsonb(p) order by role,privilege) from privileges p),
  'columns',coalesce((select jsonb_agg(jsonb_build_object(
   'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)
  ) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
   where a.attrelid=(select oid from history) and a.attnum>0 and not a.attisdropped),'[]'::jsonb),
  'constraints',coalesce((select jsonb_agg(jsonb_build_object('name',conname,'validated',convalidated,'definition',pg_get_constraintdef(oid)) order by conname)
   from pg_constraint where conrelid=(select oid from history)),'[]'::jsonb),
  'indexes',coalesce((select jsonb_agg(jsonb_build_object('definition',pg_get_indexdef(indexrelid),'valid',indisvalid) order by indexrelid)
   from pg_index where indrelid=(select oid from history)),'[]'::jsonb),
  'policies',coalesce((select jsonb_agg(jsonb_build_object('name',polname,'command',polcmd,'permissive',polpermissive,
   'roles',(select jsonb_agg(case when r=0 then 'PUBLIC' else pg_get_userbyid(r) end) from unnest(polroles) r),
   'using',pg_get_expr(polqual,polrelid),'check',pg_get_expr(polwithcheck,polrelid)) order by polname)
   from pg_policy where polrelid=(select oid from history)),'[]'::jsonb),
  'triggers',coalesce((select jsonb_agg(jsonb_build_object('name',tgname,'enabled',tgenabled,'definition',pg_get_triggerdef(oid)) order by tgname)
   from pg_trigger where tgrelid=(select oid from history) and not tgisinternal),'[]'::jsonb)
 ),
 'teams_constraints',coalesce((select jsonb_agg(jsonb_build_object('name',conname,'validated',convalidated,'definition',pg_get_constraintdef(oid)) order by conname) from pg_constraint where conrelid=to_regclass('public.teams')),'[]'::jsonb),
 'fixtures_constraints',coalesce((select jsonb_agg(jsonb_build_object('name',conname,'validated',convalidated,'definition',pg_get_constraintdef(oid)) order by conname)
  from pg_constraint where conrelid=to_regclass('public.fixtures')),'[]'::jsonb)
) as evidence;
