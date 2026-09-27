import test from 'node:test';
import assert from 'node:assert/strict';
import {createStatisticsObservation,statisticsView} from '../src/server/db/team-statistics.mjs';
const fixture={id:'00000000-0000-4000-8000-000000000001',provider:'bsd',external_id:'223728',home_team_id:'00000000-0000-4000-8000-000000000002',away_team_id:'00000000-0000-4000-8000-000000000003'};
const now=Date.parse('2020-01-02T00:00:00Z');
const options={fixture,now,ttlMs:2*86400000};
const row=(n,seconds,home)=>createStatisticsObservation({id:'10000000-0000-4000-8000-'+String(n).padStart(12,'0'),fixture,now,observedAt:new Date(now-86400000+seconds*1000).toISOString(),body:{event_id:223728,stats:{home}}});
test('retroactive statistics require history replay: previously rejected row may become selected',()=>{
 const a=row(1,20,{total_shots:3}),b=row(2,30,{corner_kicks:4}),last=row(3,40,{}),retroactive=row(4,10,{corner_kicks:1});
 const before=statisticsView([a,b,last],options);
 assert.equal(before.updatedAt,a.observed_at);
 const full=statisticsView([a,b,last,retroactive],options);
 const compressed=statisticsView([a,last,retroactive],options);
 assert.equal(full.updatedAt,b.observed_at);
 assert.equal(full.data.home.corner_kicks,4);
 assert.equal(compressed.updatedAt,retroactive.observed_at);
 assert.notDeepEqual(compressed,full);
 assert.equal(full.lastObservedAt,last.observed_at);
 assert.equal(full.status,'stale');
});
test('strictly newer statistics can reduce from chosen and last without losing empty refresh state',()=>{
 const a=row(1,10,{total_shots:3}),b=row(2,20,{corner_kicks:4}),last=row(3,30,{});
 for(const newer of [row(4,40,{total_shots:0}),row(5,40,{corner_kicks:0}),row(6,40,{})]){
 assert.deepEqual(statisticsView([a,b,last,newer],options),statisticsView([a,last,newer],options));
 }
});
test('projection rebuild cannot silently discard corrupt older history',()=>{
 const old=row(1,10,{total_shots:3}),newer=row(2,20,{total_shots:4});
 const corrupt={...old,payload:{...old.payload,home:{...old.payload.home,total_shots:-1}}};
 assert.throws(()=>statisticsView([corrupt,newer],options));
 assert.ok(statisticsView([newer],options).data);
});
