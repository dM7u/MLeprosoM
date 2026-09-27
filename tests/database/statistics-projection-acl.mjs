import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';

const db=new PGlite();
const auditSql=readFileSync('supabase/pending/audit_statistics_projection_acl.sql','utf8');
const audit=async()=> (await db.query(auditSql)).rows[0];
try {
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 assert.equal((await audit()).access_ok,false,'missing projection must fail closed');
 await db.exec(readFileSync('supabase/pending/statistics_history_projection.sql','utf8'));
 const clean=await audit();
 assert.equal(clean.access_ok,true,JSON.stringify(clean.failed_checks));
 const cases=[
  ["grant insert(id) on team_statistics_observations to service_role",'privilege:service_role:team_statistics_observations:INSERT'],
  ["grant update(chosen_id) on statistics_history_projection to authenticated",'privilege:authenticated:statistics_history_projection:UPDATE'],
  ["grant execute on function read_statistics_projection(uuid) to public",'public_execute:read_statistics_projection'],
  ["grant mle_statistics_writer to service_role",'writer:memberships'],
  ["grant service_role to mle_statistics_writer",'writer:memberships'],
  ["alter role mle_statistics_writer bypassrls",'writer:attributes'],
  ["grant create on schema public to public",'writer:schema'],
  ["grant select on teams to mle_statistics_writer",'writer:other_tables'],
  ["alter table statistics_history_projection disable row level security",'rls:statistics_history_projection'],
  ["alter function commit_statistics_projection(uuid,bigint,jsonb,uuid,uuid,bigint,integer) reset search_path",'function:commit_statistics_projection'],
 ];
 for(const [sql,expected] of cases){
  await db.exec('begin');
  try {
   await db.exec(sql);
   const result=await audit();
   assert.equal(result.access_ok,false,sql);
   assert.ok(result.failed_checks.includes(expected),JSON.stringify(result));
  } finally {await db.exec('rollback');}
  assert.deepEqual(await audit(),clean);
 }
 console.log(`PASS: ${clean.checks} ACL checks, missing schema and ${cases.length} privilege drifts detected; all mutations rolled back in memory`);
} finally {await db.close();}
