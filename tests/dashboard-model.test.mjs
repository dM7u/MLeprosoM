import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dashboardFixtures,defaultTournament} from '../src/app/dashboard-model.mjs';
const now = Date.parse('2026-09-24T12:00:00Z');
test('dashboard never promotes overdue or undated scheduled fixtures to next match',()=>{
  const rows = [null,'2026-09-23T12:00:00Z','2026-09-25T12:00:00Z'].map(kickoff_at=>({provider:'bsd',source_status:'notstarted',kickoff_at}));
  const result=dashboardFixtures(rows,now);
  assert.equal(result.upcoming.length,1);assert.equal(result.unresolved.length,2);
});
test('tournament uses reviewed fixture classification, skips cup and unknown classifications',()=>{
  const rows=[{kickoff_at:'2026-09-20T00:00:00Z',tournament:{name:'Clausura'}},{kickoff_at:'2026-09-23T00:00:00Z',tournament:{name:'Copa'}}];
  assert.equal(defaultTournament(rows,['Apertura','Clausura'],now),'Clausura');
  assert.equal(defaultTournament([],['Apertura','Clausura'],now),'Anual');
});
