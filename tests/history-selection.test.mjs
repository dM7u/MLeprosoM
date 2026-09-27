import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import baseline from './fixtures/history-selection-baseline.json' with {type:'json'};
import {views,scenarios,fixture,now} from './fixtures/history-selection.mjs';
import {emptyHistorySelection,appendHistorySelection,replayHistorySelection,historySelectionView} from '../src/server/db/history-selection.mjs';
for(const [resource,view] of Object.entries(views)){
 test(resource+' preserves pre-refactor output across 130 scenarios',()=>{
  const outputs=scenarios(resource).flatMap(rows=>[5000,60000].map(ttlMs=>view([...rows].reverse(),{fixture,now,ttlMs})));
  assert.equal(outputs.length,baseline[resource].cases);
  assert.equal(createHash('sha256').update(JSON.stringify(outputs)).digest('hex'),baseline[resource].sha256);
 });
 test(resource+' incremental validated selection matches full replay without mutating inputs',()=>{
  for(const rows of scenarios(resource)){
   let state=emptyHistorySelection(resource);
   for(let i=0;i<rows.length;i++){
    const oldState=state,previous=structuredClone(state),rowBefore=structuredClone(rows[i]);
    state=appendHistorySelection(state,rows[i]);
    assert.deepEqual(oldState,previous);assert.deepEqual(rows[i],rowBefore);assert.equal(state.count,i+1);
    assert.deepEqual(historySelectionView(state,{ttlMs:60000,now}),view(rows.slice(0,i+1),{fixture,ttlMs:60000,now}));
    assert.deepEqual(historySelectionView(JSON.parse(JSON.stringify(state)),{ttlMs:60000,now}),historySelectionView(state,{ttlMs:60000,now}));
    const snapshot=structuredClone(state);
    assert.deepEqual(replayHistorySelection(resource,rows.slice(0,i+1)),state);
    assert.deepEqual(state,snapshot);assert.equal(previous.count,i);
   }
  }
 });
 test(resource+' rejects retroactive append, equal instants and unknown reducer versions',()=>{
  const rows=scenarios(resource)[1];
  const state=appendHistorySelection(emptyHistorySelection(resource),rows[1]);
  assert.throws(()=>appendHistorySelection(state,rows[0]),/REPLAY_REQUIRED/);
  assert.throws(()=>appendHistorySelection(state,rows[1]),/AMBIGUOUS/);
  assert.throws(()=>appendHistorySelection({...state,version:2},rows[2]),/SELECTION_STATE/);
 });
}
