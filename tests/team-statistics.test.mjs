import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeTeamStatistics,teamStatisticFields} from '../src/server/providers/bsd/team-statistics.mjs';
const sample=JSON.parse(readFileSync(new URL('../docs/research/bsd-team-stats-223728-20260924.json',import.meta.url)));
const options={eventId:223728,fetchedAt:sample.fetched_at,now:Date.parse(sample.fetched_at)};
test('observed full-match stats preserve real zeros and exclude ratings, xG and other periods',()=>{
  const body=structuredClone(sample.body);body.stats.home.average_rating=8;body.stats.first_half={home:{total_shots:999}};
  const value=normalizeTeamStatistics(body,options);
  assert.equal(value.state,'complete');assert.equal(value.away.red_cards,0);
  assert.equal(value.home.total_shots,5);assert.equal(value.home.ball_possession,57);
  assert.deepEqual(Object.keys(value.home),teamStatisticFields);assert.equal(value.home.average_rating,undefined);
});
test('missing fields and sides remain null; empty upcoming stats do not become zero totals',()=>{
  const upcoming=JSON.parse(readFileSync(new URL('../docs/research/bsd-team-stats-223765-20260924.json',import.meta.url)));
  assert.equal(normalizeTeamStatistics(upcoming.body,{...options,eventId:223765,fetchedAt:upcoming.fetched_at,now:Date.parse(upcoming.fetched_at)}).state,'empty');
  const value=normalizeTeamStatistics({event_id:223728,stats:{home:{red_cards:0}}},options);
  assert.equal(value.state,'partial');assert.equal(value.home.red_cards,0);assert.equal(value.away.red_cards,null);
});
test('wrong event, malformed containers, invalid numbers and future timestamps fail closed',()=>{
  for(const value of [-1,'5',Infinity,1.5])assert.throws(()=>normalizeTeamStatistics({event_id:223728,stats:{home:{total_shots:value}}},options),/INVALID_VALUE/);
  assert.throws(()=>normalizeTeamStatistics({event_id:223728,stats:{home:{ball_possession:101}}},options),/INVALID_VALUE/);
  assert.throws(()=>normalizeTeamStatistics({...sample.body,event_id:1},options),/IDENTITY/);
  assert.throws(()=>normalizeTeamStatistics({event_id:223728,stats:[]},options),/INVALID_SHAPE/);
  assert.throws(()=>normalizeTeamStatistics(sample.body,{...options,now:options.now-1}),/INVALID_TIME/);
});
