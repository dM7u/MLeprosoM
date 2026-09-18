import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readCombinedFixtures} from '../src/server/db/read-combined-fixtures.mjs';
import {normalizedFixtureStatus} from '../src/app/fixture-format.mjs';
const scopes=[{provider:'bsd'},{provider:'goal-api'}];
const options={ttlMs:60000,now:Date.parse('2026-09-18T12:00:00Z')};
const fresh={status:'fresh',label:'Datos actualizados',data:[{id:'a'}],updatedAt:'2026-09-18T11:59:30Z',partial:false};
test('combined read preserves one source when the other fails',async()=>{
 const result=await readCombinedFixtures(null,scopes,options,async(_,s)=>{if(s.provider==='goal-api')throw Error('private');return fresh;});
 assert.equal(result.data.length,1);assert.equal(result.status,'partial');assert.equal(result.sources[1].status,'error');assert.ok(!JSON.stringify(result).includes('private'));
});
test('combined snapshots use oldest timestamp and preserve source failures',async()=>{
 const result=await readCombinedFixtures(null,scopes,options,async(_,s)=>s.provider==='bsd'?{...fresh,status:'stale',updatedAt:'2026-09-17T00:00:00Z'}:{...fresh,data:[{id:'b'}]});
 assert.equal(result.data.length,2);assert.equal(result.status,'stale');assert.equal(result.updatedAt,'2026-09-17T00:00:00.000Z');
 const empty=await readCombinedFixtures(null,scopes,options,async()=>({status:'empty',data:null,updatedAt:null}));assert.equal(empty.status,'empty');
 const error=await readCombinedFixtures(null,scopes,options,async()=>{throw Error();});assert.equal(error.status,'error');
});
test('GOAL statuses are mapped only where verified',()=>{
 assert.equal(normalizedFixtureStatus('goal-api','FINISHED'),'finished');
 assert.equal(normalizedFixtureStatus('goal-api','SCHEDULED'),'notstarted');
 assert.equal(normalizedFixtureStatus('goal-api','FINISHED_PENALTIES'),'unknown');
 assert.equal(normalizedFixtureStatus('bsd','finished'),'finished');
});
