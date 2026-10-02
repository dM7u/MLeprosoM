import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
const preflight=readFileSync('supabase/pending/preflight_incident_projection.sql','utf8');
const audit=readFileSync('supabase/pending/audit_incident_projection_acl.sql','utf8');
async function inspect(sql){await db.exec('begin read only');try{return (await db.query(sql)).rows[0];}finally{await db.exec('rollback');}}
try{
 assert.equal((await inspect(preflight)).evidence.history.access_ok,false);
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for(const f of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync('supabase/migrations/'+f,'utf8'));
 await db.exec(readFileSync('supabase/pending/statistics_history_projection.sql','utf8'));
 await db.exec(readFileSync('supabase/pending/lineup_history_projection.sql','utf8'));
 const before=(await inspect(preflight)).evidence;
 const remote=JSON.parse(readFileSync('docs/research/incident-preflight-20260928.json','utf8'));
 assert.equal(remote.phase,'before_incident_projection');
 for(const key of ['exists','kind','owner','rls_enabled','access_ok','columns','privileges','policies','triggers'])assert.deepEqual(before.history[key],remote.history[key],key);
 // PG18 catalogs NOT NULL separately; PG17 exposes it through column metadata.
 const constraints=rows=>rows.filter(r=>!r.definition.startsWith('NOT NULL '));
 assert.deepEqual(constraints(before.history.constraints),remote.history.constraints);
 for(const key of ['teams_constraints','fixtures_constraints'])assert.deepEqual(constraints(before[key]),remote[key],key);
 const indexes=rows=>[...rows].sort((a,b)=>a.definition.localeCompare(b.definition));
 assert.deepEqual(indexes(before.history.indexes),indexes(remote.history.indexes));
 assert.equal(remote.new_names_available,true);assert.deepEqual(remote.collisions,[]);

 assert.equal(before.new_names_available,true);assert.equal(before.history.access_ok,true);
 assert.ok(before.fixtures_constraints.length>0);
 assert.ok(before.history.columns.some(c=>c.name==='payload'));
 assert.ok(!before.history.columns.some(c=>c.name==='home_external_id'));
 assert.equal((await inspect(audit)).access_ok,false);
 await db.exec('create role mle_incident_writer');
 assert.equal((await inspect(preflight)).evidence.new_names_available,false);
 await db.exec('drop role mle_incident_writer');
 await db.exec(readFileSync('supabase/pending/incident_history_projection.sql','utf8'));
 const clean=await inspect(audit);assert.equal(clean.access_ok,true);
 assert.equal((await inspect(preflight)).evidence.new_names_available,false);
 const cases=[
  ["grant insert(id) on incident_observations to service_role",'privilege:service_role:incident_observations:INSERT'],
  ["grant update(chosen_id) on incident_history_projection to authenticated",'privilege:authenticated:incident_history_projection:UPDATE'],
  ["grant execute on function read_incident_projection(uuid) to public",'public_execute:read_incident_projection'],
  ["grant mle_incident_writer to service_role",'writer:memberships'],
  ["grant service_role to mle_incident_writer",'writer:memberships'],
  ["alter role mle_incident_writer bypassrls",'writer:attributes'],
  ["grant create on schema public to public",'writer:schema'],
  ["grant select on teams to mle_incident_writer",'writer:other_tables'],
  ["alter table incident_history_projection disable row level security",'rls:incident_history_projection'],
  ["alter function commit_incident_projection(uuid,bigint,jsonb,uuid,uuid,bigint,integer) reset search_path",'function:commit_incident_projection'],
 ];
 for(const [sql,expected] of cases){
  await db.exec('begin');
  try{await db.exec(sql);const result=(await db.query(audit)).rows[0];assert.equal(result.access_ok,false);assert.ok(result.failed_checks.includes(expected));}
  finally{await db.exec('rollback');}
  assert.deepEqual(await inspect(audit),clean);
 }
 console.log(`PASS: read-only incident preflight, absent/occupied names, fixture binding, ${clean.checks} ACL checks and ${cases.length} privilege drifts`);
}finally{await db.close();}
