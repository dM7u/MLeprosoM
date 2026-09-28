import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
try{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create role migration_admin createrole nosuperuser; grant usage,create on schema public to migration_admin with grant option; set role migration_admin;');
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 const local=(await db.query(readFileSync('supabase/pending/preflight_statistics_projection.sql','utf8'))).rows[0].evidence;
 const remote=JSON.parse(readFileSync('docs/research/statistics-preflight-20260928.json','utf8'));
 for(const key of ['columns','privileges','policies','triggers'])assert.deepEqual(local.history[key],remote.history[key],key);
 // PG18 catalogs NOT NULL separately; PG17 reports it through column metadata.
 const constraints=rows=>rows.filter(r=>!r.definition.startsWith('NOT NULL '));
 assert.deepEqual(constraints(local.history.constraints),remote.history.constraints);
 assert.deepEqual(constraints(local.fixtures_constraints),remote.fixtures_constraints);
 assert.deepEqual(local.history.indexes.sort((a,b)=>a.definition.localeCompare(b.definition)),remote.history.indexes.sort((a,b)=>a.definition.localeCompare(b.definition)));
 assert.equal(remote.new_names_available,true);assert.equal(remote.history.access_ok,true);
 await db.exec(readFileSync('supabase/pending/statistics_history_projection.sql','utf8'));
 await db.exec('reset role');
 const audit=(await db.query(readFileSync('supabase/pending/audit_statistics_projection_acl.sql','utf8'))).rows[0];
 assert.equal(audit.access_ok,true,JSON.stringify(audit));
 await db.exec('grant mle_statistics_writer to service_role');
 assert.equal((await db.query(readFileSync('supabase/pending/audit_statistics_projection_acl.sql','utf8'))).rows[0].access_ok,false);
 console.log('PASS: proposal applied by non-superuser owner with CREATEROLE; final ACL audit passed');
}catch(error){console.error(error.message);process.exitCode=1;}finally{await db.close();}

