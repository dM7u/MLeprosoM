import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLineupObservation} from '../src/server/db/lineup-observations.mjs';
import {teamStartsView} from '../src/server/db/team-starts.mjs';

const sample=JSON.parse(readFileSync('docs/research/bsd-lineups-223728-20260925.json','utf8'));
const now=Date.parse(sample.fetched_at)+10000;
const fixture=n=>({id:`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,provider:'bsd',external_id:String(223728+n),
  home_team_id:'00000000-0000-4000-8000-000000000101',away_team_id:'00000000-0000-4000-8000-000000000102',
  home_external_id:'796',away_external_id:'4997',kickoff_at:new Date(Date.UTC(2026,8,n)).toISOString()});
const observation=(f,n,body)=>createLineupObservation({id:`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`,fixture:f,
  body:{...body,event_id:Number(f.external_id)},observedAt:new Date(Date.parse(sample.fetched_at)+n*1000).toISOString(),now});

test('breaks equal start counts by most recent fixture start',()=>{
  const a=fixture(1),b=fixture(2);
  const first=structuredClone(sample.body),second=structuredClone(sample.body);
  const side=second.lineups.away;
  side.players[10]=side.substitutes[0];
  side.substitutes[0]=first.lineups.away.players[10];
  const view=teamStartsView([a,b],[observation(a,1,first),observation(b,2,second)],{teamExternalId:'4997',now});
  assert.equal(view.status,'available');
  assert.equal(view.coveredCount,2);
  assert.equal(view.certain.length,10);
  assert.equal(view.places,1);
  assert.equal(view.tied.length,1);
  assert.equal(view.tied[0].id,String(side.players[10].id));
  assert.equal(view.tied[0].starts,1);
  assert.equal(view.latestLineup.fixture.id,b.id);
  assert.equal(view.latestLineup.data.away.starters.length,11);
});

test('leaves an unresolved boundary tie when the last starts have the same kickoff',()=>{
  const a=fixture(1),b={...fixture(2),kickoff_at:fixture(1).kickoff_at};
  const first=structuredClone(sample.body),second=structuredClone(sample.body);
  second.lineups.away.players[10]=second.lineups.away.substitutes[0];
  second.lineups.away.substitutes[0]=first.lineups.away.players[10];
  const view=teamStartsView([a,b],[observation(a,1,first),observation(b,2,second)],{teamExternalId:'4997',now});
  assert.equal(view.certain.length,10);
  assert.equal(view.places,1);
  assert.equal(view.tied.length,2);
});

test('uses selected history once per match, excluding unavailable and malformed starter sets',()=>{
  const a=fixture(1),b=fixture(2);
  const first=structuredClone(sample.body);
  const prediction={...first,lineup_status:'predicted'};
  const short=structuredClone(first);short.lineups.away.players.pop();
  const view=teamStartsView([a,b],[observation(a,1,first),observation(a,2,prediction),observation(b,3,short)],{teamExternalId:'4997',now});
  assert.equal(view.coveredCount,1);
  assert.equal(view.players.length,11);
  assert.deepEqual(view.players.map(p=>p.starts),Array(11).fill(1));
  assert.equal(teamStartsView([b],[observation(b,3,short)],{teamExternalId:'4997',now}).status,'empty');
});
