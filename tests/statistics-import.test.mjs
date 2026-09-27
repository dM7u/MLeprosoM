import {createStatisticsObservation} from '../src/server/db/team-statistics.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importTeamStatistics,parseStatisticsImportArgs} from '../src/server/db/import-team-statistics.mjs';
const sample=JSON.parse(readFileSync('docs/research/bsd-team-stats-223728-20260924.json','utf8'));
const scope={provider:'bsd',externalTeamId:'4997',seasonId:'1635',competitionId:'85'};
const fixture={id:'00000000-0000-4000-8000-000000000001',provider:'bsd',external_id:'223728',
  home_team_id:'00000000-0000-4000-8000-000000000002',away_team_id:'00000000-0000-4000-8000-000000000003',
  seasons:{external_id:'1635',competitions:{external_id:'85'}}};
const options={sample,scope,id:'10000000-0000-4000-8000-000000000001',mode:'--dry-run',now:Date.parse(sample.fetched_at)};
function client(value=fixture){
  const rows=[];const filters=[];
  return {rows,filters,from(table){return {select(){return this;},eq(key,v){filters.push([table,key,v]);return this;},
    async maybeSingle(){return {data:table==='teams'?{id:fixture.away_team_id}:value};},
    async insert(row){rows.push(row);return {};}};}};
}
test('statistics dry-run resolves scoped DB identity and never writes',async()=>{
  const db=client();const result=await importTeamStatistics(db,options);
  assert.equal(result.fixture_id,fixture.id);assert.equal(result.status,'complete');assert.equal(db.rows.length,0);
  assert.equal(result.observed_at,sample.fetched_at);assert.equal(result.provider_requests,0);
  assert.ok(db.filters.some(([,key,v])=>key==='seasons.competitions.external_id'&&v==='85'));
});
test('statistics apply stores original timestamp, IDs and failed observations without raw errors',async()=>{
  const db=client();await importTeamStatistics(db,{...options,mode:'--apply'});
  assert.equal(db.rows[0].id,options.id);assert.equal(db.rows[0].observed_at,sample.fetched_at);
  const failed=client();await importTeamStatistics(failed,{...options,mode:'--apply',sample:{failed:true,event_id:223728,fetched_at:sample.fetched_at}});
  assert.equal(failed.rows[0].status,'failed');assert.equal(failed.rows[0].payload,null);
});
test('statistics invalid samples fail before storage; foreign matches never write',async()=>{
  const db={from(){assert.fail('must validate before DB');}};
  for(const invalid of [null,{}, {...sample,fetched_at:'invalid'}, {...sample,failed:true}])
    await assert.rejects(importTeamStatistics(db,{...options,sample:invalid}));
  for(const value of [null,{...fixture,external_id:'1'},{...fixture,seasons:{external_id:'old'}},
    {...fixture,away_team_id:fixture.home_team_id}]){
    const foreign=client(value);await assert.rejects(importTeamStatistics(foreign,options),/OUT_OF_SCOPE/);
    assert.equal(foreign.rows.length,0);
  }
});

function projectedClient({missing=false}={}){
 const history=[];let projection=null;const calls=[];
 const lookup=client();
 const db={history,calls,from(table){
  if(table!=='team_statistics_observations')return lookup.from(table);
  let id;
  return {select(){return this;},eq(key,value){if(key==='id')id=value;return this;},order(){return this;},
   async maybeSingle(){return {data:history.find(r=>r.id===id)??null};},
   async range(start,end){return {data:history.slice(start,end+1),count:history.length};},
   async insert(){assert.fail('projection mode must never use direct insert');}};
 },async rpc(name,args){calls.push(name);
  if(missing)return {error:{message:'private server detail'}};
  if(name==='read_statistics_projection')return {data:{projection,chosen:history.find(r=>r.id===projection?.chosen_id)??null,last:history.find(r=>r.id===projection?.last_id)??null}};
  assert.equal(name,'commit_statistics_projection');history.push(args.p_observation);
  projection={fixture_id:fixture.id,version:1,generation:1,initialized:true,observation_count:args.p_count,chosen_id:args.p_chosen_id,last_id:args.p_last_id};
  return {data:{stored:true,replay:false,generation:1}};
 }};return db;
}
test('projection importer dry-run plans without writes, apply uses only RPC and retry stays idempotent',async()=>{
 const db=projectedClient();
 const dry=await importTeamStatistics(db,{...options,storage:'projection'});
 assert.equal(dry.storage,'projection');assert.equal(dry.writes,0);assert.equal(dry.result.dry_run,true);assert.equal(dry.result.plan.count,1);
 assert.equal(db.history.length,0);assert.deepEqual(db.calls,['read_statistics_projection']);
 const applied=await importTeamStatistics(db,{...options,storage:'projection',mode:'--apply'});
 assert.equal(applied.writes,1);assert.equal(db.history[0].observed_at,sample.fetched_at);
 const retry=await importTeamStatistics(db,{...options,storage:'projection',mode:'--apply'});
 assert.equal(retry.writes,0);assert.equal(retry.result.replay,true);assert.equal(db.history.length,1);
 assert.equal(db.calls.filter(c=>c==='commit_statistics_projection').length,1);
});
test('projection import requires readable RPC even for existing UUID and never falls back to direct storage',async()=>{
 for(const mode of ['--dry-run','--apply']){
  const db=projectedClient({missing:true});
  db.history.push(createStatisticsObservation({id:options.id,fixture,body:sample.body,observedAt:sample.fetched_at,now:options.now}));
  await assert.rejects(importTeamStatistics(db,{...options,storage:'projection',mode}),/^Error: STATS_PROJECTION_UNAVAILABLE$/);
  assert.equal(db.history.length,1);
 }
});
test('invalid statistics storage mode fails before DB lookup',async()=>{
 await assert.rejects(importTeamStatistics({from(){assert.fail('no DB');}},{...options,storage:'auto'}),/STATS_STORAGE_MODE/);
});

test('statistics CLI rejects unknown or repeated storage flags and preserves explicit defaults',()=>{
 for(const flags of [['--storage=auto'],['--storage=projection','--storage=history']])assert.throws(()=>parseStatisticsImportArgs(['sample.json',options.id,'--dry-run',...flags]),/STATS_USAGE/);
 assert.equal(parseStatisticsImportArgs(['sample.json',options.id,'--dry-run']).storage,'history');
 assert.equal(parseStatisticsImportArgs(['sample.json',options.id,'--dry-run','--storage=projection']).storage,'projection');
});
