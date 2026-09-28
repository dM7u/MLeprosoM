import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fixture,now} from './fixtures/history-selection.mjs';
import {importLineups,parseLineupImportArgs} from '../src/server/db/import-lineups.mjs';
import {parseLineupRebuildArgs,rebuildLineupProjection,verifyLineupProjection} from '../src/server/db/rebuild-lineup-projection.mjs';
import {lineupReadMode,readConfiguredLineups} from '../src/server/db/lineup-reader.mjs';
const scope={provider:'bsd',externalTeamId:'4997',competitionId:'test',seasonId:'test'};
const sample=JSON.parse(readFileSync('docs/research/bsd-lineups-223728-20260925.json','utf8'));
const options={fixture,now,ttlMs:60000};
const empty=generation=>({projection:{fixture_id:fixture.id,version:1,generation,observation_count:0,initialized:true,chosen_id:null,last_id:null},chosen:null,last:null});
const history={select(){return this;},eq(){return this;},order(){return this;},async range(){return {data:[],count:0};}};
function lookupDb(rpc){return {rpc,from(table){
 if(table==='lineup_observations')return history;
 assert.ok(['teams','fixtures'].includes(table));
 return {select(){return this;},eq(){return this;},or(){return this;},order(){return this;},limit(){return this;},
  async maybeSingle(){return {data:{id:fixture.away_team_id,name:'Test'}};},
  async in(){return {data:[{id:fixture.home_team_id,external_id:fixture.home_external_id,name:'Home'},{id:fixture.away_team_id,external_id:fixture.away_external_id,name:'Away'}]};},
  then(resolve,reject){return Promise.resolve({data:[{...fixture,fetched_at:new Date(now).toISOString(),seasons:{external_id:'test',competitions:{external_id:'test',name:'Test'}}}]}).then(resolve,reject);},
 };
}};}
test('lineup import/rebuild parsers require explicit modes and reject unknown or repeated storage flags',()=>{
 assert.equal(parseLineupImportArgs(['sample','id','--dry-run']).storage,'history');
 assert.equal(parseLineupImportArgs(['sample','id','--apply','--storage=projection']).storage,'projection');
 for(const args of [[],['sample','id','--apply','--storage=auto'],['sample','id','--apply','--storage=projection','--storage=history']])assert.throws(()=>parseLineupImportArgs(args),/LINEUPS_USAGE/);
 assert.deepEqual(parseLineupRebuildArgs(['223728','--dry-run']),{eventId:223728,mode:'--dry-run'});
 for(const args of [[],['0','--apply'],['01','--apply'],['223728','--apply','extra']])assert.throws(()=>parseLineupRebuildArgs(args),/LINEUPS_USAGE/);
});
test('lineup import defaults to history and never falls back when projection RPC is missing',async()=>{
 const args={sample,id:fixture.id,mode:'--dry-run',scope,now};
 const result=await importLineups(lookupDb(()=>assert.fail('history default must not call RPC')),args);
 assert.equal(result.storage,'history');assert.equal(result.writes,0);assert.equal(result.result,null);
 await assert.rejects(importLineups({from(){assert.fail('invalid storage before lookup');}},{...args,storage:'auto'}),/STORAGE_MODE/);
 await assert.rejects(importLineups(lookupDb(async()=>({error:{message:'private'}})),{...args,storage:'projection'}),/^Error: LINEUPS_PROJECTION_UNAVAILABLE$/);
});
test('lineup reader mode preserves history default and fails closed without fallback',async()=>{
 assert.equal(lineupReadMode(undefined),'history');
 for(const value of ['',null,'auto'])await assert.rejects(readConfiguredLineups({},options,value),/LINEUPS_READ_MODE/);
 assert.equal((await readConfiguredLineups({from(){return history;}},options)).status,'empty');
 for(const data of [empty(1),{projection:null,chosen:null,last:null}]){
  let calls=0;const result=await readConfiguredLineups({from(){assert.fail('no fallback');},async rpc(){calls++;return {data};}},options,'projection');
  assert.equal(calls,1);assert.equal(result.status,data.projection?'empty':'error');
 }
});
test('lineup rebuild verification retries generation changes, then fails on uninterrupted churn',async()=>{
 for(const generations of [[1,2,2,2],[1,2,3,4,5,6]]){
  let calls=0;const db={from(){return history;},async rpc(){return {data:empty(generations[calls++])};}};
  if(generations.length===4)assert.equal((await verifyLineupProjection(db,options)).generation,2);
  else await assert.rejects(verifyLineupProjection(db,options),/RETRY_EXHAUSTED/);
  assert.equal(calls,generations.length);
 }
});
test('lineup rebuild reports successful commit separately from failed verification',async()=>{
 let committed=false;
 const db=lookupDb(async name=>{
  if(name==='commit_lineup_projection'){committed=true;return {data:{stored:false,replay:false,generation:1}};}
  return committed?{error:{message:'private'}}:{data:{projection:null,chosen:null,last:null}};
 });
 const result=await rebuildLineupProjection(db,{eventId:223728,scope,mode:'--apply',now});
 assert.equal(result.projection_writes,1);assert.equal(result.observation_writes,0);
 assert.deepEqual(result.verification,{verified:false,code:'LINEUPS_PROJECTION_VERIFICATION_FAILED'});
});
