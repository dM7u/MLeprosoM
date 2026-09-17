-- Read-only audit for SQL Editor. All rls_enabled must be true and all public
-- role privilege columns false. An empty result is NOT a successful audit.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', c.oid, 'SELECT') as anon_read,
  has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE') as anon_write,
  has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_read,
  has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE') as authenticated_write
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
and c.relname in ('teams','competitions','seasons','fixtures','sync_runs')
order by c.relname;
