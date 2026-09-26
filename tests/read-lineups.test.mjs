import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLineupObservation} from '../src/server/db/lineup-observations.mjs';
import {lineupSnapshotView,readLineups} from '../src/server/db/read-lineups.mjs';
import {importLineups} from '../src/server/db/import-lineups.mjs';
const sample=JSON.parse(readFileSync('docs/research/bsd-lineups-223728-20260925.json','utf8'));
const fixture={id:'00000000-0000-4000-8000-000000000001',provider:'bsd',external_id:'223728',
  home_team_id:'00000000-0000-4000-8000-000000000002',away_team_id:'00000000-0000-4000-8000-000000000003',home_external_id:'796',away_external_id:'4997'};
const start=Date.parse(sample.fetched_at);
const options={fixture,ttlMs:60000,now:start+10000};
const row=(n,body=sample.body)=>createLineupObservation({id:`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`,fixture,body,observedAt:new Date(start+n*1000).toISOString(),now:options.now});
test('lineup reader retains confirmed data and age after prediction, partial or older source revision',()=>{
  const first=row(1);
  const partial=structuredClone(sample.body);partial.lineups.home.players.pop();
  for(const body of [{...sample.body,lineup_status:'predicted'},partial,{...sample.body,updated_at:'2000-01-01T00:00:00Z'}]){
    const later=row(2,body),view=lineupSnapshotView([later,first],options);
    assert.equal(view.status,'stale');assert.equal(view.updatedAt,first.observed_at);
    assert.equal(view.data.home.starters.length,11);assert.equal(view.lastObservedAt,later.observed_at);
  }
  assert.equal(lineupSnapshotView([row(1,partial)],options).status,'partial');
  assert.equal(lineupSnapshotView([row(1,{...sample.body,lineup_status:'predicted'})],options).status,'empty');
});
test('lineup reader accepts newer complete revision; rejects mixed identity, collisions and excess history',()=>{
  const a=row(1),b=row(2);b.payload.home.formation='4-4-2';
  assert.equal(lineupSnapshotView([a,b],options).data.home.formation,'4-4-2');
  assert.throws(()=>lineupSnapshotView([{...a,home_external_id:'9'}],options),/IDENTITY/);
  assert.throws(()=>lineupSnapshotView([a,a],options),/AMBIGUOUS/);
  assert.equal(lineupSnapshotView([a],{...options,now:start+100000}).status,'stale');
});
test('lineup storage read stays scoped and sanitizes failures',async()=>{
  const filters=[];const db={from(table){assert.equal(table,'lineup_observations');return this;},select(){return this;},eq(k,v){filters.push([k,v]);return this;},order(){return this;},async range(from,to){assert.equal(from,0);assert.equal(to,99);return {data:[row(1)],count:1};}};
  assert.equal((await readLineups(db,options)).status,'fresh');
  assert.deepEqual(filters,[['fixture_id',fixture.id],['provider','bsd']]);
  assert.equal((await readLineups({from(){throw new Error('private');}},options)).status,'error');
});
test('lineup import validates before DB and rejects absent scoped fixture',async()=>{
  const args={sample,scope:{provider:'bsd',externalTeamId:'4997',competitionId:'85',seasonId:'1635'},id:row(1).id,mode:'--dry-run',now:options.now};
  await assert.rejects(importLineups({from(){assert.fail('invalid sample must not read');}},{...args,sample:null}));
  const empty={from(){return this;},select(){return this;},eq(){return this;},async maybeSingle(){return {data:null};}};
  await assert.rejects(importLineups(empty,args),/OUT_OF_SCOPE/);
});
