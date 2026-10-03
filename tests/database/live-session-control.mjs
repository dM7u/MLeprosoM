import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const db=new PGlite();
const q=async(sql,params=[]) => (await db.query(sql,params)).rows;
const uuid=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const call=async(name,params)=> (await q(`select public.${name}(${params.map((_,i)=>'$'+(i+1)).join(',')}) as value`,params))[0].value;
const session=uuid(1),request=uuid(2),lateRequest=uuid(3);

try{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 await db.exec(readFileSync('supabase/migrations/20260917000100_initial_football.sql','utf8'));
 await db.exec(readFileSync('supabase/pending/live_session_control.sql','utf8'));
 await db.exec("insert into teams(provider,external_id,name,fetched_at) values('bsd','4997','Newells',now()),('bsd','785','Lanus',now()); insert into competitions(provider,external_id,name,fetched_at) values('bsd','85','Liga',now()); insert into seasons(provider,external_id,competition_id,name,fetched_at) select 'bsd','1635',id,'2026',now() from competitions;");
 await q("insert into fixtures(id,provider,external_id,season_id,home_team_id,away_team_id,kickoff_at,source_status,fetched_at) select $1,'bsd','223765',s.id,h.id,a.id,now()+interval '1 hour','notstarted',now() from seasons s,teams h,teams a where h.external_id='4997' and a.external_id='785'",[session]);
 await q("insert into live_sessions(fixture_id,enabled,next_due_at,hard_stop_at) values($1,true,now()-interval '1 second',now()+interval '4 hours')",[session]);
 for(const role of ['anon','authenticated']){
  await db.exec(`set role ${role}`);
  await assert.rejects(call('claim_live_session',[session]),/permission denied/);
  await assert.rejects(q('select * from live_snapshots'),/permission denied/);
  await db.exec('reset role');
 }
 await db.exec('set role service_role');
 await assert.rejects(q("update live_sessions set enabled=false where fixture_id=$1",[session]),/permission denied/);
 const a=await call('claim_live_session',[session]);
 assert.equal(a.fence,1);
 assert.equal(await call('claim_live_session',[session]),null,'overlapping cycle must not claim');
 const reservation=await call('reserve_live_request',[session,a.owner,a.fence,request,'fixture']);
 assert.equal(reservation.session_used,1);
 assert.equal(reservation.day_used,1);
 await assert.rejects(call('reserve_live_request',[session,a.owner,a.fence,request,'fixture']),/duplicate key/);
 assert.equal((await q('select request_count from live_sessions'))[0].request_count,1,'duplicate reservation must roll back budget');
 const observed=new Date().toISOString();
 const body=JSON.stringify({version:1,provider:'bsd',event_id:'223765',status:'notstarted'});
 assert.equal((await call('commit_live_snapshot',[request,a.owner,a.fence,'complete',body,observed,null,null])).stored,true);
 assert.equal((await call('commit_live_snapshot',[request,a.owner,a.fence,'complete',body,observed,null,null])).replay,true);
 await assert.rejects(call('commit_live_snapshot',[request,a.owner,a.fence,'complete',JSON.stringify({version:1,provider:'bsd',event_id:'223765',status:'finished'}),observed,null,null]),/LIVE_REQUEST_CONFLICT/);
 const first=(await q("select last_good_payload,last_complete_payload from live_snapshots where fixture_id=$1 and resource='fixture'",[session]))[0];
 assert.equal(first.last_good_payload.event_id,'223765');
 const secondRequest=uuid(4);
 await call('reserve_live_request',[session,a.owner,a.fence,secondRequest,'fixture']);
 await call('commit_live_snapshot',[secondRequest,a.owner,a.fence,'failed',null,new Date(Date.now()+1000).toISOString(),null,'BSD_TIMEOUT']);
 const failed=(await q("select last_quality,last_good_payload from live_snapshots where fixture_id=$1 and resource='fixture'",[session]))[0];
 assert.equal(failed.last_quality,'failed');
 assert.equal(failed.last_good_payload.event_id,'223765','failure must preserve last good data');
 await call('reserve_live_request',[session,a.owner,a.fence,lateRequest,'lineups']);
 await db.exec('reset role');
 await q("update live_sessions set lease_until=now()-interval '1 second' where fixture_id=$1",[session]);
 await db.exec('set role service_role');
 await assert.rejects(call('commit_live_snapshot',[lateRequest,a.owner,a.fence,'partial',JSON.stringify({version:2,provider:'bsd',event_id:'223765'}),new Date().toISOString(),null,null]),/LIVE_LEASE_LOST/);
 const b=await call('claim_live_session',[session]);
 assert.equal(b.fence,2);
 assert.notEqual(b.owner,a.owner);
 await assert.rejects(call('finish_live_cycle',[session,a.owner,a.fence,'finished',null,true]),/LIVE_LEASE_LOST/);
 assert.equal(await call('finish_live_cycle',[session,b.owner,b.fence,'finished',null,true]),true);
 assert.equal(await call('claim_live_session',[session]),null,'finished disabled session cannot restart');
 await db.exec('reset role');
 await q("update live_sessions set enabled=true,request_count=499,next_due_at=now()-interval '1 second' where fixture_id=$1",[session]);
 await db.exec('update live_daily_budget set request_count=999');
 await db.exec('set role service_role');
 const cap=await call('claim_live_session',[session]);
 assert.equal((await call('reserve_live_request',[session,cap.owner,cap.fence,uuid(5),'fixture'])).day_used,1000);
 await assert.rejects(call('reserve_live_request',[session,cap.owner,cap.fence,uuid(6),'fixture']),/LIVE_BUDGET_EXHAUSTED/);
 await db.exec('reset role');
 assert.equal((await q('select request_count from live_sessions'))[0].request_count,500);
 assert.equal((await q('select request_count from live_daily_budget'))[0].request_count,1000);
 console.log('PASS: live SQL ACL, claim, budget, failure retention, expired lease and fencing');
}finally{await db.close();}
