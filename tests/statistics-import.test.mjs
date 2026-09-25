import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importTeamStatistics} from '../src/server/db/import-team-statistics.mjs';
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
