import test from 'node:test';
import assert from 'node:assert/strict';
import {projectLiveHome} from '../src/server/live/home-projection.mjs';

const now=Date.parse('2026-10-03T21:00:00Z');
const fixture={id:'f1',provider:'bsd',external_id:'223765',source_status:'notstarted',home_score:null,away_score:null};
const session={fixture_id:'f1',enabled:true,phase:'first_half'};
const payload={version:1,provider:'bsd',event_id:'223765',phase:'first_half',source_status:'1st_half',home_score:1,away_score:0};
const snapshot={fixture_id:'f1',resource:'fixture',last_quality:'complete',last_good_at:'2026-10-03T20:59:00Z',last_good_payload:payload};

test('fresh snapshot selects live panels without mutating catalogue',()=>{
  const result=projectLiveHome([fixture],[session],[snapshot],now);
  assert.equal(result.live?.payload.home_score,1);
  assert.equal(result.fixtures[0],fixture);
});

test('finished snapshot removes match from upcoming even after session stops',()=>{
  const final={...payload,phase:'finished',source_status:'finished',home_score:2,away_score:1};
  const result=projectLiveHome([fixture],[{...session,enabled:false,phase:'finished'}],
    [{...snapshot,last_good_payload:final}],now);
  assert.equal(result.live,null);
  assert.equal(result.fixtures[0].source_status,'finished');
  assert.equal(result.fixtures[0].home_score,2);
  assert.equal(fixture.source_status,'notstarted');
  const afterFailure=projectLiveHome([fixture],[{...session,enabled:false,phase:'stopped'}],
    [{...snapshot,last_quality:'failed',last_good_payload:final}],now);
  assert.equal(afterFailure.fixtures[0].source_status,'finished');
});

test('mismatched identity and failed latest attempt cannot activate live',()=>{
  assert.equal(projectLiveHome([fixture],[session],[{...snapshot,last_good_payload:{...payload,event_id:'other'}}],now).live,null);
  assert.equal(projectLiveHome([fixture],[session],[{...snapshot,last_quality:'failed'}],now).live,null);
});
