import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLineupObservation,validateLineupObservation,storeLineupObservation} from '../src/server/db/lineup-observations.mjs';
const sample=JSON.parse(readFileSync('docs/research/bsd-lineups-223728-20260925.json','utf8'));
const fixture={id:'00000000-0000-4000-8000-000000000001',provider:'bsd',external_id:'223728',
  home_team_id:'00000000-0000-4000-8000-000000000002',away_team_id:'00000000-0000-4000-8000-000000000003',
  home_external_id:'796',away_external_id:'4997'};
const now=Date.parse(sample.fetched_at);
const create=(body=sample.body)=>createLineupObservation({id:'10000000-0000-4000-8000-000000000001',fixture,body,observedAt:sample.fetched_at,now});
test('lineup observation preserves confirmed identities and excludes predicted players',()=>{
  const row=create();assert.deepEqual(validateLineupObservation(row,{now}),row);
  const excluded=create({...sample.body,lineup_status:'predicted'});
  assert.equal(excluded.status,'unavailable');assert.equal(excluded.payload.home,null);
  assert.deepEqual(validateLineupObservation(excluded,{now}),excluded);
  assert.equal(validateLineupObservation({...row,observed_at:row.observed_at.replace('Z','+00:00')},{now}).status,'complete');
});
test('forged binding, payload version, duplicate players and chronology reject before writing',()=>{
  for(const mutate of [r=>r.home_external_id='999',r=>r.payload.version=2,r=>r.payload.home.starters.push(r.payload.home.starters[0]),
    r=>r.status='partial',r=>r.payload.fetched_at='2000-01-01T00:00:00Z']){
    const row=create();mutate(row);assert.throws(()=>validateLineupObservation(row,{now}));
  }
});
test('lineup store is append-only with stable retries, conflicts and sanitized failures',async()=>{
  let saved;const db={from(){return this;},async insert(row){if(saved)return {error:{code:'23505'}};saved=row;return {};},
    select(){return this;},eq(){return this;},async single(){return {data:saved};}};
  const row=create();assert.equal((await storeLineupObservation(db,row,{now})).stored,true);
  assert.equal((await storeLineupObservation(db,row,{now})).replay,true);
  const changed=create();changed.payload.home.formation='4-4-2';
  await assert.rejects(storeLineupObservation(db,changed,{now}),/IDEMPOTENCY_CONFLICT/);
  await assert.rejects(storeLineupObservation({from(){throw new Error('private');}},row,{now}),/^Error: LINEUPS_STORAGE_FAILED$/);
});
