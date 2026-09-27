import test from 'node:test';
import assert from 'node:assert/strict';
import {statisticsReadMode,readConfiguredStatistics} from '../src/server/db/statistics-reader.mjs';
import {verifyStatisticsProjection,parseStatisticsRebuildArgs,rebuildStatisticsProjection} from '../src/server/db/rebuild-statistics-projection.mjs';
import {fixture,now} from './fixtures/history-selection.mjs';
const options={fixture,now,ttlMs:60000};
const empty=generation=>({projection:{fixture_id:fixture.id,version:1,generation,observation_count:0,initialized:true,chosen_id:null,last_id:null},chosen:null,last:null});
const history={select(){return this;},eq(){return this;},order(){return this;},async range(){return {data:[],count:0};}};
test('statistics read mode defaults to history and rejects invalid explicit values',async()=>{
 assert.equal(statisticsReadMode(undefined),'history');
 for(const value of ['',null,'auto','Projection'])await assert.rejects(readConfiguredStatistics({from(){assert.fail('no fallback');},rpc(){assert.fail('no RPC');}},options,value),/STATS_READ_MODE/);
 const result=await readConfiguredStatistics({from(){return history;},rpc(){assert.fail('history only');}},options,undefined);
 assert.equal(result.status,'empty');
});
test('projection reader uses one RPC and fails closed without historical fallback',async()=>{
 let reads=0;
 for(const data of [empty(1),{projection:null,chosen:null,last:null},{}]){
 const result=await readConfiguredStatistics({from(){assert.fail('must not read history');},async rpc(){reads++;return {data};}},options,'projection');
 assert.equal(result.status,data.projection?.initialized?'empty':'error');
 }
 assert.equal(reads,3);
});
test('rebuild verification retries generation changes and rejects uninterrupted churn',async()=>{
 for(const generations of [[1,2,2,2],[1,2,3,4,5,6]]){
 let calls=0;const db={from(){return history;},async rpc(){return {data:empty(generations[calls++])};}};
 if(generations.length===4){const result=await verifyStatisticsProjection(db,options);assert.equal(result.verified,true);assert.equal(result.generation,2);assert.equal(calls,4);}
 else {await assert.rejects(verifyStatisticsProjection(db,options),/RETRY_EXHAUSTED/);assert.equal(calls,6);}
 }
});
test('rebuild CLI requires one canonical positive event ID and explicit execution mode',()=>{
 assert.deepEqual(parseStatisticsRebuildArgs(['223728','--dry-run']),{eventId:223728,mode:'--dry-run'});
 for(const args of [[],['0','--apply'],['01','--apply'],['1e3','--apply'],['223728'],['223728','--apply','extra']])assert.throws(()=>parseStatisticsRebuildArgs(args),/STATS_USAGE/);
});
test('rebuild reports committed projection separately from failed post-commit verification',async()=>{
 let committed=false;
 const db={from(table){if(table==='team_statistics_observations')return history;return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:table==='teams'?{id:fixture.away_team_id}:{...fixture,seasons:{external_id:'test',competitions:{external_id:'test'}}}};}};},async rpc(name){
 if(name==='commit_statistics_projection'){committed=true;return {data:{stored:false,replay:false,generation:1}};}
 return committed?{error:{message:'private'}}:{data:{projection:null,chosen:null,last:null}};
 }};
 const report=await rebuildStatisticsProjection(db,{eventId:223728,scope:{provider:'bsd',externalTeamId:'4997',seasonId:'test',competitionId:'test'},mode:'--apply',now});
 assert.equal(report.projection_writes,1);assert.equal(report.observation_writes,0);assert.equal(report.verification.verified,false);assert.equal(report.verification.code,'STATS_PROJECTION_VERIFICATION_FAILED');
});
