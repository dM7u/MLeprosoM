import assert from 'node:assert/strict';
import {readFileSync,readdirSync,realpathSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import pg from '../../.tools/db-validation/node_modules/pg/lib/index.js';
import {fixture,now} from '../fixtures/history-selection.mjs';
import {createStatisticsObservation,statisticsView} from '../../src/server/db/team-statistics.mjs';
import {commitStatisticsSelection,previewStatisticsSelection,readProjectedStatistics} from '../../src/server/db/statistics-projection.mjs';

// No .env, URL, Supabase or provider access. Runner creates this ignored local file.
const path=realpathSync(process.argv[2]);
const root=realpathSync('.tools/db-validation')+sep;
assert.ok(path.startsWith(root));
const config=JSON.parse(readFileSync(path,'utf8'));
assert.equal(config.host,'127.0.0.1');assert.equal(config.user,'mle_local_test');assert.equal(config.database,'postgres');
assert.ok(resolve(config.cluster).startsWith(root));
const clients=[];
async function connect(){
 const c=new pg.Client({host:config.host,port:config.port,user:config.user,password:config.password,database:config.database,ssl:false,connectionTimeoutMillis:5000,options:'-c statement_timeout=10000 -c lock_timeout=8000'});
 clients.push(c);await c.connect();return c;
}
const admin=await connect();
const query=async(c,sql,args=[]) => (await c.query(sql,args)).rows;
const rpc=async(c,name,args)=>{
 const names=name==='read_statistics_projection'?['p_fixture_id']:['p_fixture_id','p_expected_generation','p_observation','p_chosen_id','p_last_id','p_count','p_version'];
 assert.ok(['read_statistics_projection','commit_statistics_projection'].includes(name));
 return (await query(c,`select public.${name}(${names.map((_,i)=>'$'+(i+1)).join(',')}) as result`,names.map(k=>k==='p_observation'&&args[k]!==null?JSON.stringify(args[k]):args[k])))[0].result;
};
function adapter(c){return {
 async rpc(name,args){try{return {data:await rpc(c,name,args)};}catch(error){return {error:{message:error.message,code:error.code}};}},
 from(table){assert.equal(table,'team_statistics_observations');const filters=[];return {
  select(){return this;},eq(k,v){assert.ok(['id','fixture_id','provider'].includes(k));filters.push([k,v]);return this;},order(){return this;},
  async maybeSingle(){const result=await query(c,`select to_jsonb(t) as row from team_statistics_observations t where ${filters.map(([k],i)=>k+'=$'+(i+1)).join(' and ')}`,filters.map(([,v])=>v));assert.ok(result.length<=1);return {data:result[0]?.row??null};},
  async range(a,b){const result=(await query(c,`with filtered as (select * from team_statistics_observations where ${filters.map(([k],i)=>k+'=$'+(i+1)).join(' and ')}) select (select count(*)::integer from filtered) as count, coalesce((select jsonb_agg(t) from (select * from filtered order by id limit $${filters.length+1} offset $${filters.length+2}) t),'[]'::jsonb) as data`,[...filters.map(([,v])=>v),b-a+1,a]))[0];return result;},
 };},
};}
const options={fixture,now,ttlMs:60000};
const row=(n,seconds=n)=>createStatisticsObservation({id:'10000000-0000-4000-8000-'+String(n).padStart(12,'0'),fixture,now,observedAt:new Date(now-60000+seconds*1000).toISOString(),body:{event_id:223728,stats:{home:{corner_kicks:n}}}});
const head=c=>rpc(c,'read_statistics_projection',{p_fixture_id:fixture.id});
const commit=(c,args)=>rpc(c,'commit_statistics_projection',args);
const plan=async(c,observation)=>{
 const p=await previewStatisticsSelection(adapter(c),{...options,observation});
 return {p_fixture_id:fixture.id,p_expected_generation:p.generation,p_observation:observation,p_chosen_id:p.plan.chosen_id,p_last_id:p.plan.last_id,p_count:p.plan.count,p_version:p.plan.version};
};
const all=async()=> (await query(admin,'select to_jsonb(t) as row from team_statistics_observations t order by observed_at')).map(r=>r.row);
async function equivalent(c){assert.deepEqual(await readProjectedStatistics(adapter(c),options),statisticsView(await all(),options));}
const capture=p=>p.then(data=>({data}),error=>({error}));
const passed=[];
try {
 const settings=(await query(admin,"select current_setting('data_directory') as dir,current_setting('server_version') as version"))[0];
 assert.equal(realpathSync(settings.dir),realpathSync(config.cluster),'must be runner-owned disposable cluster');
 assert.equal((await query(admin,"select count(*)::integer as n from pg_tables where schemaname='public'"))[0].n,0,'must be empty');
 await admin.query('create role anon; create role authenticated; create role service_role bypassrls; create role migration_admin createrole nosuperuser; grant usage,create on schema public to migration_admin with grant option; set role migration_admin;');
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await admin.query(readFileSync('supabase/migrations/'+file,'utf8'));
 for(const side of ['home','away'])await query(admin,"insert into teams(id,provider,external_id,name,fetched_at) values($1,'bsd',$2,'Test',$3)",[fixture[side+'_team_id'],fixture[side+'_external_id'],new Date(now)]);
 const competition=(await query(admin,"insert into competitions(provider,external_id,name,fetched_at) values('bsd','test','Test',$1) returning id",[new Date(now)]))[0].id;
 const season=(await query(admin,"insert into seasons(provider,external_id,competition_id,name,fetched_at) values('bsd','test',$1,'Test',$2) returning id",[competition,new Date(now)]))[0].id;
 await query(admin,"insert into fixtures(id,provider,external_id,season_id,home_team_id,away_team_id,source_status,fetched_at) values($1,'bsd',$2,$3,$4,$5,'finished',$6)",[fixture.id,fixture.external_id,season,fixture.home_team_id,fixture.away_team_id,new Date(now)]);
 await admin.query(readFileSync('supabase/pending/statistics_history_projection.sql','utf8'));
 await admin.query('reset role');
 const audit=(await query(admin,readFileSync('supabase/pending/audit_statistics_projection_acl.sql','utf8')))[0];
 assert.equal(audit.access_ok,true,JSON.stringify(audit));
 const a=await connect(),b=await connect();
 for(const c of [a,b])await c.query('set role service_role');
 const pid=async c=>(await query(c,'select pg_backend_pid() as pid'))[0].pid;
 const aid=await pid(a),bid=await pid(b);assert.notEqual(aid,bid);
 async function blocked(){
  const deadline=Date.now()+5000;
  while(Date.now()<deadline){
   const blockers=(await query(admin,'select pg_blocking_pids($1) as pids',[bid]))[0].pids;
   if(blockers.includes(aid))return;
   await delay(20);
  }
  assert.fail('second PostgreSQL backend never blocked on first');
 }
 // A holds its transaction open. B really waits in another server backend.
 async function race(argsA,argsB,{rollback=false}={}){
  await a.query('begin');
  try {
   const before=await head(admin);
   await commit(a,argsA);
   const pending=capture(commit(b,argsB));
   await blocked();
   assert.deepEqual(await head(admin),before,'uncommitted observation/projection must stay invisible');
   await a.query(rollback?'rollback':'commit');
   return await pending;
  } catch(error){await a.query('rollback');throw error;}
 }
 const r1=row(1),r2=row(2);
 const rootA=await plan(a,r1),rootB=await plan(b,r2);
 const rootRace=await race(rootA,rootB);
 assert.equal(rootRace.error?.message,'STATS_PROJECTION_CHANGED');
 assert.equal((await all()).length,1);
 await commitStatisticsSelection(adapter(b),{...options,observation:r2});await equivalent(b);
 passed.push('concurrent missing root, invisible uncommitted state, CAS conflict and backend retry');

 const r3=row(3),r4=row(4);
 const sameGeneration=await race(await plan(a,r3),await plan(b,r4));
 assert.equal(sameGeneration.error?.message,'STATS_PROJECTION_CHANGED');
 await commitStatisticsSelection(adapter(b),{...options,observation:r4});await equivalent(b);
 passed.push('existing generation collision without lost observations');

 const r5=row(5),identical=await plan(a,r5);
 const duplicate=await race(identical,identical);
 assert.equal(duplicate.data?.replay,true);assert.equal((await all()).length,5);await equivalent(b);
 passed.push('concurrent identical UUID produces one observation and replay');

 const r6=row(6),different=structuredClone(r6);different.payload.home.corner_kicks=999;
 const conflict=await race(await plan(a,r6),await plan(b,different));
 assert.equal(conflict.error?.message,'STATS_IDEMPOTENCY_CONFLICT');assert.equal((await all()).length,6);await equivalent(b);
 passed.push('concurrent changed UUID payload is rejected');

 const r7=row(7),r8=row(8);
 const rolledBack=await race(await plan(a,r7),await plan(b,r8),{rollback:true});
 assert.equal(rolledBack.data?.stored,true);assert.ok(!(await all()).some(r=>r.id===r7.id));await equivalent(b);
 passed.push('waiting writer succeeds after predecessor rolls back');

 const r9=row(9),bad=await plan(a,r9),before=await head(admin);
 await assert.rejects(commit(a,{...bad,p_count:999}),/STATS_PROJECTION_COUNT/);
 assert.deepEqual(await head(admin),before);assert.ok(!(await all()).some(r=>r.id===r9.id));
 passed.push('failure after INSERT rolls back history and projection');

 // Discard commit reply, close that connection, then retry after another generation.
 await commit(a,bad);
 const automaticA=await plan(a,row(12));
 await a.query('begin');
 try {
  await commit(a,automaticA);
  const base=adapter(b);let attempts=0;
  const automatic={...base,async rpc(name,args){if(name==='commit_statistics_projection')attempts++;return base.rpc(name,args);}};
  const waiting=capture(commitStatisticsSelection(automatic,{...options,observation:row(13)}));
  await blocked();await a.query('commit');
  const result=await waiting;
  assert.equal(result.error,undefined);assert.equal(result.data.stored,true);assert.equal(attempts,2);
  await equivalent(b);
 } catch(error){await a.query('rollback');throw error;}
 passed.push('production backend automatically recalculates and retries after a real lock/CAS conflict');

 const simultaneous=await race(await plan(a,row(14)),await plan(b,row(15,14)));
 assert.equal(simultaneous.error?.message,'STATS_PROJECTION_CHANGED');
 const beforeAmbiguity=await head(admin);
 await assert.rejects(commitStatisticsSelection(adapter(b),{...options,observation:row(15,14)}),/STATS_PROJECTION_UNAVAILABLE/);
 assert.deepEqual(await head(admin),beforeAmbiguity);assert.ok(!(await all()).some(r=>r.id===row(15).id));await equivalent(b);
 passed.push('different UUID at the same observation time fails without overwriting');

 await a.end();
 await commitStatisticsSelection(adapter(b),{...options,observation:row(10)});
 const advanced=await head(admin);
 assert.equal((await commitStatisticsSelection(adapter(b),{...options,observation:r9})).replay,true);
 assert.deepEqual(await head(admin),advanced);await equivalent(b);
 passed.push('retry after discarded reply, disconnect and later generation stays idempotent');

 // Retroactive replay through the same production writer, followed by full-reader comparison.
 await commitStatisticsSelection(adapter(b),{...options,observation:row(11,0)});await equivalent(b);
 passed.push('retroactive writer preserves full-reader equivalence');
 console.log(JSON.stringify({postgres:settings.version,independent_writer_connections:2,acl_checks:audit.checks,passed},null,2));
} finally {await Promise.allSettled(clients.map(c=>c.end()));}
