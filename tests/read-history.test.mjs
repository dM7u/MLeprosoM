import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readHistory} from '../src/server/db/read-history.mjs';
import {createClient} from '@supabase/supabase-js';
const rows=Array.from({length:205},(_,i)=>({id:`10000000-0000-4000-8000-${String(i).padStart(12,'0')}`}));
const query=(read)=>()=>({order(k,o){assert.equal(k,'id');assert.equal(o.ascending,true);return this;},range:read});

test('history reads past old limits, handles server page caps and keeps exact page boundaries',async()=>{
  const seen=[];
  const result=await readHistory(query((a,b)=>{seen.push(a);return {data:rows.slice(a,Math.min(b+1,a+37)),count:rows.length};}));
  assert.deepEqual(result,rows);assert.deepEqual(seen,[0,37,74,111,148,185]);
  assert.deepEqual(await readHistory(query(()=>({data:[],count:0}))),[]);
});

test('history fails closed for concurrent inserts, missing counts, gaps, duplicate/reordered pages and errors',async()=>{
  for(const response of [()=>({data:[],count:205}),()=>({data:rows.slice(0,100),count:205}),
    ()=>({data:rows.slice(100,200).reverse(),count:205}),()=>({data:rows.slice(100,200),count:206}),
    ()=>({data:rows.slice(100,200)}),()=>({error:{message:'private'}})]){
    await assert.rejects(readHistory(query(a=>a===0?{data:rows.slice(0,100),count:205}:response())),/^Error: HISTORY_/);
  }
  await assert.rejects(readHistory(query((a,b)=>({data:rows.slice(a,b+1),count:205})),{maxPages:1}),/RESOURCE_LIMIT/);
});

test('installed Supabase client sends count, scope and ordered ranges; reader honors Content-Range',async()=>{
  const requests=[];
  const db=createClient('https://example.invalid','test-key',{global:{fetch:async(url,init)=>{
    const u=new URL(url);requests.push(u);
    assert.equal(new Headers(init.headers).get('prefer'),'count=exact');
    assert.equal(u.searchParams.get('fixture_id'),'eq.fixture');
    assert.equal(u.searchParams.get('order'),'id.asc');
    const start=Number(u.searchParams.get('offset'));
    const data=rows.slice(start,start+Number(u.searchParams.get('limit')));
    return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json','Content-Range':`${start}-${start+data.length-1}/${rows.length}`}});
  }},auth:{persistSession:false,autoRefreshToken:false}});
  assert.deepEqual(await readHistory(()=>db.from('observations').select('*',{count:'exact'}).eq('fixture_id','fixture')),rows);
  assert.equal(requests.length,3);
});
import {readFileSync} from 'node:fs';
import {createStatisticsObservation,readStatistics} from '../src/server/db/team-statistics.mjs';
import {createLineupObservation} from '../src/server/db/lineup-observations.mjs';
import {readLineups} from '../src/server/db/read-lineups.mjs';
import {createIncidentObservation,readIncidents} from '../src/server/db/incident-observations.mjs';

test('all detail readers retain original useful data through more than 100 unavailable observations',async()=>{
  const fixture={id:'00000000-0000-4000-8000-000000000001',provider:'bsd',external_id:'223728',home_team_id:'00000000-0000-4000-8000-000000000002',away_team_id:'00000000-0000-4000-8000-000000000003',home_external_id:'796',away_external_id:'4997'};
  for(const [file,create,read,empty] of [
    ['bsd-team-stats-223728-20260924.json',createStatisticsObservation,readStatistics,()=>({event_id:223728,stats:{}})],
    ['bsd-lineups-223728-20260925.json',createLineupObservation,readLineups,b=>({...b,lineup_status:'predicted'})],
    ['bsd-incidents-223728-20260925.json',createIncidentObservation,readIncidents,()=>({event_id:223728,incidents:[]})]]){
    const sample=JSON.parse(readFileSync('docs/research/'+file,'utf8'));
    const start=Date.parse(sample.fetched_at),now=start+1000;
    const history=rows.map((r,n)=>create({id:r.id,fixture,body:n?empty(sample.body):sample.body,observedAt:new Date(start+n).toISOString(),now}));
    let calls=0;
    const db={from(){return {select(columns,opts){assert.equal(opts.count,'exact');return this;},eq(){return this;},order(){return this;},async range(a,b){calls++;return {data:history.slice(a,b+1),count:history.length};}};}};
    const result=await read(db,{fixture,now,ttlMs:60000});
    assert.equal(calls,3);assert.equal(result.status,'stale');assert.equal(result.updatedAt,history[0].observed_at);
    assert.equal(result.lastObservedAt,history.at(-1).observed_at);assert.ok(result.data);
  }
});
