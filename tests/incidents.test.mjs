import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeIncidents} from '../src/server/providers/bsd/incidents.mjs';
const sample=JSON.parse(readFileSync('docs/research/bsd-incidents-223728-20260925.json','utf8'));
const options={eventId:223728,fetchedAt:sample.fetched_at,now:Date.parse(sample.fetched_at)};
const normalize=incidents=>normalizeIncidents({event_id:223728,incidents},options);
test('observed incidents preserve provider order, substitutions, zeros and missing added time',()=>{
  const data=normalizeIncidents(sample.body,options);
  assert.equal(data.incidents.length,22);assert.equal(data.state,'available');
  assert.equal(data.incidents[0].period,'FT');assert.equal(data.incidents[0].home_score,0);
  assert.equal(data.incidents[1].minute,90);assert.equal(data.incidents[1].added_time,1);
  assert.equal(data.incidents[1].player_in.external_id,'90522');
  const goal=data.incidents.at(-1);assert.equal(goal.player.external_id,'22742');
  assert.equal(goal.side,'away');assert.equal(goal.added_time,null);assert.equal(goal.sequence,undefined);
});
test('unknown types and missing details remain partial, empty is not evidence of no events',()=>{
  const value=normalize([{type:'VAR',minute:10,secret_extra:'ignored'},{type:'goal'}]);
  assert.equal(value.state,'partial');assert.equal(value.incidents[0].type,'unknown');
  assert.equal(value.incidents[0].source_type,'VAR');assert.equal(value.incidents[0].secret_extra,undefined);
  assert.equal(value.incidents[1].home_score,null);assert.equal(value.incidents[1].player.name,null);
  assert.equal(normalize([]).state,'empty');assert.equal(normalize([]).coverage,'unverified');
});
test('no event ID is invented and identical or simultaneous records are retained',()=>{
  const entry={type:'substitution',minute:90,added_time:1,is_home:false,player_in:'A',player_in_id:1,player_out:'B',player_out_id:2};
  const rows=normalize([entry,entry]).incidents;
  assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.source_index),[0,1]);
  assert.equal(rows[0].id,undefined);
});
test('invalid identities, containers, numbers, booleans and timestamps fail closed',()=>{
  assert.throws(()=>normalizeIncidents(sample.body,{...options,eventId:1}),/IDENTITY/);
  assert.throws(()=>normalizeIncidents({...sample.body,incidents:null},options),/SHAPE/);
  for(const entry of [{type:'goal',minute:-1},{type:'goal',minute:'18'},{type:'goal',is_home:'false'},
    {type:'goal',player_id:0},{type:'injuryTime',length:1.5}])assert.throws(()=>normalize([entry]));
  assert.throws(()=>normalizeIncidents(sample.body,{...options,now:options.now-1}),/TIME/);
});
