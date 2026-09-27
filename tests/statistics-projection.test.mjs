import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,now,scenarios,views} from './fixtures/history-selection.mjs';
import {replayHistorySelection,historySelectionView} from '../src/server/db/history-selection.mjs';
import {validateStatisticsProjection,readProjectedStatistics,commitStatisticsSelection} from '../src/server/db/statistics-projection.mjs';
const opts={fixture,now,ttlMs:60000};
function envelope(rows){const state=replayHistorySelection('statistics',rows);return {projection:{fixture_id:fixture.id,version:1,generation:1,observation_count:rows.length,initialized:true,chosen_id:state.chosen?.id??null,last_id:state.last?.id??null},chosen:state.chosen,last:state.last};}
test('statistics persisted projection matches 65 complete replay cases and both TTL states',()=>{
 for(const rows of scenarios('statistics'))for(const ttlMs of [5000,60000]){
 const {state}=validateStatisticsProjection(JSON.parse(JSON.stringify(envelope(rows))),opts);
 assert.deepEqual(historySelectionView(state,{ttlMs,now}),views.statistics(rows,{...opts,ttlMs}));
 }
});
test('statistics projection fails closed on missing references, malformed counters and identities',()=>{
 const original=envelope(scenarios('statistics')[1]);
 for(const change of [e=>e.projection.version=2,e=>e.projection.generation=Number.MAX_SAFE_INTEGER+1,e=>e.projection.observation_count=-1,e=>e.projection.chosen_id=null,e=>e.last=null,e=>e.chosen.fixture_id=fixture.home_team_id,e=>e.projection.initialized=false]){
 const e=structuredClone(original);change(e);assert.throws(()=>validateStatisticsProjection(e,opts));
 }
 assert.deepEqual(validateStatisticsProjection({projection:null,chosen:null,last:null},opts),{generation:0,state:null});
});
test('statistics projection read never falls back on errors or absent bootstrap',async()=>{
 for(const response of [{error:{message:'private'}},{data:{projection:null,chosen:null,last:null}},{data:{}}]){
 let calls=0;const db={rpc:async()=>{calls++;return response;}};
 const result=await readProjectedStatistics(db,opts);assert.equal(result.status,'error');assert.equal(result.data,null);assert.equal(calls,1);
 }
});
test('statistics projection commit sanitizes unexpected transport failures',async()=>{
 await assert.rejects(commitStatisticsSelection({rpc:async()=>{throw Error('private connection');}},opts),/^Error: STATS_PROJECTION_UNAVAILABLE$/);
});
