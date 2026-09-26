import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStatisticsObservation,statisticsView,readStatistics,storeStatisticsObservation} from '../src/server/db/team-statistics.mjs';
const sample=JSON.parse(readFileSync('docs/research/bsd-team-stats-223728-20260924.json','utf8'));
export const fixture={id:'00000000-0000-4000-8000-000000000001',provider:'bsd',external_id:'223728',
  home_team_id:'00000000-0000-4000-8000-000000000002',away_team_id:'00000000-0000-4000-8000-000000000003'};
const start=Date.parse(sample.fetched_at);
const options={fixture,now:start+10000,ttlMs:60000};
const row=(n,body=sample.body)=>createStatisticsObservation({id:`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`,
  fixture,body,observedAt:new Date(start+n*1000).toISOString(),now:options.now});

test('stats retain complete snapshot and original age after partial, empty and failed observations',()=>{
  const complete=row(1),partial=row(2,{event_id:223728,stats:{home:{total_shots:99}}});
  const empty=row(3,{event_id:223728,stats:{}});
  const failed=createStatisticsObservation({id:row(4).id,fixture,observedAt:row(4).observed_at,failed:true,now:options.now});
  for(const later of [partial,empty,failed]){
    const result=statisticsView([later,complete],options);
    assert.equal(result.status,'stale');assert.equal(result.data.home.total_shots,5);
    assert.equal(result.data.away.red_cards,0);assert.equal(result.updatedAt,complete.observed_at);
    assert.equal(result.lastObservedAt,later.observed_at);
  }
  assert.equal(statisticsView([empty],options).status,'empty');
  assert.equal(statisticsView([failed],options).status,'error');
});

test('partial observations replace only supersets; no fabricated metrics or cross-snapshot merge',()=>{
  const a=row(1,{event_id:223728,stats:{home:{red_cards:0}}});
  const b=row(2,{event_id:223728,stats:{away:{red_cards:1}}});
  assert.equal(statisticsView([a,b],options).data.away.red_cards,null);
  const c=row(3,{event_id:223728,stats:{home:{red_cards:1},away:{red_cards:2}}});
  const result=statisticsView([a,b,c],options);
  assert.equal(result.status,'partial');assert.equal(result.data.home.red_cards,1);
  assert.equal(statisticsView([a,b,c],{...options,now:start+100000}).status,'stale');
});

test('identity, corrupted payload, timestamp collisions and truncated history fail closed',()=>{
  const a=row(1);
  for(const changed of [{...a,home_team_id:fixture.away_team_id},{...a,payload:{...a.payload,version:2}},
    {...a,payload:{...a.payload,fetched_at:row(2).observed_at}}, {...a,status:'empty'}])
    assert.throws(()=>statisticsView([changed],options));
  assert.throws(()=>statisticsView([a,a],options),/AMBIGUOUS/);
  const sqlTime={...a,observed_at:a.observed_at.replace('Z','+00:00')};
  assert.equal(statisticsView([sqlTime],options).status,'fresh');
});

test('reader scopes storage and sanitizes failures without querying providers',async()=>{
  const calls=[];
  const db={from(table){assert.equal(table,'team_statistics_observations');return this;},select(){return this;},
    eq(k,v){calls.push([k,v]);return this;},order(){return this;},async range(from,to){assert.equal(from,0);assert.equal(to,99);return {data:[row(1)],count:1};}};
  assert.equal((await readStatistics(db,options)).status,'fresh');
  assert.deepEqual(calls,[['fixture_id',fixture.id],['provider','bsd']]);
  assert.equal((await readStatistics({from(){throw new Error('private information');}},options)).status,'error');
});

test('storage retries identical observations, rejects conflicts, sanitizes DB errors',async()=>{
  const a=row(1);let existing=null;
  const db={from(){return this;},async insert(value){if(existing)return {error:{code:'23505'}};existing=value;return {};},
    select(){return this;},eq(){return this;},async single(){return {data:existing};}};
  assert.equal((await storeStatisticsObservation(db,a,options)).stored,true);
  assert.equal((await storeStatisticsObservation(db,a,options)).replay,true);
  const changed=structuredClone(a);changed.payload.home.red_cards++;
  await assert.rejects(storeStatisticsObservation(db,changed,options),/IDEMPOTENCY_CONFLICT/);
  await assert.rejects(storeStatisticsObservation({from(){throw new Error('private');}},a,options),/^Error: STATS_STORAGE_FAILED$/);
});
