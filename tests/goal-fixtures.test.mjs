import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestGoal, normalizeGoalFixture, readGoalTeamFixtures} from '../src/server/providers/goal-api/fixtures.mjs';
const scope = {teamId:'team',leagueId:'cup',season:'2026'};
const now = '2026-09-18T00:00:00Z';
const row = {id:'one',leagueId:'cup',leagueYear:'2026',homeTeamId:'team',awayTeamId:'opponent',homeTeamName:'A',awayTeamName:'B',kickoffUtc:null,matchStatus:'UNKNOWN',stageName:null,matchRound:null,homeTeamScore:'0',awayTeamScore:'2',homeTeamFtScore:'0',awayTeamFtScore:'2',homeTeamExtraScore:null,awayTeamExtraScore:null,homeTeamPenaltyScore:null,awayTeamPenaltyScore:null,updatedAt:now};
const page = (data,offset=0,total=data.length,limit=50) => ({success:true,data,pagination:{offset,total,limit,hasMore:offset+data.length<total}});

test('GOAL preserves nulls, unknown status and separate penalty scores',()=>{
 const r=normalizeGoalFixture({...row,homeTeamPenaltyScore:'4',awayTeamPenaltyScore:'3'},scope,now).fixture;
 assert.equal(r.home_score,0); assert.equal(r.kickoff_at,null); assert.equal(r.source_stage,null);
 assert.equal(r.source_status,'UNKNOWN'); assert.equal(r.home_extra_score,null); assert.equal(r.home_penalty_score,4);
});
test('GOAL rejects missing/invalid scores, dates and wrong scope',()=>{
 for(const patch of [{homeTeamScore:''},{homeTeamScore:undefined},{homeTeamScore:'-1'},{homeTeamScore:'1.5'},{kickoffUtc:'2026-03-29 20:15'},{leagueYear:'2025'},{leagueId:'other'},{awayTeamId:'team'}]) assert.throws(()=>normalizeGoalFixture({...row,...patch},scope,now));
});
test('GOAL reads all pages then excludes other seasons and competitions',async()=>{
 const paths=[];
 const result=await readGoalTeamFixtures(async path=>{paths.push(path);return paths.length===1?page([row],0,2,1):page([{...row,id:'two',leagueYear:'2025'}],1,2,1);},scope,now);
 assert.equal(result.scanned,2);assert.equal(result.excluded,1);assert.equal(result.fixtures.length,1);
 assert.match(paths[1],/offset=1$/);
 const empty=await readGoalTeamFixtures(async()=>page([]),scope,now);
 assert.equal(empty.fixtures.length,0);
});
test('GOAL rejects repeated IDs, changing totals, stuck offsets and incomplete pages',async()=>{
 for(const second of [page([row],1,2,1),page([{...row,id:'two'}],1,3,1),page([{...row,id:'two'}],0,2,1)]) {
  let n=0;await assert.rejects(readGoalTeamFixtures(async()=>++n===1?page([row],0,2,1):second,scope,now));
 }
 await assert.rejects(readGoalTeamFixtures(async()=>page([row],0,3,2),scope,now),/GOAL_INCOMPLETE_PAGE/);
 await assert.rejects(readGoalTeamFixtures(async()=>page([row],0,2,1),scope,now,{maxPages:1}),/GOAL_PAGE_BUDGET_EXCEEDED/);
 await assert.rejects(readGoalTeamFixtures(async()=>page([{...row,homeTeamId:'unrelated'}]),scope,now),/GOAL_SCOPE_MISMATCH/);
});
test('GOAL request protects credentials and never retries quota or upstream errors',async()=>{
 for(const status of [401,403,429,503]) {
  let calls=0;
  await assert.rejects(requestGoal('teams/team/fixtures','secret',async(url,options)=>{
   calls++;assert.equal(url.origin,'https://api.goal-api.com');assert.equal(options.redirect,'error');
   return new Response('private raw response',{status});
  }),{message:`GOAL_HTTP_${status}`});assert.equal(calls,1);
 }
 let calls=0;
 await assert.rejects(requestGoal('https://example.org/','secret',async()=>{calls++;}),/GOAL_INVALID_URL/);assert.equal(calls,0);
 await assert.rejects(requestGoal('teams/team/fixtures','secret',async()=>{throw Error('secret');}),{message:'GOAL_CONNECTION_FAILED'});
 await assert.rejects(requestGoal('teams/team/fixtures','secret',async()=>new Response('bad')),{message:'GOAL_INVALID_JSON'});
 await assert.rejects(requestGoal('teams/team/fixtures','secret',async()=>Response.json({success:false,error:'secret'})),{message:'GOAL_RESPONSE_FAILED'});
});
