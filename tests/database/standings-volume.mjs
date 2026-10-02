// Local scale study only: no env, network, provider or remote database.
import {PGlite} from '../../.tools/db-validation/node_modules/@electric-sql/pglite/dist/index.js';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {officialReviewSample} from '../fixtures/official-review.mjs';
import {createStandingsBatch} from '../../src/server/standings/batch.mjs';
import {createOfficialReview} from '../../src/server/standings/official-review.mjs';
import {readStandingsSet} from '../../src/server/db/read-standings.mjs';
const db=new PGlite(),sample=officialReviewSample();
const now=sample.now+3600000;
const options={scope:sample.batch.payload.input.scope,policy:sample.policy,now};
const id=(prefix,n)=>prefix+'0000000-0000-4000-8000-'+String(n).padStart(12,'0');
const batch=n=>createStandingsBatch({id:id('1',n),input:sample.batch.payload.input,generatedAt:new Date(Date.parse(sample.batch.generated_at)+n*1000).toISOString()});
const review=(b,n,activate=true)=>createOfficialReview({...sample,id:id('2',n),batch:b,evidence:{...sample.evidence,batch_id:b.id,payload_hash:b.payload_hash},now:sample.now+n*10,requestActivation:activate});
let metrics,hook;
const reset=()=>{metrics={metadata_queries:0,review_queries:0,batch_queries:0,metadata_rows:0,review_rows:0,batch_rows:0,bytes_json:0};};
const tables=['standings_batches','standings_official_reviews'];
const metadata='id,provider,competition_external_id,season_external_id,data_as_of,generated_at,status';
const client={from(table){assert.ok(tables.includes(table));let columns,filters=[],params=[];return {
 select(c){assert.ok(c==='*'||c===metadata);columns=c;return this;},
 eq(k,v){assert.ok(['id','provider','competition_external_id','season_external_id','batch_id'].includes(k));params.push(v);filters.push(k+'=$'+params.length);return this;},
 in(k,values){assert.equal(k,'batch_id');assert.ok(values.length<=100);params.push(values);filters.push('batch_id=any($'+params.length+'::uuid[])');return this;},
 order(k,o){assert.equal(k,'id');assert.equal(o.ascending,true);return this;},
 async range(a,b){
  if(hook&&table==='standings_official_reviews'&&filters[0]?.startsWith('batch_id=$')){const f=hook;hook=null;await f();}
  const where=filters.length?'where '+filters.join(' and '):'';
  const result=(await db.query(`with filtered as (select ${columns} from ${table} ${where}) select (select count(*)::integer from filtered) as count,coalesce((select jsonb_agg(to_jsonb(t) order by id) from (select * from filtered order by id limit $${params.length+1} offset $${params.length+2}) t),'[]'::jsonb) as data`,[...params,b-a+1,a])).rows[0];
  const kind=table==='standings_batches'?'metadata':'review';metrics[kind+'_queries']++;metrics[kind+'_rows']+=result.data.length;metrics.bytes_json+=Buffer.byteLength(JSON.stringify(result.data));return result;
 },
 async single(){assert.equal(table,'standings_batches');assert.equal(columns,'*');assert.equal(filters.length,1);const data=(await db.query(`select to_jsonb(t) as row from ${table} t where ${filters[0]}`,params)).rows[0]?.row;metrics.batch_queries++;metrics.batch_rows+=data?1:0;metrics.bytes_json+=Buffer.byteLength(JSON.stringify(data));return {data};},
 };}};
async function insert(table,rows){if(!rows.length)return;assert.ok(tables.includes(table));const keys=Object.keys(rows[0]);await db.query(`insert into ${table}(${keys.join(',')}) select ${keys.join(',')} from jsonb_populate_recordset(null::${table},$1)`,[JSON.stringify(rows)]);}
async function measure(args=options){reset();const start=performance.now(),view=await readStandingsSet(client,args);return {view,metrics:{...metrics,elapsed_ms:Math.round((performance.now()-start)*100)/100}};}
const results=[];
try{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for(const f of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await db.exec(readFileSync('supabase/migrations/'+f,'utf8'));
 for(const axis of ['batches','reviews','denied_batches'])for(const n of axis==='reviews'?[1,100,1000,5000]:axis==='batches'?[0,1,100,1000]:[1,10,100]){
  await db.exec('reset role; truncate standings_official_reviews,standings_batches;');
  const first=batch(1);let newest=first,reviewCount=0;
  if(n){
   if(axis==='reviews'){await insert('standings_batches',[first]);for(let i=1;i<=n;i+=100)await insert('standings_official_reviews',Array.from({length:Math.min(100,n-i+1)},(_,j)=>review(first,i+j)));reviewCount=n;}
   else{
    for(let i=1;i<=n;i+=10){const rows=Array.from({length:Math.min(10,n-i+1)},(_,j)=>batch(i+j));newest=rows.at(-1);await insert('standings_batches',rows);
     if(axis==='denied_batches'){await insert('standings_official_reviews',rows.map((b,j)=>review(b,i+j,i+j===1)));reviewCount+=rows.length;}
    }
    if(axis==='batches'){await insert('standings_official_reviews',[review(first,1)]);reviewCount=1;}
   }
  }
  await db.exec('set role service_role');
  const runs=[];let reference;
  for(let repeat=0;repeat<3;repeat++){
   const result=await measure();if(reference)assert.deepEqual(result.view,reference);reference=result.view;
   assert.equal(result.view.status,n===0?'empty':axis==='reviews'||n===1?'fresh':'stale');
   assert.equal(result.view.batch_id,n?first.id:null);
   if(n){assert.equal(result.view.views.length,7);assert.equal(result.view.snapshot.rows.length,30);assert.equal(result.view.snapshot.data_as_of,first.data_as_of);assert.ok(result.view.snapshot.rows.every(row=>row.official_position===null));}
   assert.equal(result.metrics.metadata_rows,axis==='reviews'?1:n);
   assert.equal(result.metrics.batch_queries,n===0?0:axis==='denied_batches'?n:1);
   assert.equal(result.metrics.review_rows,n===0?0:axis==='reviews'?2*n:reviewCount+1);
   runs.push(result.metrics);
  }
  const probes={};
  if(n){
   const stale=await measure({...options,policy:{...sample.policy,evidenceTtlMs:1}});assert.ok(stale.view.views.every(x=>x.view.warnings.includes('stale_evidence')));probes.expiry=true;
   hook=()=>insert('standings_official_reviews',[review(first,10000,false)]);
   const changed=await measure();assert.equal(changed.view.status,'error');assert.deepEqual(changed.view.read_issues,['review_changed_during_read']);assert.equal(changed.view.snapshot,null);probes.revocation_during_recheck=true;
   const denied=await measure();assert.equal(denied.view.snapshot,null);assert.ok(denied.view.read_issues.includes('latest_review_denied'));probes.revocation_next_read=true;
  }
  const result={axis,size:n,batches:n===0?0:axis==='reviews'?1:n,reviews:reviewCount,runs,probes,last_batch_id:n?newest.id:null};results.push(result);
  console.log(JSON.stringify({axis,size:n,...runs[0]}));
 }
 const report={recorded_at:new Date().toISOString(),environment:'PGlite in memory; three local runs, real readers and SQL, no HTTP',node:process.version,remote_writes:0,provider_requests:0,results};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
 console.log('PASS: 33 scale reads, stable output, scoped pagination, original dates, seven views, TTL and concurrent/next-read revocation probes');
}finally{await db.close();}
