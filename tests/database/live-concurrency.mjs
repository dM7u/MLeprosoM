import assert from 'node:assert/strict';
import {readFileSync,realpathSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import pg from '../../.tools/db-validation/node_modules/pg/lib/index.js';

const configPath=realpathSync(process.argv[2]);
const root=realpathSync('.tools/db-validation')+sep;
assert.ok(configPath.startsWith(root));
const cfg=JSON.parse(readFileSync(configPath,'utf8'));
assert.equal(cfg.host,'127.0.0.1');
assert.equal(cfg.user,'mle_local_test');
assert.equal(cfg.database,'postgres');
assert.ok(resolve(cfg.cluster).startsWith(root));
const clients=[];
async function connect(){
 const client=new pg.Client({host:cfg.host,port:cfg.port,user:cfg.user,password:cfg.password,database:cfg.database,ssl:false,connectionTimeoutMillis:5000,options:'-c statement_timeout=10000 -c lock_timeout=8000'});
 clients.push(client);await client.connect();return client;
}
const uuid=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const fixture=uuid(1);
const rpc=async(client,name,values)=>(await client.query(`select public.${name}(${values.map((_,i)=>'$'+(i+1)).join(',')}) as value`,values)).rows[0].value;
const capture=p=>p.then(value=>({value}),error=>({error}));

try{
 const admin=await connect(),a=await connect(),b=await connect();
 const dir=(await admin.query("select current_setting('data_directory') as dir")).rows[0].dir;
 assert.equal(realpathSync(dir),realpathSync(cfg.cluster));
 assert.equal((await admin.query("select count(*)::int n from pg_tables where schemaname='public'")).rows[0].n,0);
 await admin.query('create role anon; create role authenticated; create role service_role bypassrls; create role migration_admin createrole nosuperuser; grant usage,create on schema public to migration_admin with grant option; set role migration_admin;');
 await admin.query(readFileSync('supabase/migrations/20260917000100_initial_football.sql','utf8'));
 await admin.query(readFileSync('supabase/pending/live_session_control.sql','utf8'));
 await admin.query("insert into teams(provider,external_id,name,fetched_at) values('bsd','4997','Newells',now()),('bsd','785','Lanus',now()); insert into competitions(provider,external_id,name,fetched_at) values('bsd','85','Liga',now()); insert into seasons(provider,external_id,competition_id,name,fetched_at) select 'bsd','1635',id,'2026',now() from competitions;");
 await admin.query("insert into fixtures(id,provider,external_id,season_id,home_team_id,away_team_id,kickoff_at,source_status,fetched_at) select $1,'bsd','223765',s.id,h.id,v.id,now()+interval '1 hour','notstarted',now() from seasons s,teams h,teams v where h.external_id='4997' and v.external_id='785'",[fixture]);
 await admin.query("insert into live_sessions(fixture_id,enabled,next_due_at,hard_stop_at) values($1,true,now()-interval '1 second',now()+interval '4 hours')",[fixture]);
 await a.query('set role service_role');await b.query('set role service_role');
 const claims=await Promise.all([capture(rpc(a,'claim_live_session',[fixture])),capture(rpc(b,'claim_live_session',[fixture]))]);
 assert.ok(claims.every(x=>!x.error));
 assert.equal(claims.filter(x=>x.value!==null).length,1,'one and only one owner');
 const owner=claims.find(x=>x.value)?.value;
 assert.equal(owner.fence,1);
 const r1=uuid(2),r2=uuid(3);
 const reserves=await Promise.all([
  capture(rpc(a,'reserve_live_request',[fixture,owner.owner,owner.fence,r1,'fixture'])),
  capture(rpc(b,'reserve_live_request',[fixture,owner.owner,owner.fence,r2,'lineups']))
 ]);
 assert.ok(reserves.every(x=>!x.error),'parallel reservation must serialize safely');
 assert.deepEqual(reserves.map(x=>x.value.session_used).sort((x,y)=>x-y),[1,2]);
 assert.equal((await admin.query('select request_count from live_daily_budget')).rows[0].request_count,2);
 await admin.query("update live_sessions set lease_until=now()-interval '1 second' where fixture_id=$1",[fixture]);
 const replacement=await rpc(b,'claim_live_session',[fixture]);
 assert.equal(replacement.fence,2);
 const late=await capture(rpc(a,'commit_live_snapshot',[r1,owner.owner,owner.fence,'complete',JSON.stringify({version:1,provider:'bsd',event_id:'223765'}),new Date().toISOString(),null,null]));
 assert.match(late.error?.message??'',/LIVE_LEASE_LOST/);
 assert.equal((await admin.query('select count(*)::int n from live_snapshots')).rows[0].n,0);
 await rpc(b,'reserve_live_request',[fixture,replacement.owner,replacement.fence,uuid(4),'fixture']);
 const good=await rpc(b,'commit_live_snapshot',[uuid(4),replacement.owner,replacement.fence,'complete',JSON.stringify({version:1,provider:'bsd',event_id:'223765'}),new Date().toISOString(),null,null]);
 assert.equal(good.stored,true);
 assert.equal((await admin.query('select request_count from live_daily_budget')).rows[0].request_count,3);
 console.log('PASS: native PostgreSQL parallel claim/reservation, fenced stale commit and budget');
}finally{await Promise.allSettled(clients.map(c=>c.end()));}
