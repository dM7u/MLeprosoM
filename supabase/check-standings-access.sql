-- Read-only remote audit. Expect exactly two rows, RLS true, public privileges
-- false, service SELECT/INSERT true and service UPDATE/DELETE false.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') as anon_access,
  has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE') as authenticated_access,
  has_table_privilege('service_role', c.oid, 'SELECT') as service_read,
  has_table_privilege('service_role', c.oid, 'INSERT') as service_insert,
  has_table_privilege('service_role', c.oid, 'UPDATE,DELETE') as service_mutate
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
and c.relname in ('standings_batches','standings_official_reviews')
order by c.relname;

-- Inspect FK/constraints and trigger against the two versioned migrations.
select c.relname as table_name, con.conname, pg_get_constraintdef(con.oid) as definition
from pg_constraint con join pg_class c on c.oid=con.conrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('standings_batches','standings_official_reviews')
order by c.relname, con.conname;

select c.relname as table_name, t.tgname, t.tgenabled, pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='standings_official_reviews' and not t.tgisinternal;
