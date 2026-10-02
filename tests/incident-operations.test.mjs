import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture,now} from './fixtures/history-selection.mjs';
import {importIncidents,parseIncidentImportArgs} from '../src/server/db/import-incidents.mjs';
import {parseIncidentRebuildArgs,rebuildIncidentProjection,verifyIncidentProjection} from '../src/server/db/rebuild-incident-projection.mjs';
import {incidentReadMode,readConfiguredIncidents} from '../src/server/db/incident-reader.mjs';
const scope={provider:'bsd',externalTeamId:'4997',competitionId:'test',seasonId:'test'};
const sample=JSON.parse(readFileSync('docs/research/bsd-incidents-223728-20260925.json','utf8'));
const options={fixture,now,ttlMs:60000};
const empty=generation=>({projection:{fixture_id:fixture.id,version:1,generation,observation_count:0,initialized:true,chosen_id:null,last_id:null},chosen:null,last:null});
const history={select(){return this;},eq(){return this;},order(){return this;},async range(){return {data:[],count:0};}};
function lookupDb(rpc,transform=rows=>rows){return {rpc,from(table){
 if(table==='incident_observations')return history;
 assert.ok(['teams','fixtures'].includes(table));
 return {select(){return this;},eq(){return this;},or(){return this;},order(){return this;},limit(){return this;},
  async maybeSingle(){return {data:{id:fixture.away_team_id,name:'Test'}};},
  async in(){return {data:[{id:fixture.home_team_id,external_id:fixture.home_external_id,name:'Home'},{id:fixture.away_team_id,external_id:fixture.away_external_id,name:'Away'}]};},
  then(resolve,reject){return Promise.resolve({data:transform([{...fixture,fetched_at:new Date(now).toISOString(),seasons:{external_id:'test',competitions:{external_id:'test',name:'Test'}}}])}).then(resolve,reject);},
 };
}};}
test('incident import/rebuild parsers require explicit modes and reject unknown or repeated storage flags',()=>{
 assert.equal(parseIncidentImportArgs(['sample','id','--dry-run']).storage,'history');
 assert.equal(parseIncidentImportArgs(['sample','id','--apply','--storage=projection']).storage,'projection');
 for(const args of [[],['sample','id','--apply','--storage=auto'],['sample','id','--apply','--storage=projection','--storage=history']])assert.throws(()=>parseIncidentImportArgs(args),/INCIDENTS_USAGE/);
 assert.deepEqual(parseIncidentRebuildArgs(['223728','--dry-run']),{eventId:223728,mode:'--dry-run'});
 for(const args of [[],['0','--apply'],['01','--apply'],['223728','--apply','extra']])assert.throws(()=>parseIncidentRebuildArgs(args),/INCIDENTS_USAGE/);
});
test('incident import defaults to history and never falls back when projection RPC is missing',async()=>{
 const args={sample,id:fixture.id,mode:'--dry-run',scope,now};
 const result=await importIncidents(lookupDb(()=>assert.fail('history default must not call RPC')),args);
 assert.equal(result.storage,'history');assert.equal(result.writes,0);assert.equal(result.result,null);
 await assert.rejects(importIncidents({from(){assert.fail('invalid storage before lookup');}},{...args,storage:'auto'}),/STORAGE_MODE/);
 await assert.rejects(importIncidents(lookupDb(async()=>({error:{message:'private'}})),{...args,storage:'projection'}),/^Error: INCIDENTS_PROJECTION_UNAVAILABLE$/);
});
test('incident reader mode preserves history default and fails closed without fallback',async()=>{
 assert.equal(incidentReadMode(undefined),'history');
 for(const value of ['',null,'auto'])await assert.rejects(readConfiguredIncidents({},options,value),/INCIDENTS_READ_MODE/);
 assert.equal((await readConfiguredIncidents({from(){return history;}},options)).status,'empty');
 for(const data of [empty(1),{projection:null,chosen:null,last:null}]){
  let calls=0;const result=await readConfiguredIncidents({from(){assert.fail('no fallback');},async rpc(){calls++;return {data};}},options,'projection');
  assert.equal(calls,1);assert.equal(result.status,data.projection?'empty':'error');
 }
});
test('incident rebuild verification retries generation changes, then fails on uninterrupted churn',async()=>{
 for(const generations of [[1,2,2,2],[1,2,3,4,5,6]]){
  let calls=0;const db={from(){return history;},async rpc(){return {data:empty(generations[calls++])};}};
  if(generations.length===4)assert.equal((await verifyIncidentProjection(db,options)).generation,2);
  else await assert.rejects(verifyIncidentProjection(db,options),/RETRY_EXHAUSTED/);
  assert.equal(calls,generations.length);
 }
});
test('incident rebuild reports successful commit separately from failed verification',async()=>{
 let committed=false;
 const db=lookupDb(async name=>{
  if(name==='commit_incident_projection'){committed=true;return {data:{stored:false,replay:false,generation:1}};}
  return committed?{error:{message:'private'}}:{data:{projection:null,chosen:null,last:null}};
 });
 const result=await rebuildIncidentProjection(db,{eventId:223728,scope,mode:'--apply',now});
 assert.equal(result.projection_writes,1);assert.equal(result.observation_writes,0);
 assert.deepEqual(result.verification,{verified:false,code:'INCIDENTS_PROJECTION_VERIFICATION_FAILED'});
});

test('incident import and rebuild reject incomplete, ambiguous and foreign fixture scope before RPC',async()=>{
 for(const transform of [rows=>Array.from({length:101},()=>rows[0]),rows=>[...rows,...rows],rows=>rows.map(row=>({...row,seasons:{...row.seasons,external_id:'foreign'}}))]){
  const db=lookupDb(()=>assert.fail('invalid lookup must not reach RPC'),transform);
  await assert.rejects(importIncidents(db,{sample,id:fixture.id,mode:'--apply',storage:'projection',scope,now}),/INCIDENTS_(LOOKUP_FAILED|OUT_OF_SCOPE)/);
  await assert.rejects(rebuildIncidentProjection(db,{eventId:223728,mode:'--apply',scope,now}),/INCIDENTS_(LOOKUP_FAILED|OUT_OF_SCOPE)/);
 }
});
