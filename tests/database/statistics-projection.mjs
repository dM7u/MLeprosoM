import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createStatisticsObservation,statisticsView} from '../../src/server/db/team-statistics.mjs';
import {commitStatisticsSelection,readProjectedStatistics,validateStatisticsProjection} from '../../src/server/db/statistics-projection.mjs';
import {fixture,now} from '../fixtures/history-selection.mjs';
const db=new PGlite();
const opts={fixture,now,ttlMs:60000};
const time=i=>new Date(now-50000+i*1000).toISOString();
const row=(n,t,home)=>createStatisticsObservation({id:'10000000-0000-4000-8000-'+String(n).padStart(12,'0'),fixture,now,observedAt:time(t),...(home===null?{failed:true}:{body:{event_id:223728,stats:{home}}})});
const query=async(sql,args=[]) => (await db.query(sql,args)).rows;
const all=async()=> (await query('select to_jsonb(r) as row from team_statistics_observations r order by observed_at')).map(r=>r.row);
const client={from(table){assert.equal(table,'team_statistics_observations');const filters=[];return {select(){return this;},eq(k,v){assert.ok(['id','fixture_id','provider'].includes(k));filters.push([k,v]);return this;},order(){return this;},async maybeSingle(){const rows=await query(`select to_jsonb(r) as row from team_statistics_observations r where ${filters.map(([k],i)=>k+'=$'+(i+1)).join(' and ')}`,filters.map(([,v])=>v));return {data:rows[0]?.row??null};},async range(a,b){const rows=await all();const selected=rows.filter(r=>filters.every(([k,v])=>r[k]===v)).sort((x,y)=>x.id.localeCompare(y.id));return {data:selected.slice(a,b+1),count:selected.length};}};},async rpc(name,args){
 try{const names=name==='read_statistics_projection'?['p_fixture_id']:['p_fixture_id','p_expected_generation','p_observation','p_chosen_id','p_last_id','p_count','p_version'];assert.ok(['read_statistics_projection','commit_statistics_projection'].includes(name));const values=names.map(k=>k==='p_observation'&&args[k]!==null?JSON.stringify(args[k]):args[k]);return {data:(await query(`select public.${name}(${names.map((_,i)=>'$'+(i+1)).join(',')}) as result`,values))[0].result};}catch(error){return {error:{message:error.message,code:error.code}};}
}};
const head=async()=> (await client.rpc('read_statistics_projection',{p_fixture_id:fixture.id})).data;
const verify=async()=>{validateStatisticsProjection(await head(),opts);assert.deepEqual(await readProjectedStatistics(client,opts),statisticsView(await all(),opts));};
try{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 for(const side of ['home','away'])await query("insert into teams(id,provider,external_id,name,fetched_at) values($1,'bsd',$2,'Test',$3)",[fixture[side+'_team_id'],fixture[side+'_external_id'],time(0)]);
 const competition=(await query("insert into competitions(provider,external_id,name,fetched_at) values('bsd','test','Test',$1) returning id",[time(0)]))[0].id;
 const season=(await query("insert into seasons(provider,external_id,competition_id,name,fetched_at) values('bsd','test',$1,'Test',$2) returning id",[competition,time(0)]))[0].id;
 await query("insert into fixtures(id,provider,external_id,season_id,home_team_id,away_team_id,source_status,fetched_at) values($1,'bsd',$2,$3,$4,$5,'finished',$6)",[fixture.id,fixture.external_id,season,fixture.home_team_id,fixture.away_team_id,time(0)]);
 const a=row(1,20,{total_shots:3}),b=row(2,30,{corner_kicks:4}),c=row(3,40,{});
 for(const r of [a,b,c]){const keys=Object.keys(r);await query(`insert into team_statistics_observations(${keys.join(',')}) select ${keys.join(',')} from jsonb_populate_record(null::team_statistics_observations,$1)`,[JSON.stringify(r)]);}
 await db.exec(readFileSync('supabase/pending/statistics_history_projection.sql','utf8'));
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  assert.ok((await client.rpc('read_statistics_projection',{p_fixture_id:fixture.id})).error);
  assert.ok((await client.rpc('commit_statistics_projection',{p_fixture_id:fixture.id,p_expected_generation:0,p_observation:null,p_chosen_id:null,p_last_id:null,p_count:0,p_version:1})).error);
  await db.exec('reset role');
 }
 await db.exec('set role service_role');
 await assert.rejects(query('insert into team_statistics_observations(id) values($1)',[a.id]),/permission denied/);
 await assert.rejects(query('update statistics_history_projection set initialized=false'),/permission denied/);
 await assert.rejects(query('delete from team_statistics_observations'),/permission denied/);
 assert.equal((await readProjectedStatistics(client,opts)).status,'error');
 await commitStatisticsSelection(client,opts);await verify();
 assert.equal((await head()).projection.chosen_id,a.id);
 const initialized=await head();
 assert.equal((await commitStatisticsSelection(client,opts)).replay,true);
 assert.deepEqual(await head(),initialized);
 const x=row(4,10,{corner_kicks:1});
 assert.equal((await commitStatisticsSelection(client,{...opts,observation:x})).stored,true);await verify();
 assert.equal((await head()).projection.chosen_id,b.id);
 const next=row(5,41,{corner_kicks:0});
 await commitStatisticsSelection(client,{...opts,observation:next});await verify();
 const failed=row(6,42,null);await commitStatisticsSelection(client,{...opts,observation:failed});await verify();
 const beforeRetry=await head();
 assert.equal((await commitStatisticsSelection(client,{...opts,observation:x})).replay,true);assert.deepEqual(await head(),beforeRetry);
 const altered=row(4,10,{corner_kicks:9});await assert.rejects(commitStatisticsSelection(client,{...opts,observation:altered}),/IDEMPOTENCY_CONFLICT/);
 // SQL retry succeeds before stale expected generation; no projection rewrite.
 const replay=await client.rpc('commit_statistics_projection',{p_fixture_id:fixture.id,p_expected_generation:0,p_observation:x,p_chosen_id:null,p_last_id:null,p_count:0,p_version:1});assert.equal(replay.data.replay,true);assert.deepEqual(await head(),beforeRetry);
 const candidate=row(7,43,{corner_kicks:2});
 const args={p_fixture_id:fixture.id,p_expected_generation:beforeRetry.projection.generation,p_observation:candidate,p_chosen_id:candidate.id,p_last_id:candidate.id,p_count:7,p_version:1};
 assert.match((await client.rpc('commit_statistics_projection',{...args,p_expected_generation:0})).error.message,/CHANGED/);
 // Fail after INSERT: whole statement rolls back history and projection.
 assert.match((await client.rpc('commit_statistics_projection',{...args,p_count:999})).error.message,/COUNT/);
 assert.equal((await all()).length,6);assert.deepEqual(await head(),beforeRetry);
 assert.match((await client.rpc('commit_statistics_projection',{...args,p_chosen_id:failed.id})).error.message,/CHOSEN/);
 assert.equal((await all()).length,6);
 await commitStatisticsSelection(client,{...opts,observation:candidate});await verify();
 // Competing generation injected between read and commit, serialized locally.
 let injected=false;const competing=row(8,44,{corner_kicks:3}),target=row(9,45,{corner_kicks:4});
 const racing={...client,async rpc(name,args){if(name==='commit_statistics_projection'&&!injected){injected=true;await commitStatisticsSelection(client,{...opts,observation:competing});}return client.rpc(name,args);}};
 await commitStatisticsSelection(racing,{...opts,observation:target});assert.ok(injected);await verify();
 const good=await head();
 for(const mutate of [e=>e.projection.version=2,e=>e.projection.observation_count=0,e=>e.last=null,e=>e.chosen.payload.home.corner_kicks=-1,e=>e.projection.fixture_id=a.id]){const bad=structuredClone(good);mutate(bad);assert.throws(()=>validateStatisticsProjection(bad,opts));}
 let conflicts=0;const busy={...client,async rpc(name,args){if(name==='commit_statistics_projection'){conflicts++;return {error:{message:'STATS_PROJECTION_CHANGED'}};}return client.rpc(name,args);}};
 await assert.rejects(commitStatisticsSelection(busy,{...opts,observation:row(10,46,{corner_kicks:5})}),/RETRY_EXHAUSTED/);assert.equal(conflicts,3);
 // A transport failure must not leak provider/connection diagnostics.
 await assert.rejects(commitStatisticsSelection({from(){throw new Error('private connection detail');}},{...opts,observation:row(10,46,{corner_kicks:5})}),/^Error: STATS_PROJECTION_UNAVAILABLE$/);
 // Empty fixture bootstrap, same-generation root conflict and first INSERT.
 await db.exec('reset role');
 const second={...fixture,id:'00000000-0000-4000-8000-000000000004',external_id:'223729'};
 await query("insert into fixtures(id,provider,external_id,season_id,home_team_id,away_team_id,source_status,fetched_at) values($1,'bsd',$2,$3,$4,$5,'finished',$6)",[second.id,second.external_id,season,second.home_team_id,second.away_team_id,time(0)]);
 await db.exec('set role service_role');
 const emptyArgs={p_fixture_id:second.id,p_expected_generation:0,p_observation:null,p_chosen_id:null,p_last_id:null,p_count:0,p_version:1};
 assert.equal((await client.rpc('commit_statistics_projection',emptyArgs)).data.generation,1);
 assert.match((await client.rpc('commit_statistics_projection',emptyArgs)).error.message,/CHANGED/);
 const first=createStatisticsObservation({id:row(11,1,{}).id,fixture:second,observedAt:time(1),now,failed:true});
 assert.equal((await client.rpc('commit_statistics_projection',{...emptyArgs,p_expected_generation:1,p_observation:first,p_last_id:first.id,p_count:1})).data.stored,true);
 const emptyView=await readProjectedStatistics(client,{...opts,fixture:second});assert.equal(emptyView.status,'error');assert.equal(emptyView.lastObservationStatus,'failed');
 await db.exec('reset role');
 const owner=(await query("select r.rolname,r.rolcanlogin,r.rolbypassrls,p.prosecdef from pg_proc p join pg_roles r on r.oid=p.proowner where p.proname='commit_statistics_projection'"))[0];
 assert.equal((await query("select has_table_privilege('mle_statistics_writer','team_statistics_observations','DELETE') as allowed"))[0].allowed,false);
 assert.equal((await query("select has_table_privilege('mle_statistics_writer','team_statistics_observations','UPDATE') as allowed"))[0].allowed,false);
 assert.equal((await query("select has_schema_privilege('mle_statistics_writer','public','CREATE') as allowed"))[0].allowed,false);
 assert.equal(owner.rolname,'mle_statistics_writer');assert.equal(owner.rolcanlogin,false);assert.equal(owner.rolbypassrls,false);assert.equal(owner.prosecdef,true);
 console.log('PASS: statistics projection bootstrap, full-reader equivalence, retroactive rebuild, append, retry, rollback, CAS conflict/retry limit, private ACL and malformed state');
}finally{await db.close();}
