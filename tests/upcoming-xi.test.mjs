import test from 'node:test';
import assert from 'node:assert/strict';
import {upcomingXi} from '../src/server/editorial/upcoming-xi.mjs';
import {editorialXiView} from '../src/server/editorial/revisions.mjs';
import {fixture,now,revision,evidence} from './fixtures/editorial-revision.mjs';
const match={...fixture,external_id:fixture.fixture_external_id,source_status:'notstarted',fetched_at:new Date(now-1000).toISOString()};
const scope={provider:'bsd',externalTeamId:'away',competitionId:'league',seasonId:'season'};
const options={match,scope,contextReady:true,fixtureTtlMs:900000,now};
const readers={lineups:async()=>({status:'empty',data:null}),editorial:async(_db,context)=>editorialXiView([revision(1)],context)};
test('upcoming XI preserves attribution and expires with fixture context',async()=>{
 const view=await upcomingXi(null,options,readers);
 assert.equal(view.status,'available');assert.equal(view.data.starters.length,11);
 assert.equal(view.data.sources[0].published_at,'2020-01-02T10:00:00Z');
 assert.equal(view.expiresAt,now+899000);
});
test('stale, unsupported and started fixtures perform no detail queries',async()=>{
 const never={lineups:()=>{throw Error('should not read');},editorial:()=>{throw Error('should not read');}};
 for(const override of [{contextReady:false},{match:{...match,provider:'goal-api'}},{match:{...match,source_status:'finished'}},{match:{...match,kickoff_at:new Date(now).toISOString()}},{match:{...match,fetched_at:new Date(now-900000).toISOString()}}]) {
 const v=await upcomingXi(null,{...options,...override},never);assert.equal(v.status,'unavailable');assert.equal(v.data,null);
 }
});
test('provider data including partial/stale suppress editorial fallback; errors fail closed',async()=>{
 let calls=0;
 for(const status of ['fresh','partial','stale','error']){
 const view=await upcomingXi(null,options,{lineups:async()=>({status,data:status==='error'?null:{}}),editorial:async()=>{calls++;}});
 assert.equal(view.data,null);assert.equal(view.status,status==='error'?'error':'unavailable');
 }
 assert.equal(calls,0);
});
test('reprogrammed, retracted and partial editorial heads cannot appear',async()=>{
 for(const rows of [[revision(3,{evidence:{...evidence(),starters:['Test player 0']}})], [revision(1)], [revision(2,{action:'retract',previousId:'10000000-0000-4000-8000-000000000001',reason:'withdraw'})]]){
 const view=await upcomingXi(null,{...options,match:{...match,kickoff_at:'2020-01-04T20:00:00Z'}},{...readers,editorial:async(_db,c)=>editorialXiView(rows,c)});
 assert.equal(view.data,null);
 }
});
test('expiry is bounded by publication and kickoff; storage errors return no data',async()=>{
 const base={...options,fixtureTtlMs:10*86400000};
 const view=await upcomingXi(null,base,readers);assert.equal(view.expiresAt,Date.parse(match.kickoff_at));
 const later=await upcomingXi(null,{...base,match:{...match,kickoff_at:'2020-01-06T20:00:00Z'}},{...readers,editorial:async()=>({status:'available',data:{starters:[],sources:[{published_at:'2020-01-02T10:00:00Z'}]}})});
 assert.equal(later.expiresAt,Date.parse('2020-01-04T10:00:00Z'));
 const error=await upcomingXi(null,options,{...readers,editorial:async()=>{throw Error('private');}});assert.equal(error.status,'error');assert.equal(error.data,null);
});
