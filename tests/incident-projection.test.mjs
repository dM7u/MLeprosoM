import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,now,scenarios,views} from './fixtures/history-selection.mjs';
import {replayHistorySelection,historySelectionView} from '../src/server/db/history-selection.mjs';
import {validateIncidentProjection,readProjectedIncidents,commitIncidentSelection} from '../src/server/db/incident-projection.mjs';
const opts={fixture,now,ttlMs:60000};
const envelope=rows=>{const s=replayHistorySelection('incidents',rows);return {projection:{fixture_id:fixture.id,version:1,generation:1,observation_count:rows.length,initialized:true,chosen_id:s.chosen?.id??null,last_id:s.last?.id??null},chosen:s.chosen,last:s.last};};
test('incident projection matches 130 replay results including shortened lists, empty and failed observations',()=>{
 for(const rows of scenarios('incidents'))for(const ttlMs of [5000,60000]){
  const {state}=validateIncidentProjection(JSON.parse(JSON.stringify(envelope(rows))),opts);
  assert.deepEqual(historySelectionView(state,{ttlMs,now}),views.incidents(rows,{...opts,ttlMs}));
 }
});
test('incident projection rejects cross-team identities, malformed payload and references',()=>{
 const original=envelope(scenarios('incidents')[1]);
 for(const change of [e=>e.projection.version=2,e=>e.projection.observation_count=-1,e=>e.last=null,e=>e.chosen.home_team_id=fixture.away_team_id,e=>e.chosen.payload.incidents[0].source_index=99,e=>e.projection.chosen_id=null]){
  const e=structuredClone(original);change(e);assert.throws(()=>validateIncidentProjection(e,opts));
 }
 assert.throws(()=>validateIncidentProjection({projection:null,chosen:null,last:null},{...opts,fixture:{...fixture,external_id:null}}));
});
test('incident RPC absence fails closed and transport diagnostics are sanitized',async()=>{
 for(const response of [{error:{message:'private'}},{data:{projection:null,chosen:null,last:null}},{data:{}}]){
  let calls=0;const db={rpc:async()=>{calls++;return response;},from(){assert.fail('no fallback');}};
  assert.equal((await readProjectedIncidents(db,opts)).status,'error');assert.equal(calls,1);
 }
 await assert.rejects(commitIncidentSelection({rpc:async()=>{throw Error('private');}},opts),/^Error: INCIDENTS_PROJECTION_UNAVAILABLE$/);
});

test('incident projection rejects a retained list when a later useful list retracts events',()=>{
 const rows=scenarios('incidents').find(rows=>rows.length===3&&rows[0].payload?.incidents.length>1&&rows[2].payload?.incidents.length===1);
 assert.ok(rows);
 const e=envelope(rows);
 e.chosen=rows[0];e.projection.chosen_id=rows[0].id;
 assert.throws(()=>validateIncidentProjection(e,opts),/PROJECTION_INVALID/);
});
