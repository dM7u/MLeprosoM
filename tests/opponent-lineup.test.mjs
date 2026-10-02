import {test} from 'node:test';
import assert from 'node:assert/strict';
import cache from '../src/server/data/opponent-lineups.json' with {type:'json'};
import {opponentLineupForNext} from '../src/server/db/opponent-lineup.mjs';

const next={provider:'bsd',source_status:'notstarted',kickoff_at:'2026-10-03T20:00:00Z',home_external_id:'4997',away_external_id:'785'};
const now=Date.parse('2026-10-03T12:00:00Z');
test('uses only the next opponent, with eleven identified starters from a prior fixture',()=>{
  const result=opponentLineupForNext(next,'4997',{now});
  assert.equal(result?.team_external_id,'785');
  assert.equal(result?.fixture.external_id,'223725');
  assert.equal(result?.starters.length,11);
  assert.equal(result?.lineup_side,'home');
  assert.equal(result?.starters[0].name,'Nahuel Losada');
  assert.ok(!result?.starters.some(player=>player.name==='Fernando Muslera'));
  assert.equal(opponentLineupForNext({...next,away_external_id:'796'},'4997',{now}),null);
  assert.equal(opponentLineupForNext({...next,kickoff_at:'2026-09-20T20:00:00Z'},'4997',{now:Date.parse('2026-09-19T12:00:00Z')}),null);
});
test('rejects duplicate or missing players and ambiguous cached entries',()=>{
  const invalid=structuredClone(cache.entries[0]);invalid.starters[1].external_id=invalid.starters[0].external_id;
  assert.equal(opponentLineupForNext(next,'4997',{entries:[invalid],now}),null);
  const wrongSide=structuredClone(cache.entries[0]);wrongSide.lineup_side='away';
  assert.equal(opponentLineupForNext(next,'4997',{entries:[wrongSide],now}),null);
  assert.equal(opponentLineupForNext(next,'4997',{entries:[cache.entries[0],cache.entries[0]],now}),null);
});
