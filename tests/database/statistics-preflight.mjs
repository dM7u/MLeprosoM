import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
const sql=readFileSync('supabase/pending/preflight_statistics_projection.sql','utf8');
async function evidence(){
 await db.exec('begin read only');
 try{return (await db.query(sql)).rows[0].evidence;}finally{await db.exec('rollback');}
}
try{
 const absent=await evidence();assert.equal(absent.history.exists,false);assert.equal(absent.history.access_ok,false);
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls');
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 const clean=await evidence();assert.equal(clean.new_names_available,true);assert.equal(clean.history.access_ok,true);
 assert.deepEqual(clean.history.columns.map(c=>c.name),['id','fixture_id','provider','external_id','home_team_id','away_team_id','observed_at','status','payload','created_at']);assert.ok(clean.fixtures_constraints.length>0);
 await db.exec('grant update(payload) on team_statistics_observations to authenticated');
 assert.equal((await evidence()).history.access_ok,false);
 await db.exec('revoke update(payload) on team_statistics_observations from authenticated');
 assert.deepEqual(await evidence(),clean);
 await db.exec('create role mle_statistics_writer');
 const collision=await evidence();assert.equal(collision.new_names_available,false);assert.ok(collision.collisions.some(c=>c.kind==='role'));
 await db.exec('drop role mle_statistics_writer');
 await db.exec(readFileSync('supabase/pending/statistics_history_projection.sql','utf8'));
 const migrated=await evidence();assert.equal(migrated.new_names_available,false);assert.equal(migrated.history.access_ok,false);
 for(const kind of ['relation','role','function','constraint','policy'])assert.ok(migrated.collisions.some(c=>c.kind===kind),kind);
 console.log('PASS: read-only preflight; absent schema, clean legacy schema, column grant, role collision and already-migrated state');
}finally{await db.close();}
