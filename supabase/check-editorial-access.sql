-- Read-only editorial catalog evidence. Export the complete JSON cell.
-- access_ok covers table access only; inspect functions, triggers and definitions too.
with expected(table_name) as (values
  ('editorial_xi_revisions')
), relations as (
  select e.table_name, c.oid, c.relkind, c.relrowsecurity,
    pg_get_userbyid(c.relowner) as owner
  from expected e
  left join pg_namespace n on n.nspname = 'public'
  left join pg_class c on c.relnamespace = n.oid and c.relname = e.table_name
), evidence as (
  select r.*, coalesce((
    select jsonb_agg(jsonb_build_object(
      'role', role_name, 'privilege', privilege,
      'allowed', has_table_privilege(role_name, r.oid, privilege)
        or case when privilege in ('SELECT','INSERT','UPDATE','REFERENCES')
          then has_any_column_privilege(role_name, r.oid, privilege) else false end,
      'expected', role_name = 'service_role' and privilege in ('SELECT','INSERT')
    ) order by role_name, privilege)
    from (values ('anon'), ('authenticated'), ('service_role')) roles(role_name)
    cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
      ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) privileges(privilege)
  ), '[]'::jsonb) as privileges
  from relations r
)
select table_name, jsonb_build_object(
  'schema', 'public', 'table', table_name, 'exists', oid is not null,
  'kind', relkind, 'owner', owner, 'rls_enabled', relrowsecurity,
  'access_ok', coalesce(oid is not null and relkind = 'r' and relrowsecurity
    and not exists (select 1 from jsonb_array_elements(privileges) p
      where p->'allowed' is distinct from p->'expected'), false),
  'privileges', privileges,
  'functions', (select jsonb_agg(jsonb_build_object(
    'signature', signature, 'exists', p.oid is not null,
    'security_definer', p.prosecdef, 'volatility', p.provolatile,
    'definition', case when p.oid is not null then pg_get_functiondef(p.oid) end,
    'execute', (select jsonb_object_agg(role_name, coalesce(has_function_privilege(role_name,p.oid,'EXECUTE'),false))
      from (values ('anon'),('authenticated'),('service_role')) roles(role_name))
  ) order by signature)
  from (values ('public.read_editorial_xi_heads(uuid,uuid)'),('public.check_editorial_xi_binding()')) functions(signature)
  left join pg_proc p on p.oid=to_regprocedure(signature)),
  'columns', (select coalesce(jsonb_agg(jsonb_build_object(
    'name', a.attname, 'type', format_type(a.atttypid,a.atttypmod),
    'not_null', a.attnotnull, 'default', pg_get_expr(d.adbin,d.adrelid)
  ) order by a.attnum), '[]'::jsonb)
    from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
    where a.attrelid=e.oid and a.attnum>0 and not a.attisdropped),
  'constraints', (select coalesce(jsonb_agg(jsonb_build_object(
    'name', c.conname, 'validated', c.convalidated, 'definition', pg_get_constraintdef(c.oid)
  ) order by c.conname), '[]'::jsonb) from pg_constraint c where c.conrelid=e.oid),
  'indexes', (select coalesce(jsonb_agg(jsonb_build_object(
    'definition', pg_get_indexdef(i.indexrelid), 'valid', i.indisvalid
  ) order by pg_get_indexdef(i.indexrelid)), '[]'::jsonb) from pg_index i where i.indrelid=e.oid),
  'policies', (select coalesce(jsonb_agg(jsonb_build_object(
    'name', p.polname, 'command', p.polcmd, 'permissive', p.polpermissive,
    'roles', (select jsonb_agg(case when role_id=0 then 'PUBLIC' else pg_get_userbyid(role_id) end order by role_id)
      from unnest(p.polroles) role_id),
    'using', pg_get_expr(p.polqual,p.polrelid), 'check', pg_get_expr(p.polwithcheck,p.polrelid)
  ) order by p.polname), '[]'::jsonb) from pg_policy p where p.polrelid=e.oid),
  'triggers', (select coalesce(jsonb_agg(jsonb_build_object(
    'name', t.tgname, 'enabled', t.tgenabled, 'definition', pg_get_triggerdef(t.oid),
    'function_definition', pg_get_functiondef(t.tgfoid)
  ) order by t.tgname), '[]'::jsonb) from pg_trigger t where t.tgrelid=e.oid and not t.tgisinternal)
) as evidence
from evidence e order by table_name;
