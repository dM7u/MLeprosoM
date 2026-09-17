import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFixtures,bsdGet} from '../src/server/providers/bsd/fixtures.mjs';
const row={id:1,season_id:2,home_team_id:3,away_team_id:4,home_team:'A',away_team:'B',event_date:null,status:'notstarted',stage:null,group_name:null,round_number:null,home_score:null,away_score:null};
const page=rows=>({results:rows,count:rows.length,next:null});
test('preserves absent scores and unknown provider status',()=>{const [r]=normalizeFixtures(page([row]),2,3,'2026-09-17T00:00:00Z');assert.equal(r.fixture.home_score,null);assert.equal(r.fixture.source_status,'notstarted');});
test('rejects partial, duplicate, out of scope and invalid results',()=>{
 for(const b of [{...page([row]),next:'next'},page([row,row]),page([{...row,season_id:9}]),page([{...row,home_score:-1}]),page([{...row,home_score:undefined}])])assert.throws(()=>normalizeFixtures(b,2,3,'now'));
});
test('does not retry rate limits or leak response/key',async()=>{let calls=0;await assert.rejects(bsdGet('events/','private',async()=>{calls++;return new Response('sensitive',{status:429});}),{message:'BSD_HTTP_429'});assert.equal(calls,1);});
test('never sends credentials to another origin',async()=>{await assert.rejects(bsdGet('https://example.com/','private',()=>{throw Error('must not fetch');}),{message:'BSD_INVALID_URL'});});
