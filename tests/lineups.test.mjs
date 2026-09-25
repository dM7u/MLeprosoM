import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeLineups} from '../src/server/providers/bsd/lineups.mjs';
const sample=JSON.parse(readFileSync('docs/research/bsd-lineups-223728-20260925.json','utf8'));
const options={eventId:223728,homeTeamId:796,awayTeamId:4997,fetchedAt:sample.fetched_at,now:Date.parse(sample.fetched_at)};
test('observed lineup has 11 starters and 12 substitutes each, with provenance but no AI scores',()=>{
  const body=structuredClone(sample.body);body.lineups.home.players[0].ai_score=99;
  const result=normalizeLineups(body,options);
  assert.equal(result.state,'complete');assert.equal(result.confirmation,'provider');
  for(const side of [result.home,result.away]){assert.equal(side.starters.length,11);assert.equal(side.substitutes.length,12);}
  assert.equal(result.home.starters[0].ai_score,undefined);
  assert.equal(result.source_updated_at,sample.body.updated_at);
});
test('predictions and beta payloads never expose a confirmed XI',()=>{
  for(const change of [{lineup_status:'predicted'},{beta:true}]){
    const value=normalizeLineups({...sample.body,...change},options);
    assert.equal(value.state,'unavailable');assert.equal(value.home,null);assert.equal(value.away,null);
  }
  assert.throws(()=>normalizeLineups({...sample.body,lineup_status:'unknown'},options),/UNSUPPORTED/);
});
test('missing bank and optional fields remain null, incomplete starters remain partial',()=>{
  const body=structuredClone(sample.body);delete body.lineups.away.substitutes;
  delete body.lineups.home.players[0].jersey_number;body.lineups.home.players.pop();
  const value=normalizeLineups(body,options);
  assert.equal(value.state,'partial');assert.equal(value.away.substitutes,null);
  assert.equal(value.home.starters[0].jersey_number,null);assert.equal(value.home.starters.length,10);
});
test('wrong event, swapped teams, duplicate players and invalid times fail closed',()=>{
  assert.throws(()=>normalizeLineups(sample.body,{...options,eventId:1}),/IDENTITY/);
  assert.throws(()=>normalizeLineups(sample.body,{...options,homeTeamId:4997,awayTeamId:796}),/IDENTITY/);
  const body=structuredClone(sample.body);body.lineups.away.substitutes[0]=body.lineups.home.players[0];
  assert.throws(()=>normalizeLineups(body,options),/INVALID_PLAYER/);
  assert.throws(()=>normalizeLineups(sample.body,{...options,now:options.now-1}),/INVALID_TIME/);
  assert.throws(()=>normalizeLineups({...sample.body,updated_at:'2099-01-01T00:00:00Z'},options),/INVALID_TIME/);
});
