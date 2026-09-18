import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readTeamFixtures} from '../src/server/db/read-fixtures.mjs';
const a='00000000-0000-0000-0000-000000000001',b='00000000-0000-0000-0000-000000000002';
const now=Date.parse('2026-09-17T12:00:00Z');
const options={provider:'test',externalTeamId:'1',ttlMs:60000,now};
const row={id:'match',home_team_id:a,away_team_id:b,home_score:null,away_score:null,fetched_at:'2026-09-17T11:59:30Z'};
function mock(responses){return {from(){const result=responses.shift();const chain=new Proxy({}, {get(_,key){return key==='then'?(resolve,reject)=>Promise.resolve(result).then(resolve,reject):()=>chain;}});return chain;}};}
test('empty storage never becomes a fictional match',async()=>{
 const state=await readTeamFixtures(mock([{data:null,error:null}]),options);assert.equal(state.status,'empty');assert.equal(state.data,null);
});
test('storage failure is sanitized',async()=>{
 const state=await readTeamFixtures(mock([{error:{message:'secret'}}]),options);assert.equal(state.status,'error');assert.ok(!JSON.stringify(state).includes('secret'));
});
test('oldest snapshot sets staleness; null scores remain unavailable',async()=>{
 const state=await readTeamFixtures(mock([{data:{id:a,name:'A'}},{data:[row,{...row,id:'older',fetched_at:'2026-09-16T00:00:00Z'}]},{data:[{id:a,name:'A'},{id:b,name:'B'}]}]),options);
 assert.equal(state.status,'stale');assert.equal(state.data[0].home_score,null);assert.equal(state.data[0].away_team,'B');
});
test('missing opponent names preserve data as partial',async()=>{
 const state=await readTeamFixtures(mock([{data:{id:a,name:'A'}},{data:[row]},{error:{message:'failed'}}]),options);
 assert.equal(state.status,'partial');assert.equal(state.data[0].away_team,null);
});
