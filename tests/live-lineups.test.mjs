import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLiveLineups} from '../src/server/live/lineups.mjs';

const stamp='2026-10-03T20:05:00Z';
const options={eventId:223765,homeTeamId:4997,awayTeamId:785,
  observedAt:stamp,now:Date.parse(stamp)};
const player=(id,name)=>({id,name,position:'M',jersey_number:9,captain:false});
const side=(id,base)=>({team_id:id,formation:'4-2-3-1',
  players:Array.from({length:11},(_,i)=>player(base+i,`Jugador ${i+1}`)),
  substitutes:[player(base+20,'Suplente')]});
const fixture={event_id:223765,lineup_status:'confirmed',beta:false,updated_at:stamp,
  lineups:{home:side(4997,1),away:side(785,101)}};
const read=body=>normalizeLiveLineups(body,options);

test('confirmed complete teamsheet retains provider IDs',()=>{
 const result=read(fixture);
 assert.equal(result.version,2);
 assert.equal(result.state,'complete');
 assert.equal(result.home.starters.length,11);
 assert.deepEqual(result.issues,[]);
});

test('missing substitute ID stays visible and never becomes a stable identity',()=>{
 const body=structuredClone(fixture);
 body.lineups.away.substitutes[0].id=null;
 const result=read(body);
 assert.equal(result.state,'partial');
 assert.equal(result.away.substitutes[0].external_id,null);
 assert.equal(result.away.substitutes[0].source_index,0);
 assert.equal(result.away.substitutes[0].name,'Suplente');
 assert.deepEqual(result.issues,[{type:'missing_external_id',side:'away',group:'substitutes',source_index:0}]);
});

test('provider prediction and legitimate unavailability cannot become confirmed',()=>{
 assert.equal(read({...fixture,lineup_status:'predicted',beta:true}).reason,'prediction_excluded');
 assert.equal(read({...fixture,lineup_status:'unavailable',lineups:null}).reason,'source_unavailable');
});

test('invalid existing ID, duplicate ID and wrong team are rejected',()=>{
 const absent=structuredClone(fixture);delete absent.lineups.home.players[0].id;
 assert.throws(()=>read(absent),/LIVE_LINEUPS_PLAYER/);
 const dup=structuredClone(fixture);dup.lineups.away.players[0].id=dup.lineups.home.players[0].id;
 assert.throws(()=>read(dup),/LIVE_LINEUPS_PLAYER/);
 const wrong=structuredClone(fixture);wrong.lineups.away.team_id=4997;
 assert.throws(()=>read(wrong),/LIVE_LINEUPS_SHAPE/);
});
