import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyBsdPhase,normalizeLiveFixture,planNextLiveCycle} from '../src/server/live/fixture-policy.mjs';

const now=Date.parse('2026-10-03T20:02:00Z');
const base={id:223765,home_team_id:4997,away_team_id:785,
  event_date:'2026-10-03T20:00:00+00:00',status:'notstarted',period:'',
  current_minute:null,home_score:null,away_score:null};
const read=(body,at=now)=>normalizeLiveFixture(body,{eventId:223765,homeTeamId:4997,
  awayTeamId:785,observedAt:new Date(at).toISOString(),now:at});

test('verified NS preserves unknown scores and stops if kickoff was missed',()=>{
 const snapshot=read(base);
 assert.equal(snapshot.phase,'scheduled');
 assert.equal(snapshot.home_score,null);
 assert.deepEqual(planNextLiveCycle({snapshot,now}).resources,[]);
 assert.equal(planNextLiveCycle({snapshot,now:now+1800000}).phase,'stopped');
});

test('observed first-half pair enables resources without inventing missing score',()=>{
 const snapshot=read({...base,status:'1st_half',period:'1T',current_minute:2,
   home_score:0,away_score:null});
 assert.equal(snapshot.phase,'first_half');
 assert.equal(snapshot.home_score,0);
 assert.equal(snapshot.away_score,null);
 const plan=planNextLiveCycle({snapshot,now});
 assert.deepEqual(plan.resources,['lineups','incidents','statistics']);
 assert.equal(plan.nextDueAt,'2026-10-03T20:04:30.000Z');
});

test('unobserved status is unknown and never promoted by minute or clock',()=>{
 const snapshot=read({...base,status:'2nd_half',period:'2T',current_minute:86,
   home_score:2,away_score:1});
 assert.equal(classifyBsdPhase('2nd_half','2T'),'unknown');
 assert.equal(snapshot.phase,'unknown');
 assert.deepEqual(planNextLiveCycle({snapshot,now,unknownCount:2}).resources,[]);
 assert.equal(planNextLiveCycle({snapshot,now,unknownCount:3}).phase,'stopped');
});

test('rejects wrong fixture identity, invalid score and future observation',()=>{
 assert.throws(()=>read({...base,id:223766}),/LIVE_FIXTURE_IDENTITY/);
 assert.throws(()=>read({...base,home_score:-1}),/LIVE_FIXTURE_SHAPE/);
 assert.throws(()=>normalizeLiveFixture(base,{eventId:223765,homeTeamId:4997,awayTeamId:785,
   observedAt:'2026-10-03T20:03:00Z',now}),/LIVE_FIXTURE_SHAPE/);
});
