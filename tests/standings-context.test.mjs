import {test} from 'node:test';
import assert from 'node:assert/strict';
import {standingsContext,matchupStandings} from '../src/app/standings-context.mjs';

test('context uses existing order, preserves unresolved ties and does not mutate standings',()=>{
  const rows=['a','b','newells','c','d'].map(team_id=>({team_id,calculated_position:null}));
  const before=structuredClone(rows);
  assert.deepEqual(standingsContext(rows,'newells'),rows.slice(1,4));
  assert.deepEqual(rows,before);
  assert.ok(standingsContext(rows,'newells').every(row=>row.calculated_position===null));
});
test('context respects table edges and never substitutes another team or zone',()=>{
  const rows=['a','b','c'].map(team_id=>({team_id}));
  assert.deepEqual(standingsContext(rows,'a'),rows.slice(0,2));
  assert.deepEqual(standingsContext(rows,'c'),rows.slice(1));
  assert.deepEqual(standingsContext(rows,'absent'),[]);
  assert.deepEqual(standingsContext([...rows,rows[0]],'a'),[]);
  assert.deepEqual(standingsContext(undefined,'a'),[]);
});

test('matchup preserves localia, zero points and unresolved ranks in the same scope',()=>{
  const scope={provider:'bsd',competitionId:'85',seasonId:'1635',externalTeamId:'4997'};
  const fixture={provider:'bsd',competition_external_id:'85',season_external_id:'1635',home_external_id:'785',away_external_id:'4997'};
  const rows=[{team_id:'4997',calculated_position:null,pts:0},{team_id:'785',calculated_position:2,pts:20}];
  assert.deepEqual(matchupStandings(rows,fixture,scope),[rows[1],rows[0]]);
  for(const change of [{provider:'goal-api'},{season_external_id:'old'},{competition_external_id:'cup'},
    {home_external_id:null},{away_external_id:'785'},{away_external_id:'other'}])
    assert.deepEqual(matchupStandings(rows,{...fixture,...change},scope),[]);
  assert.deepEqual(matchupStandings([...rows,rows[0]],fixture,scope),[]);
  assert.deepEqual(matchupStandings(rows.slice(0,1),fixture,scope),[]);
  assert.deepEqual(matchupStandings(rows,undefined,scope),[]);
});
