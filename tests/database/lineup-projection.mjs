import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fixture,now} from '../fixtures/history-selection.mjs';
import {createLineupObservation} from '../../src/server/db/lineup-observations.mjs';
import {lineupSnapshotView} from '../../src/server/db/read-lineups.mjs';
import {commitLineupSelection,previewLineupSelection,readProjectedLineups} from '../../src/server/db/lineup-projection.mjs';
const db=new PGlite();
const query=async(sql,args=[]) => (await db.query(sql,args)).rows;
const sample=JSON.parse(readFileSync('docs/research/bsd-lineups-223728-20260925.json','utf8')).body;
const stamp=i=>new Date(now-60000+i*1000).toISOString();
const opts={fixture,now,ttlMs:120000};
const row=(id,t,kind='complete',source=t)=>createLineupObservation({id:'10000000-0000-4000-8000-'+String(id).padStart(12,'0'),fixture,now,observedAt:stamp(t),body:{...sample,updated_at:source===null?null:stamp(source),...(kind==='partial'?{lineups:{...sample.lineups,home:{...sample.lineups.home,players:sample.lineups.home.players.slice(0,1)}}}:{}),...(kind==='unavailable'?{lineup_status:'predicted'}:{})}});
const all=async()=> (await query('select to_jsonb(t) as row from lineup_observations t order by observed_at')).map(r=>r.row);
const client={
 from(table){assert.equal(table,'lineup_observations');const filters=[];return {
  select(){return this;},eq(k,v){assert.ok(['id','fixture_id','provider'].includes(k));filters.push([k,v]);return this;},order(){return this;},
  async maybeSingle(){return {data:(await all()).find(r=>filters.every(([k,v])=>r[k]===v))??null};},
  async range(a,b){const rows=(await all()).filter(r=>filters.every(([k,v])=>r[k]===v)).sort((x,y)=>x.id.localeCompare(y.id));return {data:rows.slice(a,b+1),count:rows.length};},
 };},
 async rpc(name,args){
  assert.ok(['read_lineup_projection','commit_lineup_projection'].includes(name));
  const keys=name==='read_lineup_projection'?['p_fixture_id']:['p_fixture_id','p_expected_generation','p_observation','p_chosen_id','p_last_id','p_count','p_version'];
  try{return {data:(await query(`select public.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) as result`,keys.map(k=>k==='p_observation'&&args[k]!==null?JSON.stringify(args[k]):args[k])))[0].result};}
  catch(error){return {error:{message:error.message,code:error.code}};}
 },
};
const head=async()=> (await client.rpc('read_lineup_projection',{p_fixture_id:fixture.id})).data;
const verify=async()=>assert.deepEqual(await readProjectedLineups(client,opts),lineupSnapshotView(await all(),opts));
try{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create role migration_admin createrole nosuperuser; grant usage,create on schema public to migration_admin with grant option; set role migration_admin;');
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 for(const side of ['home','away'])await query("insert into teams(id,provider,external_id,name,fetched_at) values($1,'bsd',$2,'Test',$3)",[fixture[side+'_team_id'],fixture[side+'_external_id'],stamp(0)]);
 const competition=(await query("insert into competitions(provider,external_id,name,fetched_at) values('bsd','test','Test',$1) returning id",[stamp(0)]))[0].id;
 const season=(await query("insert into seasons(provider,external_id,competition_id,name,fetched_at) values('bsd','test',$1,'Test',$2) returning id",[competition,stamp(0)]))[0].id;
 await query("insert into fixtures(id,provider,external_id,season_id,home_team_id,away_team_id,source_status,fetched_at) values($1,'bsd',$2,$3,$4,$5,'finished',$6)",[fixture.id,fixture.external_id,season,fixture.home_team_id,fixture.away_team_id,stamp(0)]);
 await db.exec(readFileSync('supabase/pending/statistics_history_projection.sql','utf8'));
 await db.exec(readFileSync('supabase/pending/lineup_history_projection.sql','utf8'));
 await db.exec('reset role');
 const auditSql=readFileSync('supabase/pending/audit_statistics_projection_acl.sql','utf8');
 assert.equal((await query(auditSql))[0].access_ok,true,'lineups must not break statistics ACL');
 const lineupAudit=auditSql.replaceAll('team_statistics_observations','lineup_observations').replaceAll('statistics','lineup');
 assert.equal((await query(lineupAudit))[0].access_ok,true);
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);assert.ok((await client.rpc('read_lineup_projection',{p_fixture_id:fixture.id})).error);await db.exec('reset role');
 }
 await db.exec('set role service_role');
 await assert.rejects(query('insert into lineup_observations(id) values($1)',[fixture.id]),/permission denied/);
 await assert.rejects(query('update lineup_history_projection set initialized=false'),/permission denied/);
 assert.equal((await readProjectedLineups(client,opts)).status,'error');
 await commitLineupSelection(client,opts);await verify();assert.equal((await readProjectedLineups(client,opts)).status,'empty');
 const unavailable=row(1,0,'unavailable');await commitLineupSelection(client,{...opts,observation:unavailable});await verify();assert.equal((await readProjectedLineups(client,opts)).status,'empty');
 const a=row(2,20,'partial'),b=row(3,30,'complete',10),x=row(4,10,'complete',5);
 for(const observation of [a,b]){await commitLineupSelection(client,{...opts,observation});await verify();}
 assert.equal((await head()).projection.chosen_id,a.id);
 await commitLineupSelection(client,{...opts,observation:x});await verify();assert.equal((await head()).projection.chosen_id,b.id);
 for(const observation of [row(5,35,'partial'),row(6,36,'complete',9),row(7,37,'complete',null),row(8,38,'unavailable')]){
  await commitLineupSelection(client,{...opts,observation});await verify();assert.equal((await head()).projection.chosen_id,b.id);
 }
 const valid=row(9,40),before=await head(),preview=await previewLineupSelection(client,{...opts,observation:valid});
 assert.equal(preview.plan.count,9);assert.deepEqual(await head(),before);
 const args={p_fixture_id:fixture.id,p_expected_generation:before.projection.generation,p_observation:valid,p_chosen_id:valid.id,p_last_id:valid.id,p_count:999,p_version:1};
 assert.match((await client.rpc('commit_lineup_projection',args)).error.message,/COUNT/);assert.deepEqual(await head(),before);assert.equal((await all()).length,8);
 assert.match((await client.rpc('commit_lineup_projection',{...args,p_count:9,p_chosen_id:unavailable.id})).error.message,/CHOSEN/);
 let injected=false;const competitor=row(10,39);
 const racing={...client,async rpc(name,args){if(name==='commit_lineup_projection'&&!injected){injected=true;await commitLineupSelection(client,{...opts,observation:competitor});}return client.rpc(name,args);}};
 await commitLineupSelection(racing,{...opts,observation:valid});await verify();assert.equal((await head()).projection.chosen_id,valid.id);
 const after=await head();assert.equal((await commitLineupSelection(client,{...opts,observation:a})).replay,true);assert.deepEqual(await head(),after);
 const changed=structuredClone(a);changed.payload.home.starters[0].name='Changed';
 await assert.rejects(commitLineupSelection(client,{...opts,observation:changed}),/IDEMPOTENCY_CONFLICT/);
 let attempts=0;const busy={...client,async rpc(name,args){if(name==='commit_lineup_projection'){attempts++;return {error:{message:'LINEUPS_PROJECTION_CHANGED'}};}return client.rpc(name,args);}};
 await assert.rejects(commitLineupSelection(busy,{...opts,observation:row(11,41)}),/RETRY_EXHAUSTED/);assert.equal(attempts,3);
 // An administrative corruption in an older, unselected row blocks full rebuild.
 await db.exec('begin; reset role');
 try{
  await query("update lineup_observations set payload=jsonb_set(payload,'{home,starters,0,name}','\"\"'::jsonb) where id=$1",[a.id]);
  await db.exec('set role service_role');
  await assert.rejects(commitLineupSelection(client,opts),/PROJECTION_UNAVAILABLE/);
 }finally{await db.exec('rollback');}
 assert.deepEqual(await head(),after);await verify();
 console.log('PASS: lineup empty/unavailable, partial retention, source-date regression/null, retroactive reselection, preview, CAS retry, rollback, idempotence and isolated ACL; serialized PGlite only');
}finally{await db.close();}
