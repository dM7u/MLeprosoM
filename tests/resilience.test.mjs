import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestBsd,retryAfterMs} from '../src/server/providers/bsd/request.mjs';
import {dataState} from '../src/server/data-state.mjs';

test('transient failure recovers once and counts actual attempts',async()=>{
 let calls=0,attempts=0;const delays=[];
 const result=await requestBsd('events/','secret',async()=>++calls===1?new Response(null,{status:503}):Response.json({ok:true}),{sleep:async ms=>delays.push(ms),onAttempt:()=>attempts++});
 assert.deepEqual(result,{ok:true});assert.equal(attempts,2);assert.deepEqual(delays,[1000]);
});
test('network outage stops after two attempts without leaking errors',async()=>{
 let attempts=0;
 await assert.rejects(requestBsd('events/','secret',async()=>{throw Error('secret body');},{sleep:async()=>{},onAttempt:()=>attempts++}),{message:'BSD_CONNECTION_FAILED'});
 assert.equal(attempts,2);
});
test('auth, quota, malformed body and long Retry-After do not retry',async()=>{
 for(const status of [401,403,429,503,200]){
 let attempts=0;
 await assert.rejects(requestBsd('events/','secret',async()=>new Response('invalid json',{status,headers:{'retry-after':'60'}}),{sleep:async()=>assert.fail('must not sleep'),onAttempt:()=>attempts++}));
 assert.equal(attempts,1);
 }
 assert.equal(retryAfterMs('60'),60000);assert.equal(retryAfterMs('bad'),null);
 assert.equal(retryAfterMs('Thu, 17 Sep 2026 00:01:00 GMT',Date.parse('2026-09-17T00:00:00Z')),60000);
});
test('freshness preserves last data on outage and never invents a score',()=>{
 const now=Date.parse('2026-09-17T00:01:00Z');const data=[{home_score:null}];
 const base={data,fetchedAt:'2026-09-17T00:00:00Z',ttlMs:120000,now};
 assert.equal(dataState(base).status,'fresh');
 const stale=dataState({...base,refreshFailed:true});assert.equal(stale.status,'stale');assert.equal(stale.data,data);assert.equal(stale.data[0].home_score,null);
 assert.equal(dataState({...base,ttlMs:60000}).status,'stale');
 assert.equal(dataState({...base,fetchedAt:'bad'}).status,'stale');
 assert.equal(dataState({...base,fetchedAt:'2027-01-01'}).status,'stale');
 assert.equal(dataState({...base,partial:true}).status,'partial');
 assert.equal(dataState({...base,data:[]}).status,'empty');
 assert.equal(dataState({...base,data:null,refreshFailed:true}).status,'error');
});
