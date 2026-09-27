-- Read-only administrative audit of the pending statistics projection ACL.
-- This does not certify function bodies, payloads, reconstruction or concurrency.
with
roles as (
 select name,r.oid from (values ('anon'),('authenticated'),('service_role'),('mle_statistics_writer')) v(name)
 left join pg_roles r on r.rolname=v.name
),
tables as (
 select name,to_regclass('public.'||name) as oid from
 (values ('team_statistics_observations'),('statistics_history_projection')) v(name)
),
privileges as (
 select r.name as role,t.name as relation,p.privilege,
  case when r.name='service_role' then p.privilege='SELECT'
       when r.name='mle_statistics_writer' then p.privilege in ('SELECT','INSERT') or (t.name='statistics_history_projection' and p.privilege='UPDATE')
       else false end as expected,
  case when r.oid is null or t.oid is null then null else
   has_table_privilege(r.oid,t.oid,p.privilege) or
   case when p.privilege in ('SELECT','INSERT','UPDATE','REFERENCES') then has_any_column_privilege(r.oid,t.oid,p.privilege) else false end
  end as allowed
 from roles r cross join tables t cross join
 (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
),
functions as (
 select v.*,p.oid,p.proowner,p.prosecdef,p.provolatile,p.proconfig
 from (values
  ('read_statistics_projection','public.read_statistics_projection(uuid)',false,'s'),
  ('commit_statistics_projection','public.commit_statistics_projection(uuid,bigint,jsonb,uuid,uuid,bigint,integer)',true,'v')
 ) v(name,signature,definer,volatility)
 left join pg_proc p on p.oid=to_regprocedure(v.signature)
),
checks as (
 select 'privilege:'||role||':'||relation||':'||privilege as name, allowed is not distinct from expected as ok from privileges
 union all
 select 'role:'||name,oid is not null from roles
 union all
 select 'rls:'||t.name,coalesce(c.relkind='r' and c.relrowsecurity and c.relowner<>r.oid,false)
 from tables t left join pg_class c on c.oid=t.oid left join roles r on r.name='mle_statistics_writer'
 union all
 select 'writer:attributes',coalesce(not (r.rolcanlogin or r.rolsuper or r.rolbypassrls or r.rolcreatedb or r.rolcreaterole or r.rolreplication or r.rolinherit),false)
 from roles v left join pg_roles r on r.oid=v.oid where v.name='mle_statistics_writer'
 union all
 select 'writer:memberships',r.oid is not null and not exists(select 1 from pg_auth_members m where m.roleid=r.oid or m.member=r.oid)
 from roles r where r.name='mle_statistics_writer'
 union all
 select 'writer:schema',coalesce(has_schema_privilege(r.oid,'public','USAGE') and not has_schema_privilege(r.oid,'public','CREATE'),false)
 from roles r where r.name='mle_statistics_writer'
 union all
 select 'writer:other_tables',r.oid is not null and not exists (
  select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p','v','m','f')
   and c.relname not in ('team_statistics_observations','statistics_history_projection')
   and (has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        or has_any_column_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES'))
 ) from roles r where r.name='mle_statistics_writer'
 union all
 select 'function:'||f.name,coalesce(f.prosecdef=f.definer and f.provolatile::text=f.volatility
  and f.proconfig=array['search_path=pg_catalog, public']
  and (not f.definer or f.proowner=(select oid from roles where name='mle_statistics_writer')),false) from functions f
 union all
 select 'execute:'||r.name||':'||f.name,
  coalesce(has_function_privilege(r.oid,f.oid,'EXECUTE')=(r.name='service_role'),false)
 from functions f cross join roles r where r.name<>'mle_statistics_writer'
 union all
 select 'public_execute:'||f.name,f.oid is not null and not exists (
  select 1 from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
  where p.oid=f.oid and a.grantee=0 and a.privilege_type='EXECUTE'
 ) from functions f
)
select bool_and(ok) as access_ok,count(*)::integer as checks,
 coalesce(jsonb_agg(name order by name) filter(where not ok),'[]'::jsonb) as failed_checks
from checks;
