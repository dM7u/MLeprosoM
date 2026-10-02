import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {fixture,now} from '../fixtures/history-selection.mjs';
import {createIncidentObservation,incidentSnapshotView} from '../../src/server/db/incident-observations.mjs';

import {commitIncidentSelection,previewIncidentSelection,readProjectedIncidents} from '../../src/server/db/incident-projection.mjs';
import {importIncidents} from '../../src/server/db/import-incidents.mjs';
import {rebuildIncidentProjection} from '../../src/server/db/rebuild-incident-projection.mjs';
const db=new PGlite();
const query=async(sql,args=[]) => (await db.query(sql,args)).rows;
const sample=JSON.parse(readFileSync('docs/research/bsd-incidents-223728-20260925.json','utf8')).body;
const stamp=i=>new Date(now-60000+i*1000).toISOString();
const opts={fixture,now,ttlMs:120000};
const row=(id,t,kind='available')=>createIncidentObservation({id:'10000000-0000-4000-8000-'+String(id).padStart(12,'0'),fixture,now,observedAt:stamp(t),...(kind==='failed'?{failed:true}:{body:{...sample,incidents:kind==='empty'?[]:kind==='partial'?[{type:'unknown_test',minute:null}]:kind==='short'?sample.incidents.slice(0,1):sample.incidents}})});
const all=async()=> (await query('select to_jsonb(t) as row from incident_observations t order by observed_at')).map(r=>r.row);
const client={
 from(table){assert.equal(table,'incident_observations');const filters=[];return {
  select(){return this;},eq(k,v){assert.ok(['id','fixture_id','provider'].includes(k));filters.push([k,v]);return this;},order(){return this;},
  async maybeSingle(){return {data:(await all()).find(r=>filters.every(([k,v])=>r[k]===v))??null};},
  async range(a,b){const rows=(await all()).filter(r=>filters.every(([k,v])=>r[k]===v)).sort((x,y)=>x.id.localeCompare(y.id));return {data:rows.slice(a,b+1),count:rows.length};},
 };},
 async rpc(name,args){
  assert.ok(['read_incident_projection','commit_incident_projection'].includes(name));
  const keys=name==='read_incident_projection'?['p_fixture_id']:['p_fixture_id','p_expected_generation','p_observation','p_chosen_id','p_last_id','p_count','p_version'];
  try{return {data:(await query(`select public.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) as result`,keys.map(k=>k==='p_observation'&&args[k]!==null?JSON.stringify(args[k]):args[k])))[0].result};}
  catch(error){return {error:{message:error.message,code:error.code}};}
 },
};
const head=async()=> (await client.rpc('read_incident_projection',{p_fixture_id:fixture.id})).data;
const verify=async()=>assert.deepEqual(await readProjectedIncidents(client,opts),incidentSnapshotView(await all(),opts));
try{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create role migration_admin createrole nosuperuser; grant usage,create on schema public to migration_admin with grant option; set role migration_admin;');
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 for(const side of ['home','away'])await query("insert into teams(id,provider,external_id,name,fetched_at) values($1,'bsd',$2,'Test',$3)",[fixture[side+'_team_id'],fixture[side+'_external_id'],stamp(0)]);
 const competition=(await query("insert into competitions(provider,external_id,name,fetched_at) values('bsd','test','Test',$1) returning id",[stamp(0)]))[0].id;
 const season=(await query("insert into seasons(provider,external_id,competition_id,name,fetched_at) values('bsd','test',$1,'Test',$2) returning id",[competition,stamp(0)]))[0].id;
 await query("insert into fixtures(id,provider,external_id,season_id,home_team_id,away_team_id,source_status,fetched_at) values($1,'bsd',$2,$3,$4,$5,'finished',$6)",[fixture.id,fixture.external_id,season,fixture.home_team_id,fixture.away_team_id,stamp(0)]);
 await db.exec(readFileSync('supabase/pending/statistics_history_projection.sql','utf8'));
 await db.exec(readFileSync('supabase/pending/lineup_history_projection.sql','utf8'));
 await db.exec(readFileSync('supabase/pending/incident_history_projection.sql','utf8'));
 await db.exec('reset role');
 const auditSql=readFileSync('supabase/pending/audit_statistics_projection_acl.sql','utf8');
 assert.equal((await query(auditSql))[0].access_ok,true,'incidents must not break statistics ACL');
 assert.equal((await query(auditSql.replaceAll('team_statistics_observations','lineup_observations').replaceAll('statistics','lineup')))[0].access_ok,true);
 const incidentAudit=auditSql.replaceAll('team_statistics_observations','incident_observations').replaceAll('statistics','incident');
 assert.equal((await query(incidentAudit))[0].access_ok,true);
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);assert.ok((await client.rpc('read_incident_projection',{p_fixture_id:fixture.id})).error);await db.exec('reset role');
 }
 await db.exec('set role service_role');
 await assert.rejects(query('insert into incident_observations(id) values($1)',[fixture.id]),/permission denied/);
 await assert.rejects(query('update incident_history_projection set initialized=false'),/permission denied/);
 assert.equal((await readProjectedIncidents(client,opts)).status,'error');
 const operational={...client,from(table){
  if(table==='incident_observations')return client.from(table);
  assert.ok(['teams','fixtures'].includes(table));const filters=[];
  return {select(){return this;},eq(k,v){filters.push([k,v]);return this;},order(){return this;},limit(n){assert.equal(n,101);return this;},or(filter){assert.equal(filter,`home_team_id.eq.${fixture.away_team_id},away_team_id.eq.${fixture.away_team_id}`);return this;},
   async maybeSingle(){assert.deepEqual(filters,[['provider','bsd'],['external_id','4997']]);return {data:(await query('select id,name from teams where id=$1',[fixture.away_team_id]))[0]};},
   async in(k,ids){assert.equal(k,'id');assert.deepEqual(filters,[['provider','bsd']]);assert.equal(ids.length,2);return {data:await query('select id,name,external_id from teams where id=any($1::uuid[])',[ids])};},
   then(resolve,reject){assert.deepEqual(filters,[['provider','bsd'],['seasons.competitions.external_id','test'],['seasons.external_id','test']]);return query("select to_jsonb(f)||jsonb_build_object('seasons',jsonb_build_object('external_id',s.external_id,'competitions',jsonb_build_object('external_id',c.external_id,'name',c.name))) as row from fixtures f join seasons s on s.id=f.season_id join competitions c on c.id=s.competition_id where f.id=$1",[fixture.id]).then(rows=>({data:rows.map(r=>r.row)})).then(resolve,reject);},
  };
 }};
 const scope={provider:'bsd',externalTeamId:'4997',competitionId:'test',seasonId:'test'};
 const rebuildArgs={eventId:223728,scope,mode:'--dry-run',now};
 assert.equal((await rebuildIncidentProjection(operational,rebuildArgs)).result.plan.count,0);assert.equal((await head()).projection,null);
 const rebuilt=await rebuildIncidentProjection(operational,{...rebuildArgs,mode:'--apply'});
 assert.equal(rebuilt.projection_writes,1);assert.equal(rebuilt.verification.verified,true);await verify();
 assert.equal((await rebuildIncidentProjection(operational,{...rebuildArgs,mode:'--apply'})).projection_writes,0);
 assert.equal((await readProjectedIncidents(client,opts)).status,'empty');
 const failed=row(1,0,'failed');await commitIncidentSelection(client,{...opts,observation:failed});await verify();
 assert.equal((await readProjectedIncidents(client,opts)).status,'error');
 const a=row(2,20),b=row(3,30,'short'),x=row(4,10,'partial');
 for(const observation of [a,b,x]){await commitIncidentSelection(client,{...opts,observation});await verify();}
 assert.equal((await head()).projection.chosen_id,b.id);
 assert.equal((await readProjectedIncidents(client,opts)).data.incidents.length,1);
 const partial=row(5,35,'partial');await commitIncidentSelection(client,{...opts,observation:partial});await verify();
 assert.equal((await readProjectedIncidents(client,opts)).status,'partial');
 assert.deepEqual((await readProjectedIncidents(client,opts)).data.incidents,partial.payload.incidents);
 for(const observation of [row(6,36,'empty'),row(7,37,'failed'),row(8,38,'empty')]){
  await commitIncidentSelection(client,{...opts,observation});await verify();assert.equal((await head()).projection.chosen_id,partial.id);
  const view=await readProjectedIncidents(client,opts);assert.equal(view.status,'stale');assert.equal(Date.parse(view.updatedAt),Date.parse(partial.observed_at));
 }
 const valid=row(9,40),before=await head(),preview=await previewIncidentSelection(client,{...opts,observation:valid});
 assert.equal(preview.plan.count,9);assert.deepEqual(await head(),before);
 const args={p_fixture_id:fixture.id,p_expected_generation:before.projection.generation,p_observation:valid,p_chosen_id:valid.id,p_last_id:valid.id,p_count:999,p_version:1};
 assert.match((await client.rpc('commit_incident_projection',args)).error.message,/COUNT/);assert.deepEqual(await head(),before);assert.equal((await all()).length,8);
 assert.match((await client.rpc('commit_incident_projection',{...args,p_count:9,p_chosen_id:failed.id})).error.message,/CHOSEN/);
 let injected=false;const competitor=row(10,39);
 const racing={...client,async rpc(name,args){if(name==='commit_incident_projection'&&!injected){injected=true;await commitIncidentSelection(client,{...opts,observation:competitor});}return client.rpc(name,args);}};
 await commitIncidentSelection(racing,{...opts,observation:valid});await verify();assert.equal((await head()).projection.chosen_id,valid.id);
 const after=await head();assert.equal((await commitIncidentSelection(client,{...opts,observation:a})).replay,true);assert.deepEqual(await head(),after);
 const changed=structuredClone(a);changed.payload.incidents[0].minute=1;
 await assert.rejects(commitIncidentSelection(client,{...opts,observation:changed}),/IDEMPOTENCY_CONFLICT/);
 let attempts=0;const busy={...client,async rpc(name,args){if(name==='commit_incident_projection'){attempts++;return {error:{message:'INCIDENTS_PROJECTION_CHANGED'}};}return client.rpc(name,args);}};
 await assert.rejects(commitIncidentSelection(busy,{...opts,observation:row(11,41)}),/RETRY_EXHAUSTED/);assert.equal(attempts,3);
 // An administrative corruption in an older, unselected row blocks full rebuild.
 await db.exec('begin; reset role');
 try{
  await query("update incident_observations set payload=jsonb_set(payload,'{incidents,0,source_index}','99'::jsonb) where id=$1",[a.id]);
  await db.exec('set role service_role');
  await assert.rejects(commitIncidentSelection(client,opts),/PROJECTION_UNAVAILABLE/);
 }finally{await db.exec('rollback');}
 assert.deepEqual(await head(),after);await verify();
 // Full rebuild is idempotent and keeps every original observation.
 const repeated=await commitIncidentSelection(client,opts);assert.equal(repeated.replay,true);assert.deepEqual(await head(),after);
 // Reconstruct an existing history after a missing projection, without new rows.
 await db.exec('begin; reset role; truncate incident_history_projection; set role service_role');
 try{
  const count=(await all()).length;
  await commitIncidentSelection(client,opts);await verify();
  assert.equal((await all()).length,count);
  assert.equal((await head()).projection.observation_count,count);
  assert.equal((await head()).projection.chosen_id,valid.id);
 }finally{await db.exec('rollback');}
 assert.deepEqual(await head(),after);
 // Equal timestamps remain ambiguous; they cannot be resolved by UUID.
 await assert.rejects(commitIncidentSelection(client,{...opts,observation:row(12,40,'short')}),/PROJECTION_UNAVAILABLE/);
 assert.deepEqual(await head(),after);
 const importArgs={scope,mode:'--dry-run',storage:'projection',id:row(13,42).id,now,sample:{body:sample,fetched_at:stamp(42)}};
 const importBefore=await head();assert.equal((await importIncidents(operational,importArgs)).writes,0);assert.deepEqual(await head(),importBefore);
 assert.equal((await importIncidents(operational,{...importArgs,mode:'--apply'})).writes,1);await verify();
 const imported=await head();
 assert.equal((await importIncidents(operational,{...importArgs,mode:'--apply'})).result.replay,true);assert.deepEqual(await head(),imported);
 const failureArgs={...importArgs,id:row(14,43).id,sample:{failed:true,event_id:223728,fetched_at:stamp(43)}};
 assert.equal((await importIncidents(operational,failureArgs)).writes,0);assert.deepEqual(await head(),imported);
 assert.equal((await importIncidents(operational,{...failureArgs,mode:'--apply'})).writes,1);await verify();
 const retained=await readProjectedIncidents(client,opts);
 assert.equal(retained.status,'stale');assert.equal(Date.parse(retained.updatedAt),Date.parse(stamp(42)));
 assert.equal((await importIncidents(operational,{...failureArgs,mode:'--apply'})).writes,0);
 const operationalRebuild=await rebuildIncidentProjection(operational,{...rebuildArgs,mode:'--apply'});
 assert.equal(operationalRebuild.projection_writes,0);assert.equal(operationalRebuild.verification.verified,true);
 console.log('PASS: incident bootstrap, whole-list replacement, partial/empty/failed, retroactive replay, preview, CAS retry, rollback, idempotence, corruption operational import/rebuild, failed import and three-resource ACL; serialized PGlite only');
}finally{await db.close();}


