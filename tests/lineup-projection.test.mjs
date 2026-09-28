import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,now,scenarios,views} from './fixtures/history-selection.mjs';
import {replayHistorySelection,historySelectionView} from '../src/server/db/history-selection.mjs';
import {validateLineupProjection,readProjectedLineups,commitLineupSelection} from '../src/server/db/lineup-projection.mjs';
const opts={fixture,now,ttlMs:60000};
const envelope=rows=>{const s=replayHistorySelection('lineups',rows);return {projection:{fixture_id:fixture.id,version:1,generation:1,observation_count:rows.length,initialized:true,chosen_id:s.chosen?.id??null,last_id:s.last?.id??null},chosen:s.chosen,last:s.last};};
test('lineup projection matches 130 replay results including partial, predicted and regressed source dates',()=>{
 for(const rows of scenarios('lineups'))for(const ttlMs of [5000,60000]){
  const {state}=validateLineupProjection(JSON.parse(JSON.stringify(envelope(rows))),opts);
  assert.deepEqual(historySelectionView(state,{ttlMs,now}),views.lineups(rows,{...opts,ttlMs}));
 }
});
test('lineup projection rejects cross-team identities, malformed payload and references',()=>{
 const original=envelope(scenarios('lineups')[1]);
 for(const change of [e=>e.projection.version=2,e=>e.projection.observation_count=-1,e=>e.last=null,e=>e.chosen.home_external_id='4997',e=>e.chosen.payload.home.starters[0].name='',e=>e.projection.chosen_id=null]){
  const e=structuredClone(original);change(e);assert.throws(()=>validateLineupProjection(e,opts));
 }
 assert.throws(()=>validateLineupProjection({projection:null,chosen:null,last:null},{...opts,fixture:{...fixture,home_external_id:null}}));
});
test('lineup RPC absence fails closed and transport diagnostics are sanitized',async()=>{
 for(const response of [{error:{message:'private'}},{data:{projection:null,chosen:null,last:null}},{data:{}}]){
  let calls=0;const db={rpc:async()=>{calls++;return response;},from(){assert.fail('no fallback');}};
  assert.equal((await readProjectedLineups(db,opts)).status,'error');assert.equal(calls,1);
 }
 await assert.rejects(commitLineupSelection({rpc:async()=>{throw Error('private');}},opts),/^Error: LINEUPS_PROJECTION_UNAVAILABLE$/);
});
