// Isolated synthetic volume probe. No network, env files or production connection.
import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createStatisticsObservation,readStatistics} from '../../src/server/db/team-statistics.mjs';
import {createLineupObservation} from '../../src/server/db/lineup-observations.mjs';
import {readLineups} from '../../src/server/db/read-lineups.mjs';
import {createIncidentObservation,readIncidents} from '../../src/server/db/incident-observations.mjs';
const db=new PGlite();
const base=Date.parse('2020-01-01T00:00:00Z'),now=base+86400000;
const fixture={id:'00000000-0000-4000-8000-000000000001',provider:'bsd',external_id:'223728',home_team_id:'00000000-0000-4000-8000-000000000002',away_team_id:'00000000-0000-4000-8000-000000000003',home_external_id:'796',away_external_id:'4997'};
const resources=[
 ['team_statistics_observations','bsd-team-stats-223728-20260924.json',createStatisticsObservation,readStatistics],
 ['lineup_observations','bsd-lineups-223728-20260925.json',createLineupObservation,readLineups],
 ['incident_observations','bsd-incidents-223728-20260925.json',createIncidentObservation,readIncidents],
];
const results=[];
const stamp=i=>new Date(base+i*1000).toISOString();
try {
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for(const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 for(const side of ['home','away'])await db.query("insert into teams(id,provider,external_id,name,fetched_at) values($1,'bsd',$2,'Synthetic test',$3)",[fixture[side+'_team_id'],fixture[side+'_external_id'],stamp(0)]);
 const competition=(await db.query("insert into competitions(provider,external_id,name,fetched_at) values('bsd','test','Synthetic test',$1) returning id",[stamp(0)])).rows[0].id;
 const season=(await db.query("insert into seasons(provider,external_id,competition_id,name,fetched_at) values('bsd','test',$1,'Synthetic test',$2) returning id",[competition,stamp(0)])).rows[0].id;
 await db.query("insert into fixtures(id,provider,external_id,season_id,home_team_id,away_team_id,source_status,fetched_at) values($1,'bsd',$2,$3,$4,$5,'finished',$6)",[fixture.id,fixture.external_id,season,fixture.home_team_id,fixture.away_team_id,stamp(0)]);
 for(const [table,file,create,read] of resources) {
  const sample=JSON.parse(readFileSync('docs/research/'+file,'utf8')).body;
  const row=(i,unavailable=false)=>{
   const args={id:'10000000-0000-4000-8000-'+String(i).padStart(12,'0'),fixture,observedAt:stamp(i),now};
   if(table==='lineup_observations')return create({...args,body:{...sample,updated_at:stamp(i),...(unavailable?{lineup_status:'predicted'}:{})}});
   return create({...args,...(unavailable?{failed:true}:{body:sample})});
  };
  const insert=async rows=>{
   const keys=Object.keys(rows[0]);
   // Table and column names originate solely in fixed local resource definitions.
   await db.query(`insert into ${table} (${keys.join(',')}) select ${keys.join(',')} from jsonb_populate_recordset(null::${table},$1::jsonb)`,[JSON.stringify(rows)]);
  };
  for(const count of [1,100,1000,5000]) {
   await db.exec(`truncate ${table}`); // Only this in-memory PGlite instance.
   for(let first=1;first<=count;first+=100)await insert(Array.from({length:Math.min(100,count-first+1)},(_,j)=>row(first+j,count>1&&first+j===count)));
   for(const cap of count===1000?[100,25]:[100]) {
    const runs=[];
    for(let iteration=0;iteration<3;iteration++) {
     let pages=0,bytes=0,returned=0;
     const client={from(name){assert.equal(name,table);return {select(selection,options){assert.equal(selection,'*');assert.equal(options.count,'exact');return this;},eq(key,value){assert.equal(value,key==='fixture_id'?fixture.id:fixture.provider);assert.ok(['fixture_id','provider'].includes(key));return this;},order(key,options){assert.equal(key,'id');assert.equal(options.ascending,true);return this;},async range(start,end){
      const answer=(await db.query(`select (select count(*)::int from ${table} where fixture_id=$1 and provider=$2) as count, coalesce((select jsonb_agg(to_jsonb(p) order by p.id) from (select * from ${table} where fixture_id=$1 and provider=$2 order by id limit $3 offset $4) p),'[]'::jsonb) as data`,[fixture.id,fixture.provider,Math.min(cap,end-start+1),start])).rows[0];
      pages++;returned+=answer.data.length;bytes+=Buffer.byteLength(JSON.stringify(answer.data));return {...answer,error:null};
     }};}};
     await db.exec('set role service_role');
     const start=performance.now();
     const view=await read(client,{fixture,ttlMs:2*86400000,now});
     const elapsed=performance.now()-start;
     await db.exec('reset role');
     assert.ok(view.data);assert.equal(Date.parse(view.updatedAt),Date.parse(stamp(count>1?count-1:count)));
     assert.equal(Date.parse(view.lastObservedAt),Date.parse(stamp(count)));
     assert.equal(view.status,count>1?'stale':'fresh');
     assert.equal(returned,count);assert.equal(pages,Math.ceil(count/cap));
     runs.push({pages,returned,bytes_json:bytes,elapsed_ms:Math.round(elapsed*100)/100});
    }
    const sorted=runs.map(r=>r.elapsed_ms).sort((a,b)=>a-b);
    const result={table,observations:count,page_cap:cap,runs,median_ms:sorted[1]};results.push(result);
    console.log(JSON.stringify({table,observations:count,page_cap:cap,pages:runs[0].pages,bytes_json:runs[0].bytes_json,median_ms:sorted[1]}));
   }
  }
 }
 const report={recorded_at:new Date().toISOString(),environment:'PGlite in-memory, synthetic clones of saved payload shapes, 3 sequential local runs; no HTTP or network',node:process.version,remote_writes:0,provider_requests:0,results};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
 console.log('PASS: volume, full traversal, last-known-good timestamp retention and server page caps');
}finally{await db.close();}
