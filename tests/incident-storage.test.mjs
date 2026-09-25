import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createIncidentObservation,validateIncidentObservation,storeIncidentObservation,incidentSnapshotView,readIncidents} from '../src/server/db/incident-observations.mjs';
const sample=JSON.parse(readFileSync('docs/research/bsd-incidents-223728-20260925.json','utf8'));
const fixture={id:'00000000-0000-4000-8000-000000000001',provider:'bsd',external_id:'223728',home_team_id:'00000000-0000-4000-8000-000000000002',away_team_id:'00000000-0000-4000-8000-000000000003'};
const start=Date.parse(sample.fetched_at),options={fixture,now:start+10000,ttlMs:60000};
const row=(n,incidents=sample.body.incidents)=>createIncidentObservation({id:`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`,fixture,body:{event_id:223728,incidents},observedAt:new Date(start+n*1000).toISOString(),now:options.now});
test('newer nonempty incident snapshot replaces entire list even if shorter or partial',()=>{
  const a=row(1),b=row(2,sample.body.incidents.filter(r=>r.type!=='goal'));
  const v=incidentSnapshotView([b,a],options);assert.equal(v.data.incidents.length,21);assert.equal(v.updatedAt,b.observed_at);
  assert.ok(!v.data.incidents.some(r=>r.type==='goal'));
  const c=row(3,[{type:'VAR',minute:20}]);assert.equal(incidentSnapshotView([a,b,c],options).status,'partial');
  assert.equal(incidentSnapshotView([a,b,c],options).data.incidents.length,1);
});
test('empty or failed observations retain previous snapshot without rejuvenation',()=>{
  const a=row(1),empty=row(2,[]);
  const failed=createIncidentObservation({id:row(3).id,fixture,failed:true,observedAt:row(3).observed_at,now:options.now});
  for(const later of [empty,failed]){const v=incidentSnapshotView([a,later],options);assert.equal(v.status,'stale');assert.equal(v.updatedAt,a.observed_at);assert.equal(v.lastObservedAt,later.observed_at);}
  assert.equal(incidentSnapshotView([empty],options).status,'empty');assert.equal(incidentSnapshotView([failed],options).status,'error');
});
test('incidents reject forged payload, mixed binding, collisions and truncated history',()=>{
  const a=row(1);assert.deepEqual(validateIncidentObservation(a,{now:options.now}),a);
  const forged=structuredClone(a);forged.payload.incidents[0].source_index=50;assert.throws(()=>validateIncidentObservation(forged,{now:options.now}));
  assert.throws(()=>incidentSnapshotView([{...a,external_id:'1'}],options),/IDENTITY/);
  assert.throws(()=>incidentSnapshotView([a,a],options),/AMBIGUOUS/);
  assert.throws(()=>incidentSnapshotView(Array(101).fill(a),options),/HISTORY_LIMIT/);
});
test('incident storage retries identical content; conflicts and read failures are sanitized',async()=>{
  let saved;const db={from(){return this;},async insert(r){if(saved)return {error:{code:'23505'}};saved=r;return {};},select(){return this;},eq(){return this;},async single(){return {data:saved};}};
  const a=row(1);assert.equal((await storeIncidentObservation(db,a,options)).stored,true);assert.equal((await storeIncidentObservation(db,a,options)).replay,true);
  await assert.rejects(storeIncidentObservation(db,row(1,[]),options),/CONFLICT/);
  assert.equal((await readIncidents({from(){throw new Error('private');}},options)).status,'error');
});
