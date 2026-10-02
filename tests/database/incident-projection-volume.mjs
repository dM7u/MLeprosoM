// Isolated scale comparison: no network, environment files or remote writes.
import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createIncidentObservation,readIncidents} from '../../src/server/db/incident-observations.mjs';
import {commitIncidentSelection,readProjectedIncidents} from '../../src/server/db/incident-projection.mjs';

const db=new PGlite();
const base=Date.parse('2020-01-01T00:00:00Z'),now=base+86400000;
const fixture={id:'00000000-0000-4000-8000-000000000001',provider:'bsd',external_id:'223728',home_team_id:'00000000-0000-4000-8000-000000000002',away_team_id:'00000000-0000-4000-8000-000000000003',home_external_id:'796',away_external_id:'4997'};
const sample=JSON.parse(readFileSync('docs/research/bsd-incidents-223728-20260925.json','utf8')).body;
const stamp=i=>new Date(base+i*1000).toISOString();
const options={fixture,now,ttlMs:2*86400000};
const tails=['available','short','partial','empty','failed'];
function observationAt(i,kind){
 const body=structuredClone(sample);
 if(kind==='short')body.incidents=body.incidents.filter(event=>event.type!=='goal');
 if(kind==='partial')body.incidents=[{type:'unknown_test',minute:null}];
 if(kind==='empty')body.incidents=[];
 return createIncidentObservation({id:'10000000-0000-4000-8000-'+String(i).padStart(12,'0'),fixture,observedAt:stamp(i),now,...(kind==='failed'?{failed:true}:{body})});
}
const results=[];
let metrics;
const reset=()=>{metrics={history_queries:0,read_rpc:0,commit_rpc:0,history_rows:0,bytes_json:0};};
const client={
 from(table){assert.equal(table,'incident_observations');return {
  select(){return this;},eq(k,v){assert.ok(['fixture_id','provider'].includes(k));assert.equal(v,k==='fixture_id'?fixture.id:fixture.provider);return this;},
  order(k){assert.equal(k,'id');return this;},
  async range(start,end){
   const data=(await db.query(`select (select count(*)::integer from incident_observations where fixture_id=$1 and provider=$2) as count,
    coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from (select * from incident_observations where fixture_id=$1 and provider=$2 order by id limit $3 offset $4) t),'[]'::jsonb) as data`,[fixture.id,fixture.provider,end-start+1,start])).rows[0];
   metrics.history_queries++;metrics.history_rows+=data.data.length;metrics.bytes_json+=Buffer.byteLength(JSON.stringify(data.data));return data;
  },
 };},
 async rpc(name,args){
  assert.ok(['read_incident_projection','commit_incident_projection'].includes(name));
  const keys=name==='read_incident_projection'?['p_fixture_id']:['p_fixture_id','p_expected_generation','p_observation','p_chosen_id','p_last_id','p_count','p_version'];
  const data=(await db.query(`select public.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) as data`,keys.map(k=>args[k]))).rows[0].data;
  if(name==='read_incident_projection')metrics.read_rpc++;else metrics.commit_rpc++;
  metrics.bytes_json+=Buffer.byteLength(JSON.stringify(data));return {data};
 },
};
async function measure(read){reset();const start=performance.now();const view=await read();return {view,metrics:{...metrics,elapsed_ms:Math.round((performance.now()-start)*100)/100}};}
try{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 for(const side of ['home','away'])await db.query("insert into teams(id,provider,external_id,name,fetched_at) values($1,'bsd',$2,'Synthetic test',$3)",[fixture[side+'_team_id'],fixture[side+'_external_id'],stamp(0)]);
 const competition=(await db.query("insert into competitions(provider,external_id,name,fetched_at) values('bsd','test','Synthetic test',$1) returning id",[stamp(0)])).rows[0].id;
 const season=(await db.query("insert into seasons(provider,external_id,competition_id,name,fetched_at) values('bsd','test',$1,'Synthetic test',$2) returning id",[competition,stamp(0)])).rows[0].id;
 await db.query("insert into fixtures(id,provider,external_id,season_id,home_team_id,away_team_id,source_status,fetched_at) values($1,'bsd',$2,$3,$4,$5,'finished',$6)",[fixture.id,fixture.external_id,season,fixture.home_team_id,fixture.away_team_id,stamp(0)]);
 await db.exec(readFileSync('supabase/pending/incident_history_projection.sql','utf8'));
 for(const count of [0,1,100,1000,5000])for(const tail of count===0?['none']:tails){
  // Admin-only setup in this in-memory DB; production cannot bypass its writer.
  await db.exec('truncate incident_history_projection,incident_observations');
  for(let first=1;first<=count;first+=100){
   const rows=Array.from({length:Math.min(100,count-first+1)},(_,j)=>{
    const i=first+j;return {created_at:new Date(now).toISOString(),...observationAt(i,i===count?tail:'available')};
   });
   const keys=Object.keys(rows[0]);
   await db.query(`insert into incident_observations(${keys.join(',')}) select ${keys.join(',')} from jsonb_populate_recordset(null::incident_observations,$1)`,[JSON.stringify(rows)]);
  }
  await db.exec('set role service_role');
  const bootstrap=await measure(()=>commitIncidentSelection(client,options));
  assert.equal(bootstrap.metrics.history_rows,count);assert.equal(bootstrap.metrics.commit_rpc,1);
  const runs=[];
  for(let iteration=0;iteration<3;iteration++){
   let history,projection;
   const reads={history:async()=>{history=await measure(()=>readIncidents(client,options));},projection:async()=>{projection=await measure(()=>readProjectedIncidents(client,options));}};
   for(const name of iteration%2?['projection','history']:['history','projection'])await reads[name]();
   assert.deepEqual(projection.view,history.view);
   assert.equal(history.metrics.history_rows,count);assert.equal(history.metrics.history_queries,Math.max(1,Math.ceil(count/100)));
   assert.equal(projection.metrics.read_rpc,1);assert.equal(projection.metrics.history_queries,0);assert.equal(projection.metrics.commit_rpc,0);
   const retained=['empty','failed'].includes(tail);
   assert.equal(projection.view.status,count===0?'empty':retained?(count===1?(tail==='failed'?'error':'empty'):'stale'):tail==='partial'?'partial':'fresh');
   if(count)assert.equal(Date.parse(projection.view.lastObservedAt),Date.parse(stamp(count)));
   if(projection.view.data){
    const selected=retained?count-1:count;
    assert.equal(Date.parse(projection.view.updatedAt),Date.parse(stamp(selected)));
    const expected=observationAt(selected,retained?'available':tail).payload;
    assert.deepEqual({...projection.view.data,fetched_at:new Date(projection.view.data.fetched_at).toISOString()},expected);
    assert.equal(projection.view.data.coverage,'unverified');
    if(tail==='short')assert.ok(!projection.view.data.incidents.some(event=>event.type==='goal'));
   }
   runs.push({history:history.metrics,projection:projection.metrics});
  }
  await db.exec('reset role');
  const result={observations:count,tail,bootstrap:bootstrap.metrics,runs};results.push(result);
  console.log(JSON.stringify({observations:count,tail,history_queries:runs[0].history.history_queries,history_bytes:runs[0].history.bytes_json,projection_queries:runs[0].projection.read_rpc,projection_bytes:runs[0].projection.bytes_json}));
 }
 // Same payload shapes: metadata count may add digits, never transfer the prefix.
 for(const tail of tails){
  const sizes=results.filter(r=>r.tail===tail&&r.observations>=100).map(r=>r.runs[0].projection.bytes_json);
  assert.ok(Math.max(...sizes)-Math.min(...sizes)<=4);
 }
 const report={recorded_at:new Date().toISOString(),environment:'PGlite in-memory, 3 paired local runs per scenario; alternating reader order, no HTTP/network',node:process.version,remote_writes:0,provider_requests:0,results};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
 console.log('PASS: 63 paired reads, full result equivalence, bounded projection response, separate bootstrap cost');
}finally{await db.close();}

